import React, { useState } from "react";
import { Activity, Radio, Clock, Check, FileSearch, Smile, Info, ChevronRight, Building2 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from "recharts";
import { C, SUPPRESSION_MIN } from "../theme.js";
import { sum, avg, pctChange, ALERTS, ENCOUNTERS, INSTITUTIONS, dateAt } from "../mockData.js";
import { Tile, Panel, SeverityBadge, chartCommon, btnGhost, fmtPct, fmtMs } from "../components/ui.jsx";

export default function OverviewScreen({ role, data, prev, onNavigate, institutionScope, periodDays }) {
  const enc = sum(data, "encounters");
  const prevEnc = sum(prev, "encounters");
  const escRate = (sum(data, "escTriggered") / enc) * 100;
  const prevEscRate = (sum(prev, "escTriggered") / Math.max(prevEnc, 1)) * 100;
  const p95 = avg(data, "p95");
  const availability = avg(data, "availability");
  const auditComplete = avg(data, "auditComplete");

  // Per-encounter breakdown charts — built from the actual encounter records
  // (not the daily aggregate series), scoped to the same institution + period
  // as everything else on this screen.
  const cutoffDate = dateAt(periodDays - 1);
  const scoped = ENCOUNTERS.filter(e =>
    e.date >= cutoffDate && (institutionScope === "all" || e.institution === institutionScope)
  );

  function bucketCounts(items, keyFn) {
    const counts = {};
    items.forEach(item => { const k = keyFn(item); counts[k] = (counts[k] || 0) + 1; });
    return counts;
  }
  function toChartRows(counts, minN = SUPPRESSION_MIN) {
    const entries = Object.entries(counts);
    const shown = entries.filter(([, n]) => n >= minN).sort((a, b) => b[1] - a[1]);
    const hiddenCount = entries.length - shown.length;
    return { rows: shown.map(([label, n]) => ({ label, n })), hiddenCount };
  }

  const deptBuckets = toChartRows(bucketCounts(scoped, e => e.department));
  const langBuckets = toChartRows(bucketCounts(scoped, e => e.patientLanguage));
  const clinicianBuckets = toChartRows(bucketCounts(scoped, e => e.clinician));

  // Errors by language pair — suppression applies to the underlying encounter
  // count per language, not the raw error sum, since a tiny sample is the risk.
  const errorsByLang = {};
  const encCountByLang = {};
  scoped.forEach(e => {
    errorsByLang[e.patientLanguage] = (errorsByLang[e.patientLanguage] || 0) + e.errorsDetected;
    encCountByLang[e.patientLanguage] = (encCountByLang[e.patientLanguage] || 0) + 1;
  });
  const errorLangEntries = Object.keys(errorsByLang);
  const errorLangShown = errorLangEntries
    .filter(l => encCountByLang[l] >= SUPPRESSION_MIN)
    .map(l => ({ label: l, n: errorsByLang[l], encounters: encCountByLang[l] }))
    .sort((a, b) => b.n - a.n);
  const errorLangHidden = errorLangEntries.length - errorLangShown.length;

  // Encounters by institution — only meaningful when viewing "All institutions";
  // a single-institution filter would just show one bar of itself.
  const instBuckets = institutionScope === "all" ? toChartRows(bucketCounts(scoped, e => e.institution)) : null;

  // Modality split — a two-way split of a tiny sample is still a small-cell risk,
  // so the whole chart suppresses if the underlying count is too thin.
  const oneWayCount = scoped.filter(e => e.modality === "one-way").length;
  const twoWayCount = scoped.length - oneWayCount;
  const modalitySuppressed = scoped.length < SUPPRESSION_MIN;

  // Terminology vocabulary lookups (RxNorm / SNOMED / LOINC) — unlike every
  // other mock field on this dashboard, there is currently NO real candidate
  // data source for this at all. `glossary_terms` exists in the real schema
  // but has zero rows. This is illustrative only, tied loosely to encounter
  // volume so it responds to filters, not derived from anything real.
  const vocabTotal = scoped.length * 3; // illustrative: ~3 lookups/encounter
  const vocabRows = [
    { label: "RxNorm", n: Math.round(vocabTotal * 0.46) },
    { label: "SNOMED", n: Math.round(vocabTotal * 0.34) },
    { label: "LOINC", n: Math.round(vocabTotal * 0.20) },
  ];
  const vocabSuppressed = scoped.length < SUPPRESSION_MIN;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: C.navy, borderRadius: 8, padding: "16px 20px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Viewing as</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{role.label}</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.85, display: "flex", alignItems: "center", gap: 6 }}>
          <Building2 size={14} />
          {institutionScope === "all" ? "All institutions" : institutionScope}
        </div>
      </div>

      {role.phase2Note && (
        <div style={{
          background: C.mediumSoft, border: `1px solid #E9DCB0`, borderRadius: 8, padding: "12px 16px",
          fontSize: 12.5, color: "#6B551A", display: "flex", gap: 8, alignItems: "flex-start"
        }}>
          <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          The full {role.label.toLowerCase()} view (adjudicated quality metrics, cost per encounter) is scoped for
          Phase 2, once encounter-level events are flowing and the adjudication sample is running. This is the
          Phase 1 operational view in the meantime.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <Tile icon={Activity} label="Interpreted encounters" value={enc.toLocaleString()} delta={pctChange(enc, prevEnc)}
          version={1} formula="count(encounter.ended where completion_status = completed)" />
        <Tile icon={Radio} label="Escalation rate" value={fmtPct(escRate)} delta={pctChange(escRate, prevEscRate)} invert
          version={2} formula="count(escalation.triggered) / interpreted_encounters" />
        <Tile icon={Clock} label="Sync latency (p95)" value={fmtMs(p95)} version={3}
          formula="percentile(utterance.processed end-to-end latency_ms, 95)" />
        <Tile icon={Check} label="End-to-end availability" value={fmtPct(availability, 2)} version={5}
          formula="1 - (failed_encounters / attempted_encounters)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <Panel title="Interpreted encounters" subtitle="Daily volume, selected period">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="encGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.accentText} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={C.accentText} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={C.border} />
              <XAxis dataKey="date" {...chartCommon()} minTickGap={40} />
              <YAxis {...chartCommon()} width={36} />
              <RTooltip contentStyle={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", borderRadius: 6 }} />
              <Area type="monotone" dataKey="encounters" stroke={C.accentText} fill="url(#encGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Open alerts" subtitle="Section 4 conditions" right={
          <button onClick={() => onNavigate("governance")} style={btnGhost}>View all <ChevronRight size={13} /></button>
        }>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ALERTS.filter(a => a.status === "open").slice(0, 4).map(a => (
              <div key={a.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <SeverityBadge severity={a.severity} />
                <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.4 }}>{a.condition}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        <Tile icon={FileSearch} label="Audit trail completeness" value={fmtPct(auditComplete, 1)}
          onClick={() => onNavigate("governance")} version={6}
          formula="encounters with a complete, retrievable record / total encounters" />
        <Tile icon={Smile} label="Clinician encounter rating" value={avg(data, "rating").toFixed(2)} unit="/ 5"
          sampled n={sum(data, "ratingResponses")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <BreakdownPanel title="Encounters by department" data={deptBuckets} barColor={C.accentText} labelWidth={150} />
        <BreakdownPanel title="Most spoken patient language" data={langBuckets} barColor={C.navyLighter} labelWidth={90} mono />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <BreakdownPanel title="Encounters by clinician" subtitle="Who's actually carrying volume this period" data={clinicianBuckets} barColor={C.good} labelWidth={130} />
        <ErrorsByLangPanel rows={errorLangShown} hiddenCount={errorLangHidden} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: instBuckets ? "1fr 1fr" : "1fr", gap: 16 }}>
        {instBuckets && (
          <BreakdownPanel title="Encounters by institution" data={instBuckets} barColor={C.navy} labelWidth={150} />
        )}
        <Panel title="Device modality split" subtitle="One-way (separate devices) vs. two-way (shared device)">
          {modalitySuppressed ? (
            <EmptyBreakdown text={`Suppressed — fewer than ${SUPPRESSION_MIN} encounters for this selection.`} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: "One-way", value: oneWayCount },
                    { name: "Two-way", value: twoWayCount },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  label={({ name, value }) => `${name}: ${fmtPct((value / scoped.length) * 100, 0)}`}
                >
                  <Cell fill={C.accentText} />
                  <Cell fill={C.navyLighter} />
                </Pie>
                <RTooltip contentStyle={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", borderRadius: 6 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <Panel
          title="Terminology vocabulary lookups"
          subtitle="RxNorm (medications) / SNOMED (clinical findings) / LOINC (labs) — % of lookups by vocabulary"
        >
          <div style={{
            background: C.criticalSoft, border: "1px solid #EBC9C6", borderRadius: 6, padding: "8px 12px",
            fontSize: 11.5, color: C.critical, display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 14
          }}>
            <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <strong>No real data source confirmed.</strong> Unlike other mock charts on this screen, the real
            table for this (<code>glossary_terms</code>) exists but has zero rows — this is purely illustrative
            until someone confirms what "RxNorm/SNOMED/LOINC API calls" actually refers to and where it's logged.
          </div>
          {vocabSuppressed ? (
            <EmptyBreakdown text={`Suppressed — fewer than ${SUPPRESSION_MIN} encounters for this selection.`} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vocabRows} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} stroke={C.border} />
                <XAxis type="number" {...chartCommon()} />
                <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 11.5, fill: C.inkSub, fontFamily: "IBM Plex Mono, monospace" }} axisLine={{ stroke: C.border }} tickLine={false} />
                <RTooltip
                  contentStyle={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", borderRadius: 6 }}
                  formatter={(value) => [`${value.toLocaleString()} lookups (${fmtPct((value / vocabTotal) * 100, 0)})`, ""]}
                />
                <Bar dataKey="n" fill={C.medium} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>
    </div>
  );
}

function BreakdownPanel({ title, subtitle, data, barColor, labelWidth, mono, defaultLimit = 5 }) {
  const [expanded, setExpanded] = useState(false);
  const visibleRows = expanded ? data.rows : data.rows.slice(0, defaultLimit);
  const hasMore = data.rows.length > defaultLimit;

  return (
    <Panel title={title} subtitle={subtitle || "Per-encounter records, current filters"} right={
      hasMore && (
        <button style={btnGhost} onClick={() => setExpanded(e => !e)}>
          {expanded ? "Show less" : `View all (${data.rows.length})`}
        </button>
      )
    }>
      {data.rows.length === 0 ? (
        <EmptyBreakdown />
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(140, visibleRows.length * 36)}>
          <BarChart data={visibleRows} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid horizontal={false} stroke={C.border} />
            <XAxis type="number" {...chartCommon()} />
            <YAxis type="category" dataKey="label" width={labelWidth} tick={{ fontSize: 11.5, fill: C.inkSub, fontFamily: mono ? "IBM Plex Mono, monospace" : "IBM Plex Sans, sans-serif" }} axisLine={{ stroke: C.border }} tickLine={false} />
            <RTooltip contentStyle={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", borderRadius: 6 }} />
            <Bar dataKey="n" fill={barColor} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
      {data.hiddenCount > 0 && <SuppressionFootnote count={data.hiddenCount} noun="category" plural="categories" />}
    </Panel>
  );
}

function ErrorsByLangPanel({ rows, hiddenCount, defaultLimit = 5 }) {
  const [expanded, setExpanded] = useState(false);
  const visibleRows = expanded ? rows : rows.slice(0, defaultLimit);
  const hasMore = rows.length > defaultLimit;

  return (
    <Panel title="Errors detected by language pair" subtitle="Sum of errorsDetected, current filters" right={
      hasMore && (
        <button style={btnGhost} onClick={() => setExpanded(e => !e)}>
          {expanded ? "Show less" : `View all (${rows.length})`}
        </button>
      )
    }>
      {rows.length === 0 ? (
        <EmptyBreakdown />
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(140, visibleRows.length * 36)}>
          <BarChart data={visibleRows} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid horizontal={false} stroke={C.border} />
            <XAxis type="number" {...chartCommon()} />
            <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11.5, fill: C.inkSub, fontFamily: "IBM Plex Mono, monospace" }} axisLine={{ stroke: C.border }} tickLine={false} />
            <RTooltip contentStyle={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", borderRadius: 6 }}
              formatter={(value, name, props) => [`${value} errors across ${props.payload.encounters} encounters`, ""]} />
            <Bar dataKey="n" fill={C.high} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
      {hiddenCount > 0 && <SuppressionFootnote count={hiddenCount} noun="language" />}
    </Panel>
  );
}

function EmptyBreakdown({ text }) {
  return (
    <div style={{ fontSize: 12.5, color: C.inkFaint, padding: "24px 0", textAlign: "center" }}>
      {text || "No categories meet the minimum reporting threshold for this period/institution."}
    </div>
  );
}

function SuppressionFootnote({ count, noun, plural }) {
  const word = count > 1 ? (plural || `${noun}s`) : noun;
  return (
    <div style={{ fontSize: 11, color: C.inkFaint, marginTop: 8, display: "flex", gap: 5, alignItems: "flex-start" }}>
      <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
      {count} additional {word} omitted — fewer than {SUPPRESSION_MIN} encounters (Section 8 suppression rule).
    </div>
  );
}
