import React from "react";
import { Clock, AlertTriangle, Check } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { C } from "../theme.js";
import { avg, pctChange, windowSlice } from "../mockData.js";
import { Tile, Panel, Th, Td, tableStyle, SeverityBadge, chartCommon, fmtPct, fmtMs } from "../components/ui.jsx";

export default function ReliabilityScreen({ data, allSeries }) {
  const agents = ["transcription", "interpretation", "documentation", "fact_verification", "orchestrator"];
  const errRates = agents.map(a => ({ agent: a, rate: avg(data, d => d.agentErrors[a]) }));
  const chartData = data.map(d => ({ date: d.date, p50: d.p50, p95: d.p95, p99: d.p99 }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <Tile icon={Clock} label="Latency p50" value={fmtMs(avg(data, "p50"))} />
        <Tile icon={Clock} label="Latency p95" value={fmtMs(avg(data, "p95"))} />
        <Tile icon={AlertTriangle} label="Latency p99" value={fmtMs(avg(data, "p99"))}
          delta={pctChange(avg(windowSlice(4, allSeries), "p99"), avg(allSeries.slice(-14, -4), "p99"))} />
        <Tile icon={Check} label="End-to-end availability" value={fmtPct(avg(data, "availability"), 2)} />
      </div>

      <Panel title="Synchronous latency" subtitle="p50 / p95 / p99, end-to-end speech to interpreted speech. The mean is never displayed.">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData}>
            <CartesianGrid vertical={false} stroke={C.border} />
            <XAxis dataKey="date" {...chartCommon()} minTickGap={40} />
            <YAxis {...chartCommon()} width={44} />
            <RTooltip contentStyle={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", borderRadius: 6 }} />
            <ReferenceLine y={2500} stroke={C.critical} strokeDasharray="4 4" label={{ value: "p99 budget", fontSize: 10, fill: C.critical }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="p50" stroke={C.good} strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="p95" stroke={C.medium} strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="p99" stroke={C.critical} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <Panel title="Error rate by agent" subtitle="Failures / timeouts / exceptions per thousand encounters — localizes failure to a component">
        <table style={tableStyle}>
          <thead><tr><Th>Agent</Th><Th>Error rate</Th><Th>Status</Th></tr></thead>
          <tbody>
            {errRates.map(r => (
              <tr key={r.agent}>
                <Td mono>{r.agent}</Td>
                <Td mono>{r.rate.toFixed(2)}‰</Td>
                <Td>{r.rate > 1.8 ? <SeverityBadge severity="high" /> : <SeverityBadge severity="good" />}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
