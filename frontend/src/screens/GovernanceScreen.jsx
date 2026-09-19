import React from "react";
import { FileSearch, Lock, AlertTriangle, Download } from "lucide-react";
import { avg, windowSlice } from "../mockData.js";
import { Tile, Panel, Th, Td, tableStyle, SeverityBadge, btnGhost, btnPrimary, fmtPct } from "../components/ui.jsx";
import { C } from "../theme.js";

export default function GovernanceScreen({ auditLog, alerts, onAcknowledge, allSeries }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <Tile icon={FileSearch} label="Audit trail completeness" value={fmtPct(avg(windowSlice(30, allSeries), "auditComplete"), 2)} version={9}
          formula="encounters with a complete, retrievable record / total encounters" />
        <Tile icon={Lock} label="Access events to identifiable data (period)" value={auditLog.length} />
        <Tile icon={AlertTriangle} label="Open alerts" value={alerts.filter(a => a.status === "open").length} />
      </div>

      <Panel title="Alerts" subtitle="Routed per the agreed severity table (Section 4)">
        <table style={tableStyle}>
          <thead><tr><Th>Condition</Th><Th>Severity</Th><Th>Routed to</Th><Th>Status</Th><Th /></tr></thead>
          <tbody>
            {alerts.map(a => (
              <tr key={a.id}>
                <Td style={{ maxWidth: 340 }}>{a.condition}</Td>
                <Td><SeverityBadge severity={a.severity} /></Td>
                <Td style={{ fontSize: 12.5 }}>{a.routedTo}</Td>
                <Td>
                  <span style={{ fontSize: 12, color: a.status === "open" ? C.critical : C.inkFaint, fontWeight: a.status === "open" ? 600 : 400 }}>
                    {a.status}
                  </span>
                </Td>
                <Td>
                  {a.status === "open" && (
                    <button style={btnGhost} onClick={() => onAcknowledge(a.id)}>Acknowledge</button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Access log" subtitle="Every view of identifiable data emits audit.access before the data is returned">
        <table style={tableStyle}>
          <thead><tr><Th>Timestamp</Th><Th>Actor</Th><Th>Action</Th><Th>Target</Th></tr></thead>
          <tbody>
            {auditLog.slice().reverse().map((e, i) => (
              <tr key={i}>
                <Td mono style={{ fontSize: 11.5 }}>{e.at}</Td>
                <Td mono>{e.actor}</Td>
                <Td>{e.action}</Td>
                <Td mono>{e.target}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Export" subtitle="Any table or chart can be exported with the active filters applied — the export itself is logged">
        <button style={btnPrimary}><Download size={14} /> Export current view (CSV)</button>
      </Panel>
    </div>
  );
}
