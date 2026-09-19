import { Activity, Users2, Radio, Clock, FileSearch, Database } from "lucide-react";

/* ============================================================
   DETERMINISTIC MOCK DATA
   Everything here is fabricated for the Phase 1 prototype — none
   of it is measured. Swap this module for real API calls once
   the orchestrator's event stream exists; nothing else in the
   app should need to change if the shape stays the same.
   ============================================================ */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rand = mulberry32(42);

export const DAYS = 90;
const today = new Date("2026-09-08T00:00:00Z");
export const dateAt = (offset) => {
  const d = new Date(today); d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
};

// Builds one institution's independent daily series using its own RNG stream,
// so each institution's numbers are genuinely separate, not a split of one pot.
function buildSeriesForInstitution(rng, weekdayBase, weekendBase) {
  const series = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const date = dateAt(i);
    const dow = new Date(date).getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const base = weekend ? weekendBase : weekdayBase;
    const encounters = Math.max(1, Math.round(base + (rng() - 0.5) * (base * 0.3)));
    const escTriggered = Math.round(encounters * (0.045 + rng() * 0.02));
    const escConfidence = Math.round(escTriggered * (0.55 + rng() * 0.15));
    const escPolicy = escTriggered - escConfidence;
    const escJoined = Math.round(escTriggered * (0.9 + rng() * 0.08));
    const escAbandoned = escTriggered - escJoined;
    const adjudicatedN = Math.max(0, Math.round(encounters * 0.03 + (rng() - 0.5) * 4));
    const discrepancies = Math.round(adjudicatedN * (0.004 + rng() * 0.01));
    const entityChecks = encounters * 14;
    const entityFails = Math.round(entityChecks * (0.001 + rng() * 0.003));
    const p50 = 480 + rng() * 60;
    const p95 = 1150 + rng() * 220;
    const p99 = 1900 + rng() * 500 + (i < 4 ? 900 * rng() : 0); // recent latency bump
    const agentErrors = {
      transcription: rng() * 2.2,
      interpretation: rng() * 1.6,
      documentation: rng() * 1.1,
      fact_verification: rng() * 0.9,
      orchestrator: rng() * 0.4,
    };
    const costInference = 0.62 + rng() * 0.08;
    const costInfra = 0.11 + rng() * 0.02;
    const costEgress = 0.02 + rng() * 0.01;
    const costEscalation = (escTriggered / Math.max(encounters, 1)) * (6.5 + rng());
    const rating = 4.1 + rng() * 0.6;
    const ratingResponses = Math.round(encounters * (0.28 + rng() * 0.1));
    const auditComplete = 99.2 + rng() * 0.7;
    series.push({
      date, encounters, escTriggered, escConfidence, escPolicy, escJoined, escAbandoned,
      adjudicatedN, discrepancies, entityChecks, entityFails,
      p50: Math.round(p50), p95: Math.round(p95), p99: Math.round(p99),
      agentErrors, costInference, costInfra, costEgress, costEscalation,
      rating: Number(rating.toFixed(2)), ratingResponses,
      auditComplete: Math.min(100, Number(auditComplete.toFixed(2))),
      availability: Number((99.90 + rng() * 0.09).toFixed(3)),
    });
  }
  return series;
}

// Combines several institutions' daily series into one system-wide series:
// additive fields sum, rate/latency/quality fields average across institutions.
function combineSeries(seriesList) {
  const days = seriesList[0].length;
  const combined = [];
  for (let i = 0; i < days; i++) {
    const rows = seriesList.map(s => s[i]);
    const sumField = (k) => rows.reduce((a, r) => a + r[k], 0);
    const avgField = (k) => rows.reduce((a, r) => a + r[k], 0) / rows.length;
    const avgAgent = (k) => rows.reduce((a, r) => a + r.agentErrors[k], 0) / rows.length;
    combined.push({
      date: rows[0].date,
      encounters: sumField("encounters"),
      escTriggered: sumField("escTriggered"),
      escConfidence: sumField("escConfidence"),
      escPolicy: sumField("escPolicy"),
      escJoined: sumField("escJoined"),
      escAbandoned: sumField("escAbandoned"),
      adjudicatedN: sumField("adjudicatedN"),
      discrepancies: sumField("discrepancies"),
      entityChecks: sumField("entityChecks"),
      entityFails: sumField("entityFails"),
      p50: Math.round(avgField("p50")),
      p95: Math.round(avgField("p95")),
      p99: Math.round(avgField("p99")),
      agentErrors: {
        transcription: avgAgent("transcription"),
        interpretation: avgAgent("interpretation"),
        documentation: avgAgent("documentation"),
        fact_verification: avgAgent("fact_verification"),
        orchestrator: avgAgent("orchestrator"),
      },
      costInference: avgField("costInference"),
      costInfra: avgField("costInfra"),
      costEgress: avgField("costEgress"),
      costEscalation: avgField("costEscalation"),
      rating: Number(avgField("rating").toFixed(2)),
      ratingResponses: sumField("ratingResponses"),
      auditComplete: Number(avgField("auditComplete").toFixed(2)),
      availability: Number(avgField("availability").toFixed(3)),
    });
  }
  return combined;
}

