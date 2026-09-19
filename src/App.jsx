import React, { useState, useCallback } from "react";
import { Lock, Settings } from "lucide-react";
import { C, FONT_IMPORT } from "./theme.js";
import { SERIES, SERIES_BY_INSTITUTION, DAYS, windowSlice, ROLES, NAV, ALERTS, INSTITUTIONS } from "./mockData.js";
import { selectStyle } from "./components/ui.jsx";
import OverviewScreen from "./screens/OverviewScreen.jsx";
import EncountersScreen from "./screens/EncountersScreen.jsx";
import ApiUsageScreen from "./screens/ApiUsageScreen.jsx";
import EscalationScreen from "./screens/EscalationScreen.jsx";
import ReliabilityScreen from "./screens/ReliabilityScreen.jsx";
import GovernanceScreen from "./screens/GovernanceScreen.jsx";
import EncounterDetailModal from "./components/EncounterDetailModal.jsx";

/* ============================================================
   APP SHELL
   Holds all shared state (role, institution scope, period, audit
   log, alerts) and routes between screens.

   Institution scoping: every role except "engineering" (MedLingo's
   own platform team) is hard-locked to one institution — there is
   no control that lets them pick another one. This is a UI-level
   simulation of "each institution only sees theirs"; the real
   boundary has to be enforced server-side once there's a backend,
   this alone is not a security guarantee.
   ============================================================ */
