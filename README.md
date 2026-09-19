# MedLingo Dashboard Backend — Local Prototype

**Read this before running anything.**

## What this is

A small, real backend API that queries the actual `medlingodb` database
(the same one you've been exploring in Cloud Shell), for the fields
confirmed real as of the schema investigation on 2026-09-11/12. It is a
prototype to let you see actual data flowing through actual endpoints —
not a production service.

## What this is NOT

- **Not secured.** There is no authentication, no institution-based access
  control, no role-based redaction. Anyone who can reach this server can
  call any endpoint. **Do not deploy this anywhere reachable from the
  internet, and do not point the dashboard frontend at it in any shared
  or hosted environment.** Local, on your own machine, talking to a dev
  database, is the only intended use right now.
- **Not complete.** Errors detected, tokens used, escalation, and PHI-access
  audit logging are all left out entirely — not faked, not stubbed with
  placeholder numbers, just absent — because the real data sources for
  those are still unconfirmed or require a product decision first. See
  `dashboard-api-requirements.md` (Section 2) for what's still open.
- **Never returns patient names.** With no auth system yet, there's no way
  to know if a caller should be allowed to see identifiable data — so this
  prototype simply never includes it, full stop, regardless of who's asking.

## Setup

1. `cp .env.example .env`
2. Fill in `DATABASE_URL` in `.env` with a real connection string:
   ```
   postgresql://gioadmin:YOUR_PASSWORD@azkc-gio-postgresql-dev.postgres.database.azure.com:5432/medlingodb?sslmode=require
   ```
   **Never commit this file.** If you get a scoped read-only Postgres role
   set up later, use that instead of `gioadmin` here — this backend only
   ever runs `SELECT` queries, so a read-only role is all it needs.
3. `npm install`
4. `npm run dev`
5. Server runs at `http://localhost:4000`

## Try it

```bash
curl http://localhost:4000/health

curl http://localhost:4000/api/metrics/overview

curl "http://localhost:4000/api/metrics/breakdowns?by=institution"
curl "http://localhost:4000/api/metrics/breakdowns?by=specialty"

curl "http://localhost:4000/api/encounters?institution=Keck+Medical+Center&page=1&pageSize=10"
```

## What each endpoint is actually backed by

| Endpoint | Real data? | Notes |
|---|---|---|
| `GET /api/metrics/overview` | ✅ real | Total encounters, avg duration, modality split. No latency/availability — that's not Postgres data. |
| `GET /api/metrics/breakdowns?by=institution` | ✅ real | Grouped by `doctor_profiles.hospital_clinic_name`. |
| `GET /api/metrics/breakdowns?by=department` | ⚠️ real query, likely empty results | Column exists but isn't populated by the current sign-up flow. |
| `GET /api/metrics/breakdowns?by=specialty` | ✅ real | Grouped by `doctor_profiles.specialty` — currently the closest real substitute for department. |
| `GET /api/metrics/breakdowns?by=providerLang\|patientLang\|modality` | ✅ real | Direct columns on `sessions`. |
| `GET /api/encounters` | ✅ real, partial | Institution/language/modality/duration/date are real. No errors/tokens/escalation/patient name — see above. |

## Suppression

`/api/metrics/breakdowns` drops any bucket under 20 encounters
(`SUPPRESSION_MIN` in `.env`) before it ever leaves the server — this
matches the dashboard's existing suppression rule, and happens here
specifically so a client can't bypass it by calling the API directly
instead of going through the dashboard UI.

## Next steps, not done here

- Wire this into the actual React dashboard (currently still using
  `mockData.js`) — replace specific mock exports with `fetch()` calls to
  these endpoints, one screen at a time
- Real auth (Entra ID), before this ever touches more than one person's
  laptop
- Resolve the open Section 2 questions (tokens, errors, escalation
  confirmation) before building those endpoints for real
