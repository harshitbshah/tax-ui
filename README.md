<img width="1280" height="640" alt="tax-ui-github-og" src="https://github.com/user-attachments/assets/780f6743-669c-44e5-96fb-cc65249b5c75" />

# TaxLens

Visualize, understand, and plan your taxes. Parse US (1040) and India (ITR) returns from PDF, explore multi-year trends, and chat with your tax history using Claude.

Forked from [brianlovin/tax-ui](https://github.com/brianlovin/tax-ui).

---

## Features

### What's built
- **US returns (1040)** — parse PDFs into structured data: income, deductions, brackets, refund/owed, effective rate
- **India returns (ITR-1 / ITR-2)** — import from Indian IT portal PDFs including Java-serialized wrappers; capital gains, TDS, advance tax, YoY trends
- **Multi-year summary** — YoY charts, effective rate trend, income mix, refund history
- **By Year view** — detailed breakdown per year with charts and receipt-style layout
- **Chat with Claude** — year-aware conversation with your full tax history as context
- **Country toggle** — switch between 🇺🇸 US and 🇮🇳 India views

### Coming soon
- **AI Forecast** — Claude reasons over your full tax history to project next year's liability, surface action items, and carry forward lessons from past years (no manual input needed)
- **Retroactive insights** — per-year "what could you have done differently" analysis
- **Sidebar navigation** — layout refactor for cleaner navigation

See [`docs/FORECAST_SPEC.md`](docs/FORECAST_SPEC.md) for the full roadmap.

---

## Get Started

### 1. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. Get an Anthropic API Key

Get a key from [console.anthropic.com](https://console.anthropic.com/settings/keys). Add it to `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run

```bash
git clone https://github.com/harshitbshah/tax-ui
cd tax-ui
bun install
bun run dev
```

Open [localhost:3005](http://localhost:3005).

---

## Importing Returns

### US returns
Upload PDFs directly in the browser — one PDF per tax year.

### India returns (ITR)
```bash
ANTHROPIC_API_KEY=sk-... bun run scripts/import-india.ts path/to/itr.pdf
```

Supports ITR-1 (Sahaj) and ITR-2. Handles PDFs from the Indian IT portal including Java-serialized wrappers.

---

## Development

```bash
bun run dev          # dev server with HMR on localhost:3005
bun test             # unit + integration tests
bunx tsc --noEmit    # type check
bun run lint         # ESLint + Prettier
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a full architecture walkthrough.

---

## Privacy & Security

All data stays local. Tax return PDFs are sent to Anthropic's API (your key) for parsing and then stored on your machine. Nothing goes to any other server.

- `.tax-returns.json` and `.india-tax-returns.json` are gitignored — never committed
- API key stays in `.env` — never committed
- No analytics, no telemetry, no cloud storage

Anthropic's commercial terms prohibit training models on API customer data. See [Anthropic's Privacy Policy](https://www.anthropic.com/legal/privacy).

<details>
<summary>Security audit prompt</summary>

```
I want you to perform a security and privacy audit of TaxLens, an open source tax return parser.

Repository: https://github.com/harshitbshah/tax-ui

Please analyze the source code and verify:

1. DATA HANDLING
   - Tax return PDFs are sent directly to Anthropic's API for parsing
   - No data is sent to any other third-party servers
   - Parsed data is stored locally only

2. NETWORK ACTIVITY
   - Identify all network requests in the codebase
   - Verify the only external calls are to Anthropic's API
   - Check for any hidden data collection or tracking

3. API KEY SECURITY
   - Verify API keys are stored locally and not transmitted elsewhere
   - Check that keys are not logged or exposed

Key files to review:
- src/index.ts (Bun server and API routes)
- src/lib/parser.ts (US return parsing)
- src/lib/india-parser.ts (India ITR parsing)
- src/lib/storage.ts (local storage — US)
- src/lib/india-storage.ts (local storage — India)
- src/lib/pdf-utils.ts (PDF unwrapping)
- src/App.tsx (React frontend)
```

</details>

---

## Requirements

- [Bun](https://bun.sh) v1.0+
- Anthropic API key
- Your own tax return PDFs
