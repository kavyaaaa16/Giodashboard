import React, { useState } from "react";
import { AlertTriangle, Database } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import { C } from "../theme.js";
import { API_NAMES, API_CALL_RECORDS, dateAt } from "../mockData.js";
import { Panel, Tile, Th, Td, tableStyle, btnGhost, selectStyle, MatchStatusBadge, fmtPct } from "../components/ui.jsx";

function fmtTimestamp(iso) {
  return iso.replace("T", " ").replace("Z", "");
}

export default function ApiUsageScreen({ periodDays, onLogAudit }) {
  const [apiFilter, setApiFilter] = useState("all");

  React.useEffect(() => {
    onLogAudit({ action: "Viewed API usage records", target: `filter=${apiFilter}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFilter]);

  const cutoffDate = dateAt(periodDays - 1);
  const scoped = API_CALL_RECORDS.filter(r => r.timestamp >= cutoffDate);

  const counts = API_NAMES.map(name => ({
    label: name,
    n: scoped.filter(r => r.api === name).length,
  }));
  const total = scoped.length;

  const filtered = apiFilter === "all" ? scoped : scoped.filter(r => r.api === apiFilter);
  const matchRate = filtered.length ? (filtered.filter(r => r.status === "matched").length / filtered.length) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{
        background: C.criticalSoft, border: "1px solid #EBC9C6", borderRadius: 8, padding: "12px 16px",
        fontSize: 13, color: C.critical, display: "flex", gap: 8, alignItems: "flex-start"
      }}>
        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          <strong>No real data source exists for this screen.</strong> RxNorm / SNOMED / LOINC terminology lookups
          are not tracked anywhere confirmed in the real system — the candidate table (<code>glossary_terms</code>)
          exists but has zero rows. Every number and record below is illustrative mock data, not measured activity.
        </span>
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        <Tile icon={Database} label="Total lookups (period)" value={total.toLocaleString()} />
        {counts.map(c => (
          <Tile key={c.label} icon={Database} label={`${c.label} lookups`}
            value={total ? fmtPct((c.n / total) * 100, 0) : "—"}
            sampled n={c.n} />
        ))}
      </div>

      <Panel title="Lookups by vocabulary" subtitle="Count of terminology lookups, current period">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={counts} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid horizontal={false} stroke={C.border} />
            <XAxis type="number" tick={{ fontSize: 11, fill: C.inkFaint, fontFamily: "IBM Plex Mono, monospace" }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 12, fill: C.inkSub, fontFamily: "IBM Plex Mono, monospace" }} axisLine={{ stroke: C.border }} tickLine={false} />
            <RTooltip contentStyle={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", borderRadius: 6 }} />
            <Bar dataKey="n" fill={C.medium} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Lookup records" subtitle="Individual terminology lookup calls" right={
        <select value={apiFilter} onChange={e => setApiFilter(e.target.value)} style={selectStyle}>
          <option value="all">All APIs</option>
          {API_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      }>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: C.inkFaint }}>{filtered.length} records</span>
          <span style={{ fontSize: 12, color: C.inkFaint }}>Match rate: {fmtPct(matchRate, 1)}</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Lookup ID</Th><Th>Timestamp</Th><Th>Encounter</Th><Th>API</Th><Th>Term looked up</Th><Th>Status</Th><Th>Latency</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 25).map(r => (
                <tr key={r.id}>
                  <Td mono style={{ fontSize: 11.5 }}>{r.id}</Td>
                  <Td mono style={{ fontSize: 11.5 }}>{fmtTimestamp(r.timestamp)}</Td>
                  <Td mono style={{ fontSize: 11.5 }}>{r.encounterId}</Td>
                  <Td style={{ fontSize: 12 }}>{r.api}</Td>
                  <Td style={{ fontSize: 12 }}>{r.term}</Td>
                  <Td><MatchStatusBadge status={r.status} /></Td>
                  <Td mono>{r.latencyMs} ms</Td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 25 && (
            <div style={{ fontSize: 12, color: C.inkFaint, textAlign: "center", padding: "10px 0" }}>
              Showing 25 of {filtered.length} — refine the filter to see more.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
