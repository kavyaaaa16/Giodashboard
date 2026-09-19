import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { C, SUPPRESSION_MIN } from "../theme.js";

/* ============================================================
   SHARED UI
   Small, reusable pieces used across every screen. Keeping these
   in one place is what makes the suppression/sample-size/version
   patterns consistent everywhere instead of reimplemented per screen.
   ============================================================ */
export function fmtPct(v, digits = 1) { return `${v.toFixed(digits)}%`; }
export function fmtMs(v) { return `${Math.round(v).toLocaleString()} ms`; }
export function fmtUSD(v) { return `$${v.toFixed(2)}`; }

export function Delta({ value, invert }) {
  if (value === null || Number.isNaN(value)) return <span style={{ color: C.inkFaint, fontSize: 12 }}>—</span>;
  const good = invert ? value < 0 : value > 0;
  const Icon = value >= 0 ? ArrowUp : ArrowDown;
  const color = Math.abs(value) < 0.5 ? C.inkFaint : (good ? C.good : C.critical);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, color, fontSize: 12, fontFamily: "IBM Plex Mono, monospace" }}>
      <Icon size={12} strokeWidth={2.5} />{Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function SampleTag({ n, suppressed }) {
  if (suppressed) {
    return <span style={{ fontSize: 11, color: C.suppressed, fontFamily: "IBM Plex Mono, monospace" }}>suppressed · n&lt;{SUPPRESSION_MIN}</span>;
  }
  return <span style={{ fontSize: 11, color: C.inkFaint, fontFamily: "IBM Plex Mono, monospace" }}>n={n.toLocaleString()}</span>;
}

export function VersionTag({ v, formula }) {
  return (
    <span title={formula} style={{
      fontSize: 10, color: C.inkFaint, border: `1px solid ${C.border}`, borderRadius: 3,
      padding: "1px 4px", fontFamily: "IBM Plex Mono, monospace", cursor: "help"
    }}>v{v}</span>
  );
}

export function Tile({ icon: Icon, label, value, unit, delta, invert, n, suppressed, version, formula, sampled, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 8, minWidth: 0, cursor: onClick ? "pointer" : "default"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.inkSub, fontSize: 12.5, fontWeight: 500 }}>
          <Icon size={14} strokeWidth={2} />{label}
        </div>
        {version && <VersionTag v={version} formula={formula} />}
      </div>
      {suppressed ? (
        <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 22, color: C.suppressed, fontWeight: 600 }}>Suppressed</div>
      ) : (
        <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 26, color: C.ink, fontWeight: 600, lineHeight: 1 }}>
          {value}{unit && <span style={{ fontSize: 14, color: C.inkSub, marginLeft: 3 }}>{unit}</span>}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {delta !== undefined ? <Delta value={delta} invert={invert} /> : <span />}
        {sampled && <SampleTag n={n} suppressed={suppressed} />}
      </div>
    </div>
  );
}

export function SeverityBadge({ severity }) {
  const map = {
    critical: [C.critical, C.criticalSoft],
    high: [C.high, C.highSoft],
    medium: [C.medium, C.mediumSoft],
    good: [C.good, C.goodSoft],
  };
  const [fg, bg] = map[severity] || map.medium;
  return (
    <span style={{
      background: bg, color: fg, fontSize: 11, fontWeight: 600, padding: "2px 8px",
      borderRadius: 20, textTransform: "uppercase", letterSpacing: 0.3
    }}>{severity}</span>
  );
}

export function Panel({ title, subtitle, right, children }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: C.inkSub, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function chartCommon() {
  return {
    tick: { fontSize: 11, fill: C.inkFaint, fontFamily: "IBM Plex Mono, monospace" },
    axisLine: { stroke: C.border }, tickLine: false,
  };
}

export const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
export function Th({ children }) {
  return <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, color: C.inkFaint, borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{children}</th>;
}
export function Td({ children, mono, style }) {
  return <td style={{ padding: "9px 10px", borderBottom: `1px solid ${C.border}`, color: C.ink, fontFamily: mono ? "IBM Plex Mono, monospace" : undefined, ...style }}>{children}</td>;
}

export const btnGhost = {
  background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px",
  fontSize: 12, color: C.ink, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
  fontFamily: "IBM Plex Sans, sans-serif",
};
export const btnPrimary = {
  background: C.navy, border: "none", borderRadius: 6, padding: "8px 14px", color: "#fff",
  fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
  fontFamily: "IBM Plex Sans, sans-serif",
};
export const selectStyle = {
  border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12.5,
  color: C.ink, background: C.panel, fontFamily: "IBM Plex Sans, sans-serif", cursor: "pointer",
};

export function ModalityTag({ modality }) {
  const oneWay = modality === "one-way";
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
      background: oneWay ? C.accentSoft : "#F0F1F3", color: oneWay ? C.accentText : C.inkSub,
      whiteSpace: "nowrap", display: "inline-block"
    }}>
      {oneWay ? "One-way" : "Two-way"}
    </span>
  );
}

export function CorrectedBadge({ corrected }) {
  if (corrected === null) return <span style={{ color: C.inkFaint, fontSize: 12 }}>—</span>;
  const [fg, bg, label] = corrected
    ? [C.good, C.goodSoft, "Corrected"]
    : [C.critical, C.criticalSoft, "Not corrected"];
  return (
    <span style={{
      background: bg, color: fg, fontSize: 11, fontWeight: 600, padding: "2px 8px",
      borderRadius: 20, whiteSpace: "nowrap"
    }}>{label}</span>
  );
}

export function MatchStatusBadge({ status }) {
  const matched = status === "matched";
  return (
    <span style={{
      background: matched ? C.goodSoft : C.criticalSoft, color: matched ? C.good : C.critical,
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap"
    }}>{matched ? "Matched" : "No match"}</span>
  );
}

export function EscalatedBadge({ escalated }) {
  if (!escalated) return <span style={{ color: C.inkFaint, fontSize: 12 }}>—</span>;
  return (
    <span style={{
      background: C.mediumSoft, color: C.medium, fontSize: 11, fontWeight: 600, padding: "2px 8px",
      borderRadius: 20, whiteSpace: "nowrap"
    }}>Escalated</span>
  );
}
