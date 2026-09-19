import React from "react";
import { Radio, Check, Users2, Clock, ChevronRight, Lock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from "recharts";
import { C } from "../theme.js";
import { sum, rand } from "../mockData.js";
import { Tile, Panel, Th, Td, tableStyle, btnGhost, chartCommon, fmtPct, fmtMs } from "../components/ui.jsx";

export default function EscalationScreen({ data, onOpenEncounter, role }) {
  const triggered = sum(data, "escTriggered");
  const joined = sum(data, "escJoined");
  const abandoned = sum(data, "escAbandoned");
  const completion = triggered ? (joined / triggered) * 100 : 0;
  const confPct = triggered ? (sum(data, "escConfidence") / triggered) * 100 : 0;

  const chartData = data.map(d => ({ date: d.date, confidence: d.escConfidence, policy: d.escPolicy }));
  const recentAbandoned = [
    { id: "ENC-88213", date: "2026-09-08", waitMs: 41200, dept: "Emergency" },
    { id: "ENC-88190", date: "2026-09-07", waitMs: 38900, dept: "Ambulatory" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <Tile icon={Radio} label="Escalations triggered" value={triggered.toLocaleString()} />
        <Tile icon={Check} label="Escalation completion rate" value={fmtPct(completion)} version={7}
          formula="escalations successfully served / (served + abandoned)" />
        <Tile icon={Users2} label="Confidence-triggered share" value={fmtPct(confPct)} />
        <Tile icon={Clock} label="Escalation wait (p95)" value={fmtMs(1900 + (rand() * 400))} version={5}
          formula="percentile(escalation.joined.wait_ms, 95) — abandoned escalations excluded, counted separately" />
      </div>

      <Panel title="Escalation triggers" subtitle="Confidence-based vs. policy-based, daily">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} stroke={C.border} />
            <XAxis dataKey="date" {...chartCommon()} minTickGap={40} />
            <YAxis {...chartCommon()} width={36} />
            <RTooltip contentStyle={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", borderRadius: 6 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="confidence" stackId="a" name="Confidence-based" fill={C.accentText} radius={[0, 0, 0, 0]} />
            <Bar dataKey="policy" stackId="a" name="Policy-based" fill={C.navyLighter} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Abandoned escalations" subtitle="A patient without an interpreter — always investigated"
        right={<span style={{ fontSize: 12, color: C.critical, fontWeight: 600 }}>{abandoned} this period</span>}>
        <table style={tableStyle}>
          <thead><tr><Th>Encounter</Th><Th>Date</Th><Th>Department</Th><Th>Wait before abandonment</Th><Th /></tr></thead>
          <tbody>
            {recentAbandoned.map(r => (
              <tr key={r.id}>
                <Td mono>{r.id}</Td><Td>{r.date}</Td><Td>{r.dept}</Td><Td mono>{fmtMs(r.waitMs)}</Td>
                <Td>
                  {role.elevated ? (
                    <button style={btnGhost} onClick={() => onOpenEncounter(r.id)}>
                      Investigate <ChevronRight size={13} />
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: C.inkFaint, display: "flex", alignItems: "center", gap: 4 }}>
                      <Lock size={11} /> elevated role required
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