export default function App() {
  const [roleId, setRoleId] = useState("safety");
  const [view, setView] = useState("overview");
  const [periodDays, setPeriodDays] = useState(30);
  const [selectedInstitution, setSelectedInstitution] = useState("all"); // only used when role.institutionId === "all"
  const [openEncounter, setOpenEncounter] = useState(null);
  const [alerts, setAlerts] = useState(ALERTS);
  const [auditLog, setAuditLog] = useState([
    { at: "2026-09-08T07:02:11.000Z", actor: "j.alvarez@kec-health.org", action: "Viewed encounter detail", target: "ENC-88044" },
    { at: "2026-09-08T06:45:02.000Z", actor: "system", action: "Scheduled export delivered", target: "compliance.language-access-q3.csv" },
    { at: "2026-09-07T22:10:44.000Z", actor: "m.chen@kec-health.org", action: "Viewed encounter detail", target: "ENC-87991" },
  ]);

  const role = ROLES.find(r => r.id === roleId);
  React.useEffect(() => { setView(role.home); }, [roleId]);

  // Institution is a free filter for now (not locked to a role) — see mockData.js note.
  const effectiveInstitution = selectedInstitution;
  const activeSeries = effectiveInstitution === "all" ? SERIES : SERIES_BY_INSTITUTION[effectiveInstitution];

  const data = windowSlice(periodDays, activeSeries);
  const prevData = periodDays * 2 <= DAYS
    ? activeSeries.slice(activeSeries.length - periodDays * 2, activeSeries.length - periodDays)
    : data;

  const handleNavigate = useCallback((v) => setView(v), []);
  const handleAcknowledge = useCallback((id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "acknowledged" } : a));
    setAuditLog(prev => [...prev, {
      at: new Date().toISOString(), actor: `${roleId}@kec-health.org`, action: "Acknowledged alert", target: id
    }]);
  }, [roleId]);
  const handleOpenEncounter = useCallback((id) => setOpenEncounter(id), []);
  const handleEncounterSeen = useCallback((id) => {
    setAuditLog(prev => [...prev, {
      at: new Date().toISOString(), actor: `${roleId}@kec-health.org`, action: "Viewed encounter detail", target: id
    }]);
  }, [roleId]);
  const handleLogAudit = useCallback(({ action, target }) => {
    setAuditLog(prev => [...prev, { at: new Date().toISOString(), actor: `${roleId}@kec-health.org`, action, target }]);
  }, [roleId]);

  const freshnessSeconds = 94;

  return (
    <div style={{ fontFamily: "IBM Plex Sans, sans-serif", background: C.bg, minHeight: "100vh", color: C.ink, display: "flex" }}>
      <style>{FONT_IMPORT}{`* { box-sizing: border-box; } button:hover { filter: brightness(0.97); } table tr:hover td { background: #FAFBFC; }`}</style>

      {/* Sidebar */}
      <div style={{ width: 232, background: C.navy, flexShrink: 0, display: "flex", flexDirection: "column", padding: "20px 0" }}>
        <div style={{ padding: "0 20px 20px", borderBottom: `1px solid ${C.navyLighter}`, marginBottom: 12 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: 0.2 }}>MedLingo</div>
          <div style={{ color: "#8291AA", fontSize: 11.5, marginTop: 2 }}>Monitoring & Governance</div>
          <div style={{ marginTop: 8, display: "inline-block", fontSize: 10, fontWeight: 600, letterSpacing: 0.4, color: C.accent, background: "rgba(18,216,253,0.16)", padding: "2px 7px", borderRadius: 4 }}>PHASE 1 — PILOT SCOPE</div>
        </div>
        {NAV.map(n => {
          const Icon = n.icon;
          const active = view === n.id;
          return (
            <div key={n.id} onClick={() => setView(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 20px", cursor: "pointer",
              color: active ? "#fff" : "#A9B4C6", background: active ? C.navyLighter : "transparent",
              borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent", fontSize: 13.5, fontWeight: active ? 600 : 400,
            }}>
              <Icon size={15} strokeWidth={2} />{n.label}
            </div>
          );
        })}
        <div style={{ marginTop: "auto", padding: "16px 20px 0" }}>
          <div style={{ borderTop: `1px solid ${C.navyLighter}`, paddingTop: 14, display: "flex", alignItems: "center", gap: 8, color: "#8291AA", fontSize: 11.5 }}>
            <Settings size={13} /> Tenant: KEC Health System
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          background: C.panel, borderBottom: `1px solid ${C.border}`, padding: "12px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <select value={roleId} onChange={e => setRoleId(e.target.value)} style={selectStyle}>
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <select value={periodDays} onChange={e => setPeriodDays(Number(e.target.value))} style={selectStyle}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>

            <select value={selectedInstitution} onChange={e => setSelectedInstitution(e.target.value)} style={selectStyle}>
              <option value="all">All institutions</option>
              {INSTITUTIONS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 11.5, color: C.inkFaint, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: C.good, display: "inline-block" }} />
              Operational data as of {freshnessSeconds}s ago
            </div>
            {role.elevated ? (
              <span style={{ fontSize: 11.5, color: C.accentText, display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                <Lock size={12} /> Elevated access enabled
              </span>
            ) : (
              <span style={{ fontSize: 11.5, color: C.inkFaint, display: "flex", alignItems: "center", gap: 4 }}>
                <Lock size={12} /> Aggregate-only role
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: 28, maxWidth: 1240 }}>
          {view === "overview" && (
            <OverviewScreen role={role} data={data} prev={prevData} onNavigate={handleNavigate}
              institutionScope={effectiveInstitution} periodDays={periodDays} />
          )}
          {view === "encounters" && (
            <EncountersScreen role={role} roleId={roleId} onOpenEncounter={handleOpenEncounter} onLogAudit={handleLogAudit} />
          )}
          {view === "apis" && <ApiUsageScreen periodDays={periodDays} onLogAudit={handleLogAudit} />}
          {view === "escalation" && <EscalationScreen data={data} role={role} onOpenEncounter={handleOpenEncounter} />}
          {view === "reliability" && <ReliabilityScreen data={data} allSeries={activeSeries} />}
          {view === "governance" && <GovernanceScreen auditLog={auditLog} alerts={alerts} onAcknowledge={handleAcknowledge} allSeries={activeSeries} />}
        </div>
      </div>

      {openEncounter && (
        <EncounterDetailModal id={openEncounter} onClose={() => setOpenEncounter(null)} onSeen={handleEncounterSeen} />
      )}
    </div>
  );
}