export const INSTITUTIONS = ["Downtown Medical Center", "Westside Clinic", "North Pavilion"];
export const DEPARTMENTS = ["Emergency", "Ambulatory", "Inpatient — Internal Medicine", "OB/GYN", "Pediatrics"];
export const LANG_PAIRS = [
  { provider: "en-US", patient: "es-MX" },
  { provider: "en-US", patient: "zh-CN" },
  { provider: "en-US", patient: "vi-VN" },
  { provider: "en-US", patient: "ar-SA" },
  { provider: "en-US", patient: "ht-HT" },
];
export const PROVIDER_LANGUAGES = [...new Set(LANG_PAIRS.map(p => p.provider))];
export const PATIENT_LANGUAGES = [...new Set(LANG_PAIRS.map(p => p.patient))];
export const CLINICIANS = ["Dr. A. Patel", "Dr. M. Chen", "Dr. J. Alvarez", "Dr. R. Okafor", "Dr. S. Kim"];
export const PATIENT_FIRST = ["Maria", "Wei", "Nguyen", "Fatima", "Jean", "Carlos", "Amara", "Linh"];
export const PATIENT_LAST = ["Gonzalez", "Li", "Tran", "Haddad", "Baptiste", "Rivera", "Nwosu", "Pham"];

// Each institution gets its own independent RNG stream and volume profile —
// this is what "each institution sees only theirs" needs to actually mean
// something, rather than just filtering one shared pot of numbers.
export const SERIES_BY_INSTITUTION = {
  "Downtown Medical Center": buildSeriesForInstitution(mulberry32(501), 190, 65),
  "Westside Clinic": buildSeriesForInstitution(mulberry32(502), 140, 45),
  "North Pavilion": buildSeriesForInstitution(mulberry32(503), 100, 32),
};
export const SERIES = combineSeries(Object.values(SERIES_BY_INSTITUTION));

export function windowSlice(days, series = SERIES) { return series.slice(series.length - days); }
export function sum(arr, key) { return arr.reduce((a, r) => a + (typeof key === "function" ? key(r) : r[key]), 0); }
export function avg(arr, key) { return arr.length ? sum(arr, key) / arr.length : 0; }
export function pctChange(cur, prev) { if (!prev) return null; return ((cur - prev) / prev) * 100; }

// Language coverage/quality table is Phase 2+ (depends on the adjudication
// pipeline) and is intentionally not built in this Phase 1 pass.

// Individual encounter records — this is identifiable data (patient name) once
// joined to language/duration/errors, so the Encounters screen gates the name
// column behind an elevated role and logs bulk views, per the doc's "identifiable
// data is restricted and every view is logged" principle.
function buildEncounters(n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const dayOffset = Math.floor(rand() * DAYS);
    const errors = Math.round(rand() * rand() * 6);
    const pair = LANG_PAIRS[Math.floor(rand() * LANG_PAIRS.length)];
    const tokensUsed = Math.round(1800 + rand() * 7200);
    // Cost model: $0.03 per 1,000 tokens (inference) + a small flat per-encounter
    // infra fee. Illustrative only — not a real pricing figure from anyone's bill.
    const costUsd = Number(((tokensUsed / 1000) * 0.03 + (0.01 + rand() * 0.02)).toFixed(3));
    rows.push({
      id: `ENC-${88000 + i}`,
      date: dateAt(dayOffset),
      institution: INSTITUTIONS[Math.floor(rand() * INSTITUTIONS.length)],
      department: DEPARTMENTS[Math.floor(rand() * DEPARTMENTS.length)],
      clinician: CLINICIANS[Math.floor(rand() * CLINICIANS.length)],
      patientName: `${PATIENT_FIRST[Math.floor(rand() * PATIENT_FIRST.length)]} ${PATIENT_LAST[Math.floor(rand() * PATIENT_LAST.length)]}`,
      providerLanguage: pair.provider,
      patientLanguage: pair.patient,
      modality: rand() > 0.62 ? "two-way" : "one-way",
      durationMin: Math.round(6 + rand() * 34),
      tokensUsed,
      costUsd,
      escalated: rand() > 0.85,
      errorsDetected: errors,
      corrected: errors > 0 ? rand() > 0.15 : null, // null = nothing to correct
    });
  }
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}
// Bumped from 70 to 450 so per-institution/per-department/per-language breakdowns
// on Overview have enough volume to demo the suppression rule meaningfully
// (some 7-day cells will still legitimately suppress — that's correct behavior,
// not a bug, given how thin a single week/department/language slice can be).
export const ENCOUNTERS = buildEncounters(450);
export function pseudonymize(id) { return `Patient •••${id.slice(-3)}`; }

