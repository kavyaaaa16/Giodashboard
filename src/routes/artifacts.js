import { Router } from "express";
import { pool } from "../db.js";
import { getBlobServiceClient } from "../blobStorage.js";

const router = Router();

/**
 * Coarse access gate. This is NOT real authentication or authorization —
 * there is no concept of "who is this person" anywhere in this prototype.
 * It only checks "does the caller know a shared secret." That's the most
 * this backend can honestly enforce until real auth exists. Every route
 * that touches actual clinical file content uses this — encounter metadata
 * (institution, language, etc.) does not, since it's a smaller exposure.
 */
function requireElevatedToken(req, res, next) {
  const expected = process.env.ELEVATED_ACCESS_TOKEN;
  if (!expected) {
    return res.status(500).json({ error: "Server is not configured for artifact access (ELEVATED_ACCESS_TOKEN not set)." });
  }
  const provided = req.get("x-elevated-token");
  if (provided !== expected) {
    return res.status(403).json({ error: "Missing or invalid elevated access token." });
  }
  next();
}

// Minimal, honest stand-in for real audit logging until a real PHI-access
// event type exists in `audit_logs` (see requirements doc, Section 2).
// This at least puts a record in the backend's own server logs.
function logArtifactAccess(action, sessionCode, detail) {
  console.log(`[ARTIFACT ACCESS] ${new Date().toISOString()} action=${action} session=${sessionCode} ${detail || ""}`);
}

/**
 * GET /api/encounters/:sessionCode/artifacts
 * Lists which real files exist for this encounter — not their content,
 * just what's available (type, when created, size). Requires the token
 * because even knowing *what kinds* of documents exist for a specific
 * patient's encounter is more sensitive than aggregate metrics.
 */
router.get("/encounters/:sessionCode/artifacts", requireElevatedToken, async (req, res) => {
  const { sessionCode } = req.params;
  logArtifactAccess("list", sessionCode);
  try {
    const result = await pool.query(
      `SELECT sa.artifact_type, sa.created_at, sa.size_bytes, sa.content_format, sa.version
       FROM session_artifacts sa
       JOIN sessions s ON sa.session_id = s.id
       WHERE s.session_code = $1 AND sa.status = 'stored' AND s.phi_deleted_at IS NULL
       ORDER BY sa.artifact_type, sa.version DESC`,
      [sessionCode]
    );
    res.json({ sessionCode, artifacts: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Query failed", detail: err.message });
  }
});

/**
 * GET /api/encounters/:sessionCode/artifacts/:artifactType/download
 * Streams the actual file content from Blob Storage. This is the highest-
 * sensitivity endpoint in this whole backend — it returns real clinical
 * text (a transcript, a SOAP note, a translation). Requires the token,
 * and every call is logged before the file is returned.
 */
router.get("/encounters/:sessionCode/artifacts/:artifactType/download", requireElevatedToken, async (req, res) => {
  const { sessionCode, artifactType } = req.params;
  try {
    const result = await pool.query(
      `SELECT sa.container, sa.blob_path, sa.content_format
       FROM session_artifacts sa
       JOIN sessions s ON sa.session_id = s.id
       WHERE s.session_code = $1 AND sa.artifact_type = $2 AND sa.status = 'stored' AND s.phi_deleted_at IS NULL
       ORDER BY sa.version DESC
       LIMIT 1`,
      [sessionCode, artifactType]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No stored artifact of that type found for this encounter." });
    }
    const { container, blob_path, content_format } = result.rows[0];

    logArtifactAccess("download", sessionCode, `type=${artifactType} container=${container} path=${blob_path}`);

    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(container);
    const blobClient = containerClient.getBlobClient(blob_path);
    const downloadResponse = await blobClient.download();

    res.setHeader("Content-Type", content_format || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${sessionCode}_${artifactType}"`);
    downloadResponse.readableStreamBody.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Download failed", detail: err.message });
  }
});

export default router;
