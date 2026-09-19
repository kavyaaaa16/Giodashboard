import React, { useState, useEffect, useCallback } from "react";
import { Download, ChevronRight, ChevronDown, Lock, Radio, AlertTriangle, FileDown } from "lucide-react";
import { C } from "../theme.js";
import { INSTITUTIONS, DEPARTMENTS, PROVIDER_LANGUAGES, PATIENT_LANGUAGES, ENCOUNTERS, pseudonymize } from "../mockData.js";
import { Panel, Th, Td, tableStyle, btnGhost, btnPrimary, selectStyle, ModalityTag, CorrectedBadge, EscalatedBadge, fmtUSD } from "../components/ui.jsx";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

function normalizeModality(m) {
  return m === "one_way" ? "one-way" : "two-way";
}
function fmtDuration(seconds) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)} min`;
}
function fmtDate(iso) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}
const NA = () => <span style={{ color: C.inkFaint, fontSize: 12 }} title="Not available yet — no confirmed real data source">—</span>;

export default function EncountersScreen({ role, roleId, onOpenEncounter, onLogAudit }) {
  const [dataSource, setDataSource] = useState("mock"); // "mock" | "live"

  // --- Mock-mode filters (unchanged) ---
  const [institution, setInstitution] = useState("all");
  const [department, setDepartment] = useState("all");
  const [modality, setModality] = useState("all");
  const [providerLang, setProviderLang] = useState("all");
  const [patientLang, setPatientLang] = useState("all");
  const [escalatedFilter, setEscalatedFilter] = useState("all");

  // --- Live-mode state ---
  const [liveRows, setLiveRows] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState(null);
  const [liveTotal, setLiveTotal] = useState(0);
  const [liveOptions, setLiveOptions] = useState({ institutions: [], providerLangs: [], patientLangs: [] });
  const [liveInstitution, setLiveInstitution] = useState("all");
  const [liveModality, setLiveModality] = useState("all");
  const [liveProviderLang, setLiveProviderLang] = useState("all");
  const [livePatientLang, setLivePatientLang] = useState("all");

  // --- Real artifact download state ---
  // The token is only ever kept in React state (memory), never localStorage —
  // it disappears on refresh. This is a coarse shared-secret gate, NOT real
  // per-user authentication (see medlingo-backend's .env.example for why).
  const [elevatedToken, setElevatedToken] = useState("");
  const [openArtifactMenuFor, setOpenArtifactMenuFor] = useState(null);
  const [artifactCache, setArtifactCache] = useState({}); // sessionCode -> { loading, error, artifacts }

  // Every bulk view of the encounter list is logged once per visit — scrolling
  // past dozens of patient names is a bigger exposure than one encounter detail.
  useEffect(() => {
    onLogAudit({ action: "Viewed encounter list (bulk)", target: `mode=${dataSource}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource]);

  // Populate live filter dropdowns from the real backend once, on first switch to Live.
  useEffect(() => {
    if (dataSource !== "live") return;
    Promise.all([
      fetch(`${BACKEND_URL}/api/metrics/breakdowns?by=institution`).then(r => r.json()),
      fetch(`${BACKEND_URL}/api/metrics/breakdowns?by=providerLang`).then(r => r.json()),
      fetch(`${BACKEND_URL}/api/metrics/breakdowns?by=patientLang`).then(r => r.json()),
    ]).then(([inst, prov, pat]) => {
      setLiveOptions({
        institutions: inst.rows.map(r => r.label),
        providerLangs: prov.rows.map(r => r.label),
        patientLangs: pat.rows.map(r => r.label),
      });
    }).catch(() => { /* non-fatal — dropdowns just stay empty */ });
  }, [dataSource]);

  const fetchLive = useCallback(() => {
    setLiveLoading(true);
    setLiveError(null);
    const params = new URLSearchParams();
    if (liveInstitution !== "all") params.set("institution", liveInstitution);
    if (liveModality !== "all") params.set("modality", liveModality);
    if (liveProviderLang !== "all") params.set("providerLang", liveProviderLang);
    if (livePatientLang !== "all") params.set("patientLang", livePatientLang);
    params.set("page", "1");
    params.set("pageSize", "25");
    fetch(`${BACKEND_URL}/api/encounters?${params.toString()}`)
      .then(res => { if (!res.ok) throw new Error(`Backend returned HTTP ${res.status}`); return res.json(); })
      .then(json => { setLiveRows(json.rows); setLiveTotal(json.rows.length); })
      .catch(err => setLiveError(err.message))
      .finally(() => setLiveLoading(false));
  }, [liveInstitution, liveModality, liveProviderLang, livePatientLang]);

  useEffect(() => {
    if (dataSource === "live") fetchLive();
  }, [dataSource, fetchLive]);

  // ---------- Real artifact download (Live mode, elevated only) ----------
  const toggleArtifactMenu = (sessionCode) => {
    if (openArtifactMenuFor === sessionCode) { setOpenArtifactMenuFor(null); return; }
    setOpenArtifactMenuFor(sessionCode);
    onLogAudit({ action: "Viewed available files for encounter", target: sessionCode });
    setArtifactCache(prev => ({ ...prev, [sessionCode]: { loading: true, error: null, artifacts: null } }));
    fetch(`${BACKEND_URL}/api/encounters/${sessionCode}/artifacts`, {
      headers: { "x-elevated-token": elevatedToken },
    })
      .then(async res => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        return json;
      })
      .then(json => setArtifactCache(prev => ({ ...prev, [sessionCode]: { loading: false, error: null, artifacts: json.artifacts } })))
      .catch(err => setArtifactCache(prev => ({ ...prev, [sessionCode]: { loading: false, error: err.message, artifacts: null } })));
  };

  const downloadArtifact = (sessionCode, artifactType) => {
    fetch(`${BACKEND_URL}/api/encounters/${sessionCode}/artifacts/${artifactType}/download`, {
      headers: { "x-elevated-token": elevatedToken },
    })
      .then(async res => {
        if (!res.ok) { const json = await res.json().catch(() => ({})); throw new Error(json.error || `HTTP ${res.status}`); }
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${sessionCode}_${artifactType}`;
        a.click(); URL.revokeObjectURL(url);
        onLogAudit({ action: "Downloaded real artifact file", target: `${sessionCode}:${artifactType}` });
      })
      .catch(err => alert(`Download failed: ${err.message}`)); // eslint-disable-line no-alert
  };

  // ---------- MOCK MODE ----------
  const filtered = ENCOUNTERS.filter(e =>
    (institution === "all" || e.institution === institution) &&
    (department === "all" || e.department === department) &&
    (modality === "all" || e.modality === modality) &&
    (providerLang === "all" || e.providerLanguage === providerLang) &&
    (patientLang === "all" || e.patientLanguage === patientLang) &&
    (escalatedFilter === "all" || (escalatedFilter === "escalated" ? e.escalated : !e.escalated))
  );

  const exportCols = role.elevated
    ? ["id", "date", "institution", "department", "clinician", "patientName", "providerLanguage", "patientLanguage", "modality", "durationMin", "tokensUsed", "costUsd", "escalated", "errorsDetected", "corrected"]
    : ["id", "date", "institution", "department", "clinician", "providerLanguage", "patientLanguage", "modality", "durationMin", "tokensUsed", "costUsd", "escalated", "errorsDetected", "corrected"];

  function downloadCSV(rows, cols, filename) {
    const header = cols.join(",");
    const lines = rows.map(e => cols.map(c => `"${e[c] ?? ""}"`).join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    a.click(); URL.revokeObjectURL(url);
  }

  const handleExportMock = () => {
    downloadCSV(filtered, exportCols, `encounters_export_${role.elevated ? "full" : "deidentified"}.csv`);
    onLogAudit({ action: `Exported encounter list (${role.elevated ? "full" : "de-identified"}, role-scoped)`, target: `${filtered.length} rows` });
  };
  const handleExportOneMock = (e) => {
    downloadCSV([e], exportCols, `${e.id}_${role.elevated ? "full" : "deidentified"}.csv`);
    onLogAudit({ action: `Exported single encounter (${role.elevated ? "full" : "de-identified"}, role-scoped)`, target: e.id });
  };

  // ---------- LIVE MODE metadata export (unchanged from before) ----------
  const liveExportCols = ["session_code", "started_at", "institution", "specialty", "doctor_language", "patient_language", "translation_mode", "duration_seconds"];
  const handleExportLive = () => {
    downloadCSV(liveRows, liveExportCols, "encounters_export_live_real_fields_only.csv");
    onLogAudit({ action: "Exported encounter list (live, real fields only)", target: `${liveRows.length} rows` });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setDataSource("mock")}
          style={{ ...btnGhost, background: dataSource === "mock" ? C.navy : "none", color: dataSource === "mock" ? "#fff" : C.ink, border: dataSource === "mock" ? "none" : `1px solid ${C.border}` }}
        >Mock data</button>
        <button
          onClick={() => setDataSource("live")}
          style={{ ...btnGhost, background: dataSource === "live" ? C.navy : "none", color: dataSource === "live" ? "#fff" : C.ink, border: dataSource === "live" ? "none" : `1px solid ${C.border}` }}
        ><Radio size={13} /> Live (local backend)</button>
      </div>

      {dataSource === "live" && (
        <div style={{
          background: C.mediumSoft, border: "1px solid #E9DCB0", borderRadius: 8, padding: "12px 16px",
          fontSize: 12.5, color: "#6B551A", display: "flex", flexDirection: "column", gap: 10
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Real data from your local backend (institution, specialty, language, modality, duration). Errors, tokens,
              cost, escalation, and clinician identity show "—" — no confirmed real source exists for those yet, so
              they're not faked here. Patient name is never shown in this mode (no auth layer exists to gate it).
              Requires <code>medlingo-backend</code> running on <code>localhost:4000</code>.
            </span>
          </div>
          {role.elevated && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Elevated access token (for real file downloads):</span>
              <input
                type="password"
                value={elevatedToken}
                onChange={e => setElevatedToken(e.target.value)}
                placeholder="paste ELEVATED_ACCESS_TOKEN from backend .env"
                style={{ padding: "5px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 12, minWidth: 260 }}
              />
              <span style={{ fontSize: 11, color: "#6B551A" }}>Kept in memory only — never saved, cleared on refresh.</span>
            </div>
          )}
        </div>
      )}

      {dataSource === "mock" ? (
        <Panel title="Encounters" subtitle="Per-encounter record — filter by institution, department, or device modality" right={
          <button style={btnPrimary} onClick={handleExportMock}><Download size={14} /> Export ({role.elevated ? "full" : "de-identified"})</button>
        }>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <select value={institution} onChange={e => setInstitution(e.target.value)} style={selectStyle}>
              <option value="all">All institutions</option>
              {INSTITUTIONS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <select value={department} onChange={e => setDepartment(e.target.value)} style={selectStyle}>
              <option value="all">All departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={modality} onChange={e => setModality(e.target.value)} style={selectStyle}>
              <option value="all">Both modalities</option>
              <option value="one-way">One-way</option>
              <option value="two-way">Two-way</option>
            </select>
            <select value={providerLang} onChange={e => setProviderLang(e.target.value)} style={selectStyle}>
              <option value="all">All provider languages</option>
              {PROVIDER_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={patientLang} onChange={e => setPatientLang(e.target.value)} style={selectStyle}>
              <option value="all">All patient languages</option>
              {PATIENT_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={escalatedFilter} onChange={e => setEscalatedFilter(e.target.value)} style={selectStyle}>
              <option value="all">Escalated or not</option>
              <option value="escalated">Escalated only</option>
              <option value="not">Not escalated</option>
            </select>
            <span style={{ fontSize: 12, color: C.inkFaint, alignSelf: "center", marginLeft: "auto" }}>{filtered.length} encounters</span>
          </div>

          {!role.elevated && (
            <div style={{ fontSize: 11.5, color: C.inkFaint, display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
              <Lock size={12} /> Patient identity is hidden for your role — showing de-identified rows
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <Th>Encounter</Th><Th>Date</Th><Th>Institution</Th><Th>Department</Th>
                  <Th>Clinician</Th><Th>Patient</Th><Th>Provider lang.</Th><Th>Patient lang.</Th><Th>Modality</Th>
                  <Th>Duration</Th><Th>Tokens</Th><Th>Cost</Th><Th>Escalated</Th><Th>Errors</Th><Th>Corrected</Th><Th />
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 25).map(e => (
                  <tr key={e.id}>
                    <Td mono>{e.id}</Td>
                    <Td>{e.date}</Td>
                    <Td style={{ fontSize: 12 }}>{e.institution}</Td>
                    <Td style={{ fontSize: 12 }}>{e.department}</Td>
                    <Td style={{ fontSize: 12 }}>{e.clinician}</Td>
                    <Td style={{ fontSize: 12, color: role.elevated ? C.ink : C.suppressed }}>
                      {role.elevated ? e.patientName : pseudonymize(e.id)}
                    </Td>
                    <Td mono style={{ fontSize: 11.5 }}>{e.providerLanguage}</Td>
                    <Td mono style={{ fontSize: 11.5 }}>{e.patientLanguage}</Td>
                    <Td><ModalityTag modality={e.modality} /></Td>
                    <Td mono>{e.durationMin} min</Td>
                    <Td mono>{e.tokensUsed.toLocaleString()}</Td>
                    <Td mono>{fmtUSD(e.costUsd)}</Td>
                    <Td><EscalatedBadge escalated={e.escalated} /></Td>
                    <Td mono style={{ color: e.errorsDetected > 3 ? C.critical : e.errorsDetected > 0 ? C.medium : C.inkFaint }}>{e.errorsDetected}</Td>
                    <Td><CorrectedBadge corrected={e.corrected} /></Td>
                    <Td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {role.elevated ? (
                          <button style={btnGhost} onClick={() => onOpenEncounter(e.id)}>Open <ChevronRight size={13} /></button>
                        ) : (
                          <span style={{ fontSize: 11, color: C.inkFaint, display: "flex", alignItems: "center", gap: 4 }}><Lock size={11} /> restricted</span>
                        )}
                        <button style={{ ...btnGhost, padding: 6 }} title="Download this encounter" onClick={() => handleExportOneMock(e)}>
                          <Download size={13} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 25 && (
              <div style={{ fontSize: 12, color: C.inkFaint, textAlign: "center", padding: "10px 0" }}>
                Showing 25 of {filtered.length} — refine filters or export the full set.
              </div>
            )}
          </div>
        </Panel>
      ) : (
        <Panel title="Encounters — live" subtitle="Real rows from medlingodb, via your local backend" right={
          <button style={btnPrimary} onClick={handleExportLive}><Download size={14} /> Export (real fields only)</button>
        }>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <select value={liveInstitution} onChange={e => setLiveInstitution(e.target.value)} style={selectStyle}>
              <option value="all">All institutions</option>
              {liveOptions.institutions.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <select value={liveModality} onChange={e => setLiveModality(e.target.value)} style={selectStyle}>
              <option value="all">Both modalities</option>
              <option value="one_way">One-way</option>
              <option value="two_way">Two-way</option>
            </select>
            <select value={liveProviderLang} onChange={e => setLiveProviderLang(e.target.value)} style={selectStyle}>
              <option value="all">All provider languages</option>
              {liveOptions.providerLangs.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select value={livePatientLang} onChange={e => setLivePatientLang(e.target.value)} style={selectStyle}>
              <option value="all">All patient languages</option>
              {liveOptions.patientLangs.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <span style={{ fontSize: 11.5, color: C.inkFaint, alignSelf: "center" }}>
              (Department & escalation filters unavailable — not real data yet)
            </span>
            <span style={{ fontSize: 12, color: C.inkFaint, alignSelf: "center", marginLeft: "auto" }}>{liveTotal} encounters shown</span>
          </div>

          {liveLoading && <div style={{ padding: "24px 0", textAlign: "center", color: C.inkFaint, fontSize: 13 }}>Loading real data…</div>}

          {liveError && (
            <div style={{ padding: "16px", background: C.criticalSoft, color: C.critical, borderRadius: 8, fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
              <strong>Couldn't reach the local backend.</strong>
              <span>{liveError}</span>
              <span style={{ fontSize: 12 }}>Make sure <code>npm run dev</code> is running in <code>medlingo-backend</code>, and that it's reachable at {BACKEND_URL}.</span>
              <button style={{ ...btnGhost, alignSelf: "flex-start", marginTop: 4 }} onClick={fetchLive}>Retry</button>
            </div>
          )}

          {!liveLoading && !liveError && (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>Encounter</Th><Th>Date</Th><Th>Institution</Th><Th>Specialty</Th>
                    <Th>Clinician</Th><Th>Patient</Th><Th>Provider lang.</Th><Th>Patient lang.</Th><Th>Modality</Th>
                    <Th>Duration</Th><Th>Tokens</Th><Th>Cost</Th><Th>Escalated</Th><Th>Errors</Th><Th>Corrected</Th><Th>Files</Th>
                  </tr>
                </thead>
                <tbody>
                  {liveRows.map(r => {
                    const cacheEntry = artifactCache[r.session_code];
                    const menuOpen = openArtifactMenuFor === r.session_code;
                    return (
                      <tr key={r.session_code}>
                        <Td mono>{r.session_code}</Td>
                        <Td>{fmtDate(r.started_at)}</Td>
                        <Td style={{ fontSize: 12 }}>{r.institution || <NA />}</Td>
                        <Td style={{ fontSize: 12 }}>{r.specialty || <NA />}</Td>
                        <Td style={{ fontSize: 12 }}><NA /></Td>
                        <Td style={{ fontSize: 12 }}>{pseudonymize(r.session_code)}</Td>
                        <Td mono style={{ fontSize: 11.5 }}>{r.doctor_language || <NA />}</Td>
                        <Td mono style={{ fontSize: 11.5 }}>{r.patient_language || <NA />}</Td>
                        <Td>{r.translation_mode ? <ModalityTag modality={normalizeModality(r.translation_mode)} /> : <NA />}</Td>
                        <Td mono>{fmtDuration(r.duration_seconds)}</Td>
                        <Td><NA /></Td>
                        <Td><NA /></Td>
                        <Td><NA /></Td>
                        <Td><NA /></Td>
                        <Td><NA /></Td>
                        <Td style={{ position: "relative" }}>
                          {!role.elevated ? (
                            <span style={{ fontSize: 11, color: C.inkFaint, display: "flex", alignItems: "center", gap: 4 }}>
                              <Lock size={11} /> restricted
                            </span>
                          ) : (
                            <>
                              <button style={btnGhost} onClick={() => toggleArtifactMenu(r.session_code)}>
                                <FileDown size={13} /> Files <ChevronDown size={12} />
                              </button>
                              {menuOpen && (
                                <div style={{
                                  position: "absolute", right: 0, top: "110%", zIndex: 30, background: C.panel,
                                  border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: "0 6px 20px rgba(14,23,38,0.18)",
                                  padding: 8, minWidth: 240
                                }}>
                                  {!elevatedToken && (
                                    <div style={{ fontSize: 11.5, color: C.critical, marginBottom: 6 }}>
                                      Enter the elevated access token above first.
                                    </div>
                                  )}
                                  {cacheEntry?.loading && <div style={{ fontSize: 12, color: C.inkFaint, padding: "4px 6px" }}>Loading…</div>}
                                  {cacheEntry?.error && <div style={{ fontSize: 12, color: C.critical, padding: "4px 6px" }}>{cacheEntry.error}</div>}
                                  {cacheEntry?.artifacts?.length === 0 && (
                                    <div style={{ fontSize: 12, color: C.inkFaint, padding: "4px 6px" }}>No stored artifacts found for this encounter.</div>
                                  )}
                                  {cacheEntry?.artifacts?.map(a => (
                                    <button
                                      key={a.artifact_type}
                                      onClick={() => downloadArtifact(r.session_code, a.artifact_type)}
                                      style={{
                                        display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                                        background: "none", border: "none", padding: "6px 6px", borderRadius: 6, cursor: "pointer",
                                        fontSize: 12.5, fontFamily: "IBM Plex Sans, sans-serif", textAlign: "left"
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.background = "#F5F6FA"}
                                      onMouseLeave={e => e.currentTarget.style.background = "none"}
                                    >
                                      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11.5 }}>{a.artifact_type}</span>
                                      <Download size={12} style={{ flexShrink: 0, marginLeft: 8, color: C.inkFaint }} />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                  {liveRows.length === 0 && (
                    <tr><td colSpan={16} style={{ textAlign: "center", color: C.inkFaint, padding: "24px 0", borderBottom: `1px solid ${C.border}` }}>No encounters match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