export const ALERTS = [
  { id: "a2", condition: "Synchronous p99 latency exceeded the agreed budget (2,730 ms vs 2,500 ms)", severity: "high", routedTo: "MedLingo engineering", at: "2026-09-08T04:02:00Z", status: "open" },
  { id: "a4", condition: "Escalation abandoned without an interpreter joining (2 encounters, overnight)", severity: "high", routedTo: "Language services operations", at: "2026-09-07T02:11:00Z", status: "open" },
  { id: "a5", condition: "Audit trail gap detected — 3 encounters missing terminal event", severity: "medium", routedTo: "Compliance", at: "2026-09-06T21:55:00Z", status: "acknowledged" },
];
// Alerts tied to Phase 2 metrics (critical-entity fidelity floor breach, clinician
// override rate — an adoption-domain metric) are removed until those metrics exist.

export const ROLES = [
  { id: "safety", label: "Clinical safety & quality", audience: "Clinical safety committee, CMO", home: "overview", elevated: true, phase2Note: true },
  { id: "ops", label: "Language services & operations", audience: "Language services director, interpreter managers", home: "escalation", elevated: false },
  { id: "finance", label: "Finance", audience: "CFO, finance business partners", home: "overview", elevated: false, phase2Note: true },
  { id: "adoption", label: "Clinical adoption", audience: "CMIO, department leads", home: "overview", elevated: false },
  { id: "engineering", label: "Platform reliability", audience: "MedLingo engineering, institutional IT", home: "reliability", elevated: false },
  { id: "compliance", label: "Compliance & audit", audience: "Section 1557 coordinator, privacy office", home: "governance", elevated: true },
];
// Institution is a free filter for now (see top bar), not locked per role —
// real per-institution access control is on hold until Azure access clarifies
// the schema/identity model. Revisit this file's ROLES when that's resolved.
// safety/finance roles' full screens (adjudicated quality, cost) land in Phase 2 —
// phase2Note surfaces a banner so those roles know why their view looks thin right now.

export const NAV = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "encounters", label: "Encounters", icon: Users2 },
  { id: "apis", label: "APIs", icon: Database },
  { id: "escalation", label: "Escalation", icon: Radio },
  { id: "reliability", label: "Reliability", icon: Clock },
  { id: "governance", label: "Governance & audit", icon: FileSearch },
];
// Clinical safety & quality and Cost are Phase 2 (Section 7) — adjudicated-sample
// and cost-per-encounter metrics don't exist yet in Phase 1. Re-add when Phase 2 starts.

// ============================================================
// APIs screen — RxNorm / SNOMED / LOINC terminology lookups.
// NO REAL DATA SOURCE EXISTS FOR THIS AT ALL. The candidate real table
// (glossary_terms) has zero rows — confirmed by direct query. Everything
// below is illustrative mock data, same as the small chart this screen
// expands on from Overview. Do not treat any number here as measured.
export const API_NAMES = ["RxNorm", "SNOMED", "LOINC"];
const RXNORM_TERMS = ["Lisinopril 10mg", "Metformin 500mg", "Amoxicillin 250mg", "Atorvastatin 20mg", "Albuterol inhaler"];
const SNOMED_TERMS = ["Type 2 diabetes mellitus", "Essential hypertension", "Acute chest pain", "Seasonal allergic rhinitis", "Migraine without aura"];
const LOINC_TERMS = ["Hemoglobin A1c", "Basic metabolic panel", "Complete blood count", "Lipid panel", "TSH"];

function buildApiCallRecords(n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const dayOffset = Math.floor(rand() * DAYS);
    const hh = String(Math.floor(rand() * 24)).padStart(2, "0");
    const mm = String(Math.floor(rand() * 60)).padStart(2, "0");
    const ss = String(Math.floor(rand() * 60)).padStart(2, "0");
    const timestamp = `${dateAt(dayOffset)}T${hh}:${mm}:${ss}Z`;
    const apiRoll = rand();
    const api = apiRoll < 0.46 ? "RxNorm" : apiRoll < 0.80 ? "SNOMED" : "LOINC";
    const termList = api === "RxNorm" ? RXNORM_TERMS : api === "SNOMED" ? SNOMED_TERMS : LOINC_TERMS;
    const encounter = ENCOUNTERS[Math.floor(rand() * ENCOUNTERS.length)];
    rows.push({
      id: `LOOKUP-${100000 + i}`,
      timestamp,
      encounterId: encounter.id,
      api,
      term: termList[Math.floor(rand() * termList.length)],
      status: rand() > 0.08 ? "matched" : "no_match",
      latencyMs: Math.round(80 + rand() * 340),
    });
  }
  return rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}
export const API_CALL_RECORDS = buildApiCallRecords(600);
