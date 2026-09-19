# MedLingo Monitoring & Governance Dashboard — Phase 1 prototype

This is a UI/UX prototype only. **All data shown is mock/fabricated** — it is not
connected to any real event stream, and none of the numbers should be treated as
measured. It exists to get design and structure sign-off before real integration.

## Run it locally

Requires Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Then open the URL it prints (usually http://localhost:5173).

## What's in here

The app is split into modules rather than one file:

- `src/theme.js` — colors, fonts, the suppression-threshold constant
- `src/mockData.js` — all fabricated data: the daily metric series, the
  encounter list, alerts, roles, and nav. **This is the file to swap out**
  once real events exist — replace its exports with real API calls and
  nothing else should need to change.
- `src/components/ui.jsx` — shared primitives (Tile, Panel, table bits,
  buttons) used by every screen
- `src/components/EncounterDetailModal.jsx` — the restricted per-encounter
  drill-down
- `src/screens/` — one file per screen: `OverviewScreen.jsx`,
  `EncountersScreen.jsx`, `EscalationScreen.jsx`, `ReliabilityScreen.jsx`,
  `GovernanceScreen.jsx`
- `src/App.jsx` — the shell: sidebar, top bar, role/period state, routing
  between screens. This is the one file to touch when adding a new screen.
- `src/main.jsx` — mounts `App` into the page.
- `index.html` / `vite.config.js` / `package.json` — standard Vite + React setup.

## Scope

This build is trimmed to **Phase 1** metrics only (per the Monitoring &
Governance Dashboard proposal, Section 7): usage, escalation rate and
triggers, synchronous latency, error and failure rates, clinician rating,
and audit trail completeness. Clinical Safety & Quality and Cost screens are
Phase 2 and are intentionally not built yet — they depend on the adjudication
pipeline and cost-attribution data, which don't exist in Phase 1.

## Before this touches real data

None of this is wired to a real backend. Before any of it is meaningful:
- Confirm what CLAIRO/orchestrator events actually exist today (if any)
- Confirm where those events land (logs, a database, Event Hubs — nothing
  centralized yet, as of this writing)
- Map real field names to the event schema this prototype assumes
  (`encounter.started`, `escalation.triggered`, `rating.submitted`, etc.)
- Decide on auth (Entra ID tenant) before anyone but the design review
  audience sees this

None of the above is a frontend concern — it's for the backend/mobile team
to confirm.
