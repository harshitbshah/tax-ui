# Architecture

Last updated: 2026-03-28

---

## Overview

TaxLens (forked from brianlovin/tax-ui) is a single-process Bun application — one server handles both the API and serves the React frontend. All data stays local; no cloud storage, no external services except the Anthropic API.

```
Browser (React 19)
    │
    ▼
Bun server (src/index.ts)
    ├── GET  /                      → serves React app
    ├── POST /api/upload            → PDF → parser → storage
    ├── POST /api/chat              → Claude Sonnet chat
    ├── POST /api/suggestions       → Claude Haiku follow-up suggestions
    ├── POST /api/forecast          → Claude Sonnet forecast generation  [planned]
    └── GET  /api/forecast          → cached forecast from SQLite         [planned]
    │
    ├── src/lib/parser.ts           → US return parsing (two-pass Sonnet)
    ├── src/lib/india-parser.ts     → India ITR parsing (Haiku detect + Sonnet extract)
    ├── src/lib/storage.ts          → US returns (flat JSON)
    ├── src/lib/india-storage.ts    → India returns (flat JSON)
    ├── src/lib/pdf-utils.ts        → Java-serialized PDF unwrapping
    ├── src/lib/db.ts               → SQLite for forecast cache            [planned]
    └── src/lib/forecaster.ts       → forecast generation + prompt         [planned]
```

---

## Data Flow

### Parsing (US)
```
PDF upload
  → pdf-utils.ts: unwrap if Java-serialized
  → parser.ts: two-pass Claude Sonnet (page images + structured extraction)
  → reconcile(): post-parse validation (refundOrOwed, summary fields)
  → storage.ts: upsert to .tax-returns.json
```

### Parsing (India)
```
PDF upload (or scripts/import-india.ts CLI)
  → pdf-utils.ts: unwrap if Java-serialized (Indian IT portal wraps PDFs in aced0005)
  → india-parser.ts:
      pass 1 — Haiku: detect ITR-1 vs ITR-2
      pass 2 — Sonnet: extract (single-pass for ITR-1, two-pass for ITR-2)
      proactive token budget: 60s sliding window on response.usage to prevent 429s
  → india-storage.ts: upsert to .india-tax-returns.json keyed by FY
```

### Chat
```
User message
  → /api/chat: loads all returns for context + selectedYear
  → Claude Sonnet: year-aware system prompt with full return JSON (minified)
  → streamed response → React chat panel
  → /api/suggestions: Haiku generates 3 follow-up questions (structured output)
```

### Forecast (planned)
```
"Generate Forecast" click
  → /api/forecast (POST): loads all US + India returns
  → forecaster.ts: builds prompt with full multi-year history
  → Claude Sonnet: returns ForecastResponse JSON (tool_use for schema enforcement)
  → db.ts: upsert to SQLite forecasts table (cache)
  → ForecastView.tsx: renders assumptions, action items, bracket bar, risk flags

Subsequent page loads
  → /api/forecast (GET): returns cached forecast from SQLite (no Claude call)
  → "Regenerate" button: POST again, overwrites cache
```

---

## Storage

| What | Where | Format |
|------|-------|--------|
| US tax returns | `.tax-returns.json` | JSON array, Zod-validated |
| India tax returns | `.india-tax-returns.json` | JSON keyed by FY, Zod-validated |
| Chat history | localStorage | Per-session, browser-only |
| Forecast cache | `data/taxlens.db` (planned) | SQLite via `bun:sqlite` |
| API key | `.env` (ANTHROPIC_API_KEY) | Never committed |

`.tax-returns.json` and `.india-tax-returns.json` are the source of truth. They are never replaced by the forecast or SQLite layers — those are additive.

---

## Frontend

```
src/App.tsx                     main layout + state (country, selectedYear, nav)
src/components/
  Chat.tsx                      floating chat panel (resizable, right side)
  SummaryTable.tsx              US all-years table
  SummaryCharts.tsx             US multi-year charts (recharts)
  SummaryReceiptView.tsx        US summary receipt style
  ReceiptView.tsx               US single-year detail
  YearCharts.tsx                US single-year charts
  IndiaSummaryView.tsx          India all-years view
  IndiaSummaryCharts.tsx        India charts
  IndiaReceiptView.tsx          India single-year detail
  IndiaYearCharts.tsx           India single-year charts
  ForecastView.tsx              [planned] forecast page
  BracketBar.tsx                [planned] bracket position bar
  AssumptionsCard.tsx           [planned] AI assumptions
  ActionItemsCard.tsx           [planned] action items
  RiskFlags.tsx                 [planned] risk flag list
  IndiaRegimeCard.tsx           [planned] old vs new regime
```

Navigation: currently top header + horizontal year tabs. Planned: left sidebar (Phase 1 of forecast spec).

---

## Models

| Use | Model | Why |
|-----|-------|-----|
| US return parsing | claude-sonnet-4-6 | Two-pass, needs accuracy |
| India ITR form detection | claude-haiku-4-5 | Fast, cheap, binary decision |
| India ITR extraction | claude-sonnet-4-6 | Two-pass for ITR-2 accuracy |
| Chat | claude-sonnet-4-6 | Quality responses, year-aware |
| Follow-up suggestions | claude-haiku-4-5 | Fast, structured output |
| Forecast generation | claude-sonnet-4-6 | Multi-year reasoning, structured output |

---

## Testing

Test files live alongside source (`src/lib/parser.test.ts`) or in `tests/` for integration.

```
Unit tests (bun test):
  src/lib/format.test.ts
  src/lib/tax-calculations.test.ts
  src/lib/summary.test.ts
  src/lib/classifier.test.ts
  src/lib/india-parser.test.ts
  src/lib/pdf-utils.test.ts
  src/lib/time-units.test.ts
  src/App.test.ts

Integration tests (tests/):
  [to be added per feature — see FORECAST_SPEC.md]
```

Run: `bun test`
Type check: `bunx tsc --noEmit`
Lint: `bun run lint`

---

## Key design decisions

**Why flat JSON instead of DB for returns?**
Simple, portable, zero setup. Tax returns are append-only (one per year) and always loaded in full. No query complexity. SQLite is additive for forecast caching only — returns stay as JSON.

**Why two-pass parsing?**
Single-pass Claude calls on complex multi-schedule PDFs (especially ITR-2 with STCG/LTCG schedules) miss fields. Two passes — first extract, then verify/fill gaps — significantly improves accuracy.

**Why reconcile() post-parse?**
Claude reliably missed `federal.refundOrOwed` in real data (caught an $18,682 omission in 2024). Deterministic recomputation catches AI errors without re-calling the API.

**Why minify JSON in chat system prompt?**
Context window efficiency. Full return JSON with whitespace hit token limits; minified passes the same data at ~60% the cost.

**Why proactive token budget in India parser?**
Indian ITRs with full capital gains schedules can hit 429 rate limits on Haiku. A 60s sliding window on `response.usage.input_tokens` throttles automatically without user-visible errors.
