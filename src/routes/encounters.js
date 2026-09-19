import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

/**
 * GET /api/encounters
 *
 * Backed by CONFIRMED real fields only: session_code, started_at,
 * duration_seconds, doctor_language, patient_language, translation_mode,
 * hospital_clinic_name (institution). department/specialty are included
 * as raw values so the frontend/team can decide which to display —
 * see the open question about whether specialty substitutes for department.
 *
 * Deliberately NOT included: patient_name. This prototype has no
 * authentication or role system yet, so there is no way to know whether
 * the caller is allowed to see identifiable data — the safe default with
 * no access control is to never return it, full stop. Wire this back in
 * only once real auth + role-based redaction exists (see requirements doc,
 * Section 4).
 *
 * Also excludes any session where phi_deleted_at is set — those records
 * are tombstoned and should surface as "erased," not appear in a normal list.
 *
 * Everything about "errors detected", "escalated", and "tokens used" is
 * left out entirely rather than faked — those data sources are still
 * unconfirmed (see requirements doc, Section 2).
 */
router.get("/encounters", async (req, res) => {
  const { institution, department, modality, providerLang, patientLang, page = 1, pageSize = 25 } = req.query;

  const conditions = ["s.phi_deleted_at IS NULL"];
  const values = [];

  if (institution) {
    values.push(institution);
    conditions.push(`dp.hospital_clinic_name = $${values.length}`);
  }
  if (department) {
    values.push(department);
    conditions.push(`dp.department = $${values.length}`);
  }
  if (modality) {
    values.push(modality); // expects 'one_way' or 'two_way' — real column values
    conditions.push(`s.translation_mode = $${values.length}`);
  }
  if (providerLang) {
    values.push(providerLang);
    conditions.push(`s.doctor_language = $${values.length}`);
  }
  if (patientLang) {
    values.push(patientLang);
    conditions.push(`s.patient_language = $${values.length}`);
  }

  const limit = Math.min(Number(pageSize) || 25, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT
      s.session_code,
      s.started_at,
      s.duration_seconds,
      s.doctor_language,
      s.patient_language,
      s.translation_mode,
      dp.hospital_clinic_name AS institution,
      dp.department,
      dp.specialty
    FROM sessions s
    JOIN doctor_profiles dp ON s.host_user_id = dp.user_id
    ${whereClause}
    ORDER BY s.started_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  try {
    const result = await pool.query(query, values);
    res.json({
      rows: result.rows,
      page: Number(page),
      pageSize: limit,
      note: "patient_name intentionally omitted — no auth/role system in this prototype yet",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Query failed", detail: err.message });
  }
});

export default router;
