import { Router } from "express";
import { pool, SUPPRESSION_MIN } from "../db.js";

const router = Router();

// Maps a safe, whitelisted "by" query param to the real column to group by.
// Whitelisting like this (rather than interpolating req.query.by directly
// into SQL) is what prevents SQL injection through this parameter.
const GROUP_BY_COLUMNS = {
  institution: "dp.hospital_clinic_name",
  department: "dp.department",
  specialty: "dp.specialty",
  providerLang: "s.doctor_language",
  patientLang: "s.patient_language",
  modality: "s.translation_mode",
};

/**
 * GET /api/metrics/breakdowns?by=institution|department|specialty|providerLang|patientLang|modality
 *
 * Suppression happens HERE, server-side — not left to the frontend to hide
 * small buckets. A client that bypassed the dashboard UI and called this
 * endpoint directly should still never see a bucket under SUPPRESSION_MIN.
 *
 * Note: as of today's schema check, `department` is a column that exists
 * but isn't populated by the real sign-up flow — this endpoint will work
 * correctly against it, but expect an empty/near-empty result until that's
 * resolved (see requirements doc, Section 1).
 */
router.get("/metrics/breakdowns", async (req, res) => {
  const { by } = req.query;
  const column = GROUP_BY_COLUMNS[by];

  if (!column) {
    return res.status(400).json({
      error: `Invalid 'by' value. Expected one of: ${Object.keys(GROUP_BY_COLUMNS).join(", ")}`,
    });
  }

  const query = `
    SELECT ${column} AS label, COUNT(*) AS n
    FROM sessions s
    JOIN doctor_profiles dp ON s.host_user_id = dp.user_id
    WHERE s.phi_deleted_at IS NULL AND ${column} IS NOT NULL
    GROUP BY ${column}
    ORDER BY n DESC
  `;

  try {
    const result = await pool.query(query);
    const shown = result.rows.filter(r => Number(r.n) >= SUPPRESSION_MIN);
    const hiddenCount = result.rows.length - shown.length;
    res.json({
      rows: shown.map(r => ({ label: r.label, n: Number(r.n) })),
      hiddenCount,
      suppressionThreshold: SUPPRESSION_MIN,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Query failed", detail: err.message });
  }
});

/**
 * GET /api/metrics/overview
 *
 * Only includes what Postgres can actually answer: encounter counts,
 * average duration, modality split. Latency percentiles and availability
 * are NOT included here — that's almost certainly Application Insights /
 * Log Analytics data, not Postgres data, and hasn't been investigated yet
 * (see requirements doc, Section 3, Reliability screen note).
 */
router.get("/metrics/overview", async (req, res) => {
  const query = `
    SELECT
      COUNT(*) AS total_encounters,
      AVG(duration_seconds) AS avg_duration_seconds,
      COUNT(*) FILTER (WHERE translation_mode = 'one_way') AS one_way_count,
      COUNT(*) FILTER (WHERE translation_mode = 'two_way') AS two_way_count
    FROM sessions
    WHERE phi_deleted_at IS NULL
  `;
  try {
    const result = await pool.query(query);
    const row = result.rows[0];
    res.json({
      totalEncounters: Number(row.total_encounters),
      avgDurationSeconds: row.avg_duration_seconds ? Number(row.avg_duration_seconds) : null,
      oneWayCount: Number(row.one_way_count),
      twoWayCount: Number(row.two_way_count),
      note: "Latency, availability, error rate not included — likely live in Application Insights / Log Analytics, not yet investigated.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Query failed", detail: err.message });
  }
});

export default router;
