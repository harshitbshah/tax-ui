# Adding Tax Constants for a New Country

Constants are hardcoded numbers sourced from authoritative government tax authorities and injected into AI prompts at call time. This ensures Claude uses verified figures rather than training-data recall.

Each country lives in its own module under `src/lib/constants/`. No shared supertype is forced across countries — tax structures differ too much to generalise usefully (US has filing statuses, India has regime choices, Canada has federal + provincial layers).

**Time estimate:** ~1–2 hours for data entry, ~30 min for wiring.

---

## Directory structure

```
src/lib/constants/
  shared.ts          ← BracketEntry (shared primitive, nothing else)
  us.ts              ← UsYearConstants, getUsConstants, formatUsConstantsForPrompt
  india.ts           ← IndiaYearConstants, getIndiaConstants, formatIndiaConstantsForPrompt  (example)
  canada.ts          ← CanadaYearConstants, getCanadaConstants, formatCanadaConstantsForPrompt (example)
  index.ts           ← re-exports all registered countries
```

---

## Step 1 — Design your YearConstants type

Each country needs a type that captures what Claude needs to give accurate tax advice. Think about:

- **Bracket variants** — US uses filing status (single/mfj/hoh). India uses regime (old/new). Canada uses province. Design the shape that matches.
- **Deduction/exemption equivalents** — standard deduction (US), Basic Personal Amount (Canada), 80C cap (India).
- **Capital gains treatment** — inclusion rate (Canada), holding period thresholds (US/India).
- **Contribution limits** — 401k/IRA (US), RRSP/TFSA (Canada), NPS/PPF (India).
- **What to set `null`** — use `null` for fields not yet confirmed for a given year (same pattern as `ltcg: null` in US entries).

Example skeleton for Canada:

```ts
// src/lib/constants/canada.ts

import type { BracketEntry } from "./shared";

export type CanadaYearConstants = {
  year: number;
  sources: string[];
  // Federal brackets apply to all provinces
  federalBrackets: BracketEntry[];
  // Basic Personal Amount — Canada's standard deduction equivalent
  basicPersonalAmount: number;
  // Capital gains inclusion rate (0.5 = 50%, 0.667 = 66.7% post-2024 change)
  capitalGainsInclusionRate: number;
  contributions: {
    rrspLimitPercent: number;  // 18% of prior-year earned income, up to the dollar cap
    rrspDollarCap: number;
    tfsaLimit: number;
  };
};
```

---

## Step 2 — Source the data

**Only use primary government sources.** Third-party summaries (Tax Foundation, tax blogs) can lag behind mid-year legislative changes and will not include amendments.

| Country | Brackets | Contribution limits | Capital gains |
|---------|----------|---------------------|---------------|
| **US** | irs.gov/filing/federal-income-tax-rates-and-brackets | irs.gov newsroom (401k/IRA limit release each November) | irs.gov/taxtopics/tc409 |
| **Canada** | canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years | canada.ca (RRSP/TFSA limits, usually November) | canada.ca/en/revenue-agency/programs/about-cra/federal-government-budgets |
| **India** | incometaxindia.gov.in (Finance Act for each assessment year) | incometaxindia.gov.in (80C/80CCD limits per Finance Act) | incometaxindia.gov.in/pages/acts/income-tax-act |

**Mark your provenance.** If numbers come from training data rather than a live source, add a comment:
```ts
// Numbers from training data — verify at: <url>
```

---

## Step 3 — Create the country module

Copy the structure from `us.ts`. Name the exported functions consistently:

| Export | Pattern |
|--------|---------|
| Constants type | `CountryYearConstants` (e.g. `CanadaYearConstants`) |
| Getter | `getCountryConstants(year: number): CountryYearConstants \| null` |
| Prompt formatter | `formatCountryConstantsForPrompt(c: CountryYearConstants): string` |
| Internal data | `COUNTRY_TAX_CONSTANTS: Record<number, CountryYearConstants>` (not exported) |

The prompt formatter should produce a compact, token-lean string — no JSON structure, just the numbers Claude needs. Look at `formatUsConstantsForPrompt` in `us.ts` for the pattern. End every formatter with:

```
Use these exact figures for all bracket math, savings calculations, and contribution advice. Do not use recalled figures from training data.
```

**How many years to backfill?** Match the earliest year of returns the app can parse for that country. If India returns go back to FY 2019-20 (assessment year 2020-21), add constants from AY 2020-21 forward.

---

## Step 4 — Register in index.ts

Add your country's exports to `src/lib/constants/index.ts`:

```ts
export {
  getCanadaConstants,
  formatCanadaConstantsForPrompt,
  type CanadaYearConstants,
} from "./canada";
```

Uncomment the stub line that's already there for your country if one exists.

---

## Step 5 — Wire into prompt builders

**Forecast** (`src/lib/forecaster.ts`):

```ts
import { getUsConstants, formatUsConstantsForPrompt, getCanadaConstants, formatCanadaConstantsForPrompt } from "./constants";

// In buildForecastPrompt(), after the existing US constants block:
const canadaConstants = getCanadaConstants(projectedYear);
if (canadaConstants) {
  parts.push("", formatCanadaConstantsForPrompt(canadaConstants));
} else {
  parts.push("", `## Note on ${projectedYear} Canada tax constants`,
    `No verified CRA constants on file for ${projectedYear}. Use best knowledge but flag figures as unverified.`);
}
```

**Insights** (`src/lib/insights.ts`): same pattern, same location in `buildInsightsPrompt()`.

---

## Step 6 — Wire into coverage badges

**`src/components/InsightsPanel.tsx`** — `ConstantsBadge` currently calls `getUsConstants`. If you're adding per-year insights for the new country, add a prop to indicate which country to check:

```tsx
const verified =
  country === "canada" ? getCanadaConstants(year) !== null : getUsConstants(year) !== null;
```

**`src/components/ForecastView.tsx`** — `ConstantsStatus` filters years by `getUsConstants`. When the forecast includes multi-country data, pass a `getConstants` function or check both:

```tsx
const verified = getUsConstants(y) !== null || getCanadaConstants(y) !== null;
```

The right approach depends on whether you want a single combined badge or per-country rows — your call.

---

## Step 7 — Annual update cadence

Add a note at the top of the country file reminding yourself when and where to update:

| Country | When | Where |
|---------|------|-------|
| US | Each October | irs.gov newsroom |
| Canada | Each November (federal budget) + provincial budgets (Feb–April) | canada.ca |
| India | Each February (Union Budget) | incometaxindia.gov.in |

---

## Checklist

- [ ] Designed `CountryYearConstants` type reflecting that country's tax structure
- [ ] Numbers sourced from authoritative government source (not third-party summaries)
- [ ] Training-data numbers flagged with comment + source URL
- [ ] All years back to earliest parseable return year added
- [ ] `getCountryConstants` and `formatCountryConstantsForPrompt` exported
- [ ] Registered in `src/lib/constants/index.ts`
- [ ] Wired into `buildForecastPrompt()` in `forecaster.ts`
- [ ] Wired into `buildInsightsPrompt()` in `insights.ts`
- [ ] Coverage badges updated in `InsightsPanel.tsx` and `ForecastView.tsx`
- [ ] `bunx tsc --noEmit` passes
- [ ] `bun run lint` passes
