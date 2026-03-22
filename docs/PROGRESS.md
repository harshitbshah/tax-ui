# Progress Log

One entry per checkpoint. Most recent first.

---

## 2026-03-21

**Done:**
- **India tax support** — full end-to-end pipeline for Indian ITR returns
  - `src/lib/schema.ts`: added `itrForm` field (`"ITR-1" | "ITR-2" | "ITR-3" | "ITR-4"`)
  - `src/lib/pdf-utils.ts`: `unwrapIfJavaSerialized()` — extracts real PDF from Java object serialization wrapper (Indian IT portal wraps PDFs in Java serialization with magic bytes `aced0005`; actual PDF starts at `%PDF` offset inside)
  - `src/lib/india-parser.ts`: two-pass Sonnet parsing for ITR-2, single-pass for ITR-1; Haiku-based form type detection on first page; proactive token budget (sliding window over actual `response.usage` tokens, 60s window) to avoid 429s; `TAIL_PAGES` reduced 15→12
  - `src/lib/india-storage.ts` + `src/lib/prompt.ts`: ITR-1 prompt (no capital gains, correct 3% cess for AY ≤2018-19); ITR-2 prompts updated with dynamic cess rate
  - `scripts/import-india.ts`: uses `unwrapIfJavaSerialized`; parses and saves to `.india-tax-returns.json`
- **India UI** — `App.tsx` + `MainPanel.tsx` country toggle (🇺🇸 US / 🇮🇳 India pills), India year and summary views with chart/table mode toggles
  - `src/components/IndiaReceiptView.tsx`: dynamic form label, dynamic cess label
  - `src/components/IndiaSummaryView.tsx`: ITR-1 badge, "—" for CG on ITR-1 rows, YoY `+X.X%`/`-X.X%` badges (green/red) on Gross Income, STCG, LTCG, Tax Liability (inverted polarity), compact INR formatting with hover tooltips
  - `src/components/IndiaYearCharts.tsx`: income breakdown donut + tax summary bar
  - `src/components/IndiaSummaryCharts.tsx`: Gross Income + Tax Liability grouped bars, Capital Gains trend (ITR-2 years only), Effective Tax Rate line, Refund/Due bar with green/red cells
- **`formatINRCompact`** in `src/lib/format.ts`: compact INR (sub-1L → full, ≥1L → "₹X.XXL", ≥1Cr → "₹X.XXCr"); fixed sign-for-zero bug
- **Tests**: 72 pass (up from 57 before this session)
  - `src/lib/pdf-utils.test.ts` (4 tests): `unwrapIfJavaSerialized` covering real PDF, Java-wrapped, no-PDF-inside, trailing-data
  - `src/lib/india-parser.test.ts` (expanded to 10): `reconcileIndianReturn` covering tax paid recomputation, positive/negative refund, summary sync, preserves AI totalTaxPaid when arrays empty, ITR-1 capital gains zero
  - `src/lib/format.test.ts` (5 new): `formatINRCompact` covering sub-1L, lakhs, crores, negatives, showSign

**Decisions:**
- Java-serialized PDF unwrapping: scan for `%PDF` magic bytes inside Java-serialized blob and `%%EOF` at end — robust even when byte offset varies across years
- ITR-1 uses single-pass Sonnet (not two-pass): forms are 2-5 pages; sending entire doc at once is cheaper and avoids coordination overhead
- Haiku for form type detection: cheap (1 page, simple classification), avoids burning Sonnet quota on a routing decision
- Proactive token budget uses actual `response.usage` (not estimates) in a 60-second sliding window to prevent 429s without over-sleeping
- `TAIL_PAGES` 15→12: tail is Part B-TTI + TDS schedules, 12 pages covers all observed formats; cuts ~2.25K tokens per call
- YoY badges skip comparison if prior year was ITR-1 (no STCG/LTCG data to compare against)
- `formatINRCompact` always uses `toFixed(2)` for lakhs (not conditional on ≥10L) — ₹19.7L vs ₹19.68L looked like a bug at a glance

**Known gaps:**
- ITR-1 detection relies on Haiku reading first page — very old scanned PDFs (2012) may produce OCR artifacts; tested successfully on 2012-2017
- Effective Tax Rate chart uses `taxableIncome`; for ITR-1 this may be 0 (field absent in older forms), showing 0% rate — cosmetically misleading but not wrong
- Pre-existing lint warnings (8) not addressed

**Next:**
- Investigate extraction prompt to prevent `refundOrDue=0` class of AI error at source (identified in 2024 return, manually patched)
- Consider adding `taxableIncome` to `INDIA_ITR1_PROMPT` so effective rate chart works for ITR-1 years
- Continue feature backlog in `docs/FEATURES.md`

---

## 2026-03-20

**Done:**
- Added `reconcile()` to `parser.ts` — post-parse validation that recomputes `federal.refundOrOwed` (overrides if diff >$1,000, warns only if <$1,000 to avoid Schedule 2 false positives), recomputes all summary fields from canonical sources, and sanity-checks effective rate + AGI vs income.total proximity
- Manually patched `.tax-returns.json` for 2021 (NJ refundOrOwed 0 → -670) and 2024 (federal refundOrOwed 0 → -18,682; NJ refundOrOwed 2890 → -2890)
- Fixed `SummaryCharts.tsx` chart bugs: tooltip key labels showing numbers instead of names, refund/owed bar rendering black
- Added `scripts/validate-returns.ts` — runs `reconcile()` against all stored returns and prints warnings
- Added `scripts/load-from-drive.ts` — bulk-loads PDFs from `~/gdrive` Google Drive mount
- Added `docs/PRFAQ.md` — product narrative for TaxLens vision
- Established project conventions in `CLAUDE.md`: Code Style, Testing, Security, Checkpoint ritual

**Decisions:**
- `$1,000` threshold for federal override: real AI miss was $18,682; Schedule 2 double-counting is ~$100-200 — threshold cleanly separates the two cases
- `income.total` NOT recomputed from `sum(items)` — items array includes display-only entries (qualified dividends, non-taxable pension rollover) that are not part of 1040 line 9
- `taxableIncome` NOT recomputed from `agi - deductions` — some deductions are above-the-line (already baked into AGI), double-subtracting gives wrong result
- State `refundOrOwed` NOT validated by formula — `adjustments` mixes credits (reduce tax directly) and deductions (reduce taxable income); any formula produces only false positives
- "Why" comments allowed in source; "what" comments are not — narrative decisions belong in CLAUDE.md/docs

**Known gaps:**
- `reconcile()` has no unit tests yet — highest priority next
- `.tax-returns.json` manual patches (2021 NJ, 2024 federal) will be lost if PDFs are re-parsed; root cause is in the extraction prompt, not yet fixed
- Pre-existing lint warnings in `src/index.ts` and `src/lib/selector.ts` not addressed

**Next:**
- Write unit tests for `reconcile()` covering: large federal diff override, small diff warn-only, summary recomputation, effective rate sanity check
- Investigate extraction prompt to prevent the 2024 federal refundOrOwed=0 class of error at source
- Continue feature backlog in `docs/FEATURES.md`
