import Anthropic from "@anthropic-ai/sdk";

import type { CountryServerPlugin } from "./country-registry";
import type { ForecastProfile } from "./forecast-profile";

export type ForecastResponse = {
  projectedYear: number;

  taxLiability: { value: number; low: number; high: number };
  effectiveRate: { value: number; low: number; high: number };
  estimatedOutcome: { value: number; low: number; high: number; label: "refund" | "owed" };

  // Only present for US filers; omitted when the user has India returns only.
  bracket?: {
    rate: number;
    floor: number;
    ceiling: number;
    projectedIncome: number;
    headroom: number;
  };

  assumptions: Array<{
    icon: string;
    label: string;
    value: string;
    reasoning: string;
    confidence: "high" | "medium" | "low";
  }>;

  actionItems: Array<{
    title: string;
    description: string;
    estimatedSaving: string;
    sourceYear?: number;
    timing?: string;
    // US: retirement, withholding. India: investments, regime_choice, advance_tax.
    // capital_gains and deductions are common to both.
    category:
      | "retirement"
      | "capital_gains"
      | "deductions"
      | "withholding"
      | "investments"
      | "regime_choice"
      | "advance_tax";
  }>;

  riskFlags: Array<{
    severity: "high" | "medium";
    description: string;
  }>;

  india?: {
    regimeRecommendation: "old" | "new";
    oldRegimeTax: number;
    newRegimeTax: number;
    savingUnderRecommended: number;
    reasoning: string;
  };

  generatedAt: string;
};

function fmt(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

function buildProfileSection(profile: ForecastProfile, projectedYear: number): string[] {
  const lines: string[] = [
    `## Known ${projectedYear} Inputs (provided by user — use these exactly, do not re-estimate)`,
  ];

  // Income
  const income: string[] = [];
  if (profile.salary1 != null) income.push(`- Your base salary: ${fmt(profile.salary1)}`);
  if (profile.salary2 != null) income.push(`- Spouse base salary: ${fmt(profile.salary2)}`);
  if (profile.bonusLow1 != null || profile.bonusHigh1 != null) {
    const lo = profile.bonusLow1 ?? 0;
    const hi = profile.bonusHigh1 ?? lo;
    income.push(`- Your expected bonus: ${lo === hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`}`);
  }
  if (profile.bonusLow2 != null || profile.bonusHigh2 != null) {
    const lo = profile.bonusLow2 ?? 0;
    const hi = profile.bonusHigh2 ?? lo;
    income.push(`- Spouse expected bonus: ${lo === hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`}`);
  }
  if (profile.rsu != null) income.push(`- RSU / equity vesting: ${fmt(profile.rsu)}`);
  if (income.length > 0) lines.push("", "Income:", ...income);

  // Retirement
  const limit401k = projectedYear >= 2025 ? 23500 : 23000;
  const retirement: string[] = [];
  if (profile.k401_1 != null) {
    const maxed = profile.k401_1 >= limit401k;
    retirement.push(
      `- Your traditional 401(k): ${fmt(profile.k401_1)}/year${maxed ? " [maxed]" : ""}`,
    );
  }
  if (profile.k401_2 != null) {
    const maxed = profile.k401_2 >= limit401k;
    retirement.push(
      `- Spouse traditional 401(k): ${fmt(profile.k401_2)}/year${maxed ? " [maxed]" : ""}`,
    );
  }
  if (profile.backdoorRoth != null) {
    const desc =
      profile.backdoorRoth === "both"
        ? "done for both spouses ($7,000 each)"
        : profile.backdoorRoth === "one"
          ? "done for one spouse ($7,000)"
          : "not done this year";
    retirement.push(`- Backdoor Roth IRA: ${desc}`);
  }
  if (retirement.length > 0) lines.push("", "Retirement:", ...retirement);

  // Withholding
  if (profile.ytdWithholding != null) {
    const month = profile.ytdMonth ?? 12;
    const annualized = Math.round((profile.ytdWithholding / month) * 12);
    lines.push(
      "",
      "Withholding:",
      `- YTD federal withholding as of month ${month}: ${fmt(profile.ytdWithholding)}` +
        (month < 12 ? ` (annualized pace: ~${fmt(annualized)}/year)` : " (full year)"),
    );
  }

  // Capital events
  if (profile.capitalGains != null) {
    const sign = profile.capitalGains >= 0 ? "+" : "";
    lines.push(
      "",
      "Capital events:",
      `- Expected capital gain/loss: ${sign}${fmt(Math.abs(profile.capitalGains))}${profile.capitalGains < 0 ? " loss" : " gain"}`,
    );
  }

  // Constraints for Claude
  const constraints: string[] = [
    "- Use the above figures as the basis for your income projection — do NOT re-estimate anything listed",
    "- Derive taxable income from: (salary1 + salary2 + bonuses + RSU) − (401k contributions) − standard deduction",
  ];
  const k401Maxed =
    (profile.k401_1 != null && profile.k401_1 >= limit401k) ||
    (profile.k401_2 != null && profile.k401_2 >= limit401k);
  if (k401Maxed)
    constraints.push("- Do NOT suggest maxing 401(k) — it is already maxed per the inputs above");
  else if (profile.k401_1 != null || profile.k401_2 != null)
    constraints.push("- 401(k) contribution amounts are known — do not suggest a different amount");
  if (profile.backdoorRoth === "both" || profile.backdoorRoth === "one")
    constraints.push("- Do NOT suggest backdoor Roth IRA — it is already being done");
  if (profile.ytdWithholding != null)
    constraints.push(
      "- Use the provided withholding figure (not historical trend) for the estimated outcome calculation",
    );
  const hasBonusRange =
    (profile.bonusLow1 != null &&
      profile.bonusHigh1 != null &&
      profile.bonusLow1 !== profile.bonusHigh1) ||
    (profile.bonusLow2 != null &&
      profile.bonusHigh2 != null &&
      profile.bonusLow2 !== profile.bonusHigh2);
  if (hasBonusRange)
    constraints.push(
      "- Use the bonus range to compute low/high bounds on taxLiability and estimatedOutcome",
    );
  constraints.push('- Mark any assumption derived from user-provided inputs as confidence: "high"');

  lines.push("", "IMPORTANT:", ...constraints);
  return lines;
}

export function buildForecastPrompt(
  allReturns: Record<string, Record<number, unknown>>,
  activePlugins: CountryServerPlugin[],
  profile?: ForecastProfile,
): string {
  const pluginsWithData = activePlugins.filter(
    (p) => Object.keys(allReturns[p.code] ?? {}).length > 0,
  );

  // Precompute sorted years per plugin — reused for projected year, history, and instructions
  const pluginYears = pluginsWithData.map((p) =>
    Object.keys(allReturns[p.code] ?? {})
      .map(Number)
      .sort((a, b) => a - b),
  );

  // Projected year = max year key across all countries + 1
  const allYears = pluginYears.flat();
  const projectedYear = allYears.length > 0 ? Math.max(...allYears) + 1 : new Date().getFullYear();

  const hasUs = pluginsWithData.some((p) => p.code === "us");
  const primaryPlugin = pluginsWithData[0]!;
  const primaryProjected = Math.max(...pluginYears[0]!) + 1;
  const currencyExample = primaryPlugin.currency === "₹" ? "₹28,000" : "$1,200";
  const valueExample = primaryPlugin.currency === "₹" ? "+5% or ₹12,00,000" : "+5% or $280,000";

  // Action item categories are country-specific to avoid Claude inferring US concepts for India
  const actionCategories = hasUs
    ? `"retirement" | "capital_gains" | "deductions" | "withholding"`
    : `"investments" | "capital_gains" | "deductions" | "regime_choice" | "advance_tax"`;

  // Build JSON schema for Claude — core fields + per-country extensions
  const extensionSnippets = pluginsWithData
    .map((p) => p.forecast?.schemaSnippet(projectedYear))
    .filter(Boolean)
    .map((s) => `  ${s}`)
    .join(",\n");

  const schemaDoc = `{
  "projectedYear": ${projectedYear},
  "taxLiability": { "value": number, "low": number, "high": number },
  "effectiveRate": { "value": number, "low": number, "high": number },
  "estimatedOutcome": { "value": number, "low": number, "high": number, "label": "refund" | "owed" },
${extensionSnippets ? extensionSnippets + ",\n" : ""}  "assumptions": [
    {
      "icon": string (single emoji),
      "label": string (short, e.g. "Salary growth"),
      "value": string (e.g. "${valueExample}"),
      "reasoning": string (1–2 sentences explaining why),
      "confidence": "high" | "medium" | "low"
    }
  ],
  "actionItems": [
    {
      "title": string,
      "description": string,
      "estimatedSaving": string (e.g. "${currencyExample}"),
      "sourceYear": number (optional — year this insight was derived from),
      "timing": string (optional — e.g. "Before Mar 31" or "Q3"),
      "category": ${actionCategories}
    }
  ],
  "riskFlags": [
    { "severity": "high" | "medium", "description": string }
  ],
  "generatedAt": "${new Date().toISOString()}"
}`;

  const parts: string[] = [
    `You are a tax planning analyst. Analyze the user's full tax history and produce a structured forecast for ${projectedYear}.`,
  ];

  // Per-country: tax history + constants
  for (let i = 0; i < pluginsWithData.length; i++) {
    const plugin = pluginsWithData[i]!;
    const returns = allReturns[plugin.code] ?? {};
    const years = pluginYears[i]!;
    const summaries = years.map((y) => plugin.buildYearSummary(returns[y]));
    parts.push("", `## ${plugin.name} Tax History`, JSON.stringify(summaries, null, 2));

    const pluginProjectedYear = Math.max(...years) + 1;
    const constants = plugin.constants?.get(pluginProjectedYear);
    if (constants) {
      parts.push("", plugin.constants!.format(constants));
    } else if (plugin.constants) {
      parts.push(
        "",
        `## Note on ${plugin.yearLabel(pluginProjectedYear)} tax constants`,
        `No verified tax constants available for ${plugin.yearLabel(pluginProjectedYear)} in this app yet. Use your best knowledge but flag any figures as unverified in your assumptions.`,
      );
    }
  }

  // Profile section (US only — India inputs differ entirely)
  if (profile && hasUs) {
    const profileLines = buildProfileSection(profile, projectedYear);
    parts.push(...profileLines);
  }

  // Instructions
  parts.push(
    "",
    "## Instructions",
    `- Project ${primaryPlugin.yearLabel(primaryProjected)} ${primaryPlugin.name} taxes based on observed trends (income growth, deduction patterns, capital gains variance)`,
    "- Surface 3–5 action items — mix of forward-looking optimizations and retroactive insights from past years that are still actionable",
    "- For each assumption, state your reasoning and confidence level honestly",
    "- For risk flags: only flag genuine uncertainties (capital gains variance, bonus likelihood, rate changes). Max 3 flags.",
  );

  for (const plugin of pluginsWithData) {
    if (plugin.forecast?.promptInstruction) {
      parts.push(`- ${plugin.forecast.promptInstruction}`);
    }
  }

  parts.push(
    hasUs
      ? "- taxLiability = projected combined US federal + state tax owed (before withholding)"
      : "- taxLiability = projected total tax liability in local currency (INR)",
    "- estimatedOutcome = refund (positive value) or owed (negative value) at filing time, based on projected withholding/advance-tax trends",
    !hasUs ? "- bracket: omit this field entirely — there are no US returns" : "",
    !hasUs
      ? "- Do NOT mention 401k, IRA, FICA, W-2 withholding, federal/state brackets, or any US-specific tax concepts. All advice must be India-specific."
      : "",
    "- Return ONLY valid JSON. No markdown, no explanation outside the JSON.",
    "",
    "## Required output schema",
    schemaDoc,
  );

  return parts.filter((p) => p !== null).join("\n");
}

// Strips markdown code fences if Claude wraps its response.
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1]!.trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) return text.slice(firstBrace, lastBrace + 1);
  return text.trim();
}

export function parseForecastResponse(text: string): ForecastResponse {
  const json = extractJson(text);
  const raw = JSON.parse(json) as Record<string, unknown>;

  // Validate required top-level fields
  if (typeof raw.projectedYear !== "number") throw new Error("Missing projectedYear");
  if (!raw.taxLiability || !raw.effectiveRate || !raw.estimatedOutcome) {
    throw new Error("Missing required metric fields");
  }
  if (
    !Array.isArray(raw.assumptions) ||
    !Array.isArray(raw.actionItems) ||
    !Array.isArray(raw.riskFlags)
  ) {
    throw new Error("Missing required array fields");
  }

  // Normalize confidence levels to valid enum values
  const validConfidence = new Set(["high", "medium", "low"]);
  const assumptions = (raw.assumptions as Array<Record<string, unknown>>).map((a) => ({
    icon: String(a.icon ?? "📊"),
    label: String(a.label ?? ""),
    value: String(a.value ?? ""),
    reasoning: String(a.reasoning ?? ""),
    confidence: validConfidence.has(String(a.confidence))
      ? (String(a.confidence) as "high" | "medium" | "low")
      : "medium",
  }));

  const validCategory = new Set([
    "retirement",
    "capital_gains",
    "deductions",
    "withholding",
    "investments",
    "regime_choice",
    "advance_tax",
  ]);
  const actionItems = (raw.actionItems as Array<Record<string, unknown>>).map((item) => ({
    title: String(item.title ?? ""),
    description: String(item.description ?? ""),
    estimatedSaving: String(item.estimatedSaving ?? ""),
    ...(typeof item.sourceYear === "number" ? { sourceYear: item.sourceYear } : {}),
    ...(typeof item.timing === "string" ? { timing: item.timing } : {}),
    category: validCategory.has(String(item.category))
      ? (String(item.category) as ForecastResponse["actionItems"][number]["category"])
      : "deductions",
  }));

  const validSeverity = new Set(["high", "medium"]);
  const riskFlags = (raw.riskFlags as Array<Record<string, unknown>>).map((f) => ({
    severity: validSeverity.has(String(f.severity))
      ? (String(f.severity) as "high" | "medium")
      : "medium",
    description: String(f.description ?? ""),
  }));

  const bracketRaw = raw.bracket as Record<string, unknown> | undefined;
  const outcome = raw.estimatedOutcome as Record<string, unknown>;

  // Coerce a value that Claude might return as a number or numeric string to a number
  const toNum = (v: unknown): number => {
    if (typeof v === "number") return v;
    if (typeof v === "string") return parseFloat(v.replace(/[^0-9.-]/g, "")) || 0;
    return 0;
  };

  const result: ForecastResponse = {
    projectedYear: raw.projectedYear as number,
    taxLiability: raw.taxLiability as ForecastResponse["taxLiability"],
    effectiveRate: raw.effectiveRate as ForecastResponse["effectiveRate"],
    estimatedOutcome: {
      ...(outcome as object),
      label: outcome.label === "refund" ? "refund" : "owed",
    } as ForecastResponse["estimatedOutcome"],
    ...(bracketRaw
      ? {
          bracket: {
            rate: toNum(bracketRaw.rate),
            floor: toNum(bracketRaw.floor),
            ceiling: toNum(bracketRaw.ceiling),
            projectedIncome: toNum(bracketRaw.projectedIncome),
            // Always recompute headroom — Claude sometimes miscalculates
            headroom: toNum(bracketRaw.ceiling) - toNum(bracketRaw.projectedIncome),
          },
        }
      : {}),
    assumptions,
    actionItems,
    riskFlags,
    generatedAt: typeof raw.generatedAt === "string" ? raw.generatedAt : new Date().toISOString(),
  };

  // India section: coerce amounts to numbers in case Claude returns INR strings
  if (raw.india && typeof raw.india === "object") {
    const india = raw.india as Record<string, unknown>;
    if (india.reasoning) {
      result.india = {
        regimeRecommendation: india.regimeRecommendation === "old" ? "old" : "new",
        oldRegimeTax: toNum(india.oldRegimeTax),
        newRegimeTax: toNum(india.newRegimeTax),
        savingUnderRecommended: toNum(india.savingUnderRecommended),
        reasoning: String(india.reasoning),
      };
    }
  }

  return result;
}

export async function generateForecast(
  allReturns: Record<string, Record<number, unknown>>,
  activePlugins: CountryServerPlugin[],
  apiKey: string,
  profile?: ForecastProfile,
): Promise<ForecastResponse> {
  const client = new Anthropic({ apiKey });
  const prompt = buildForecastPrompt(allReturns, activePlugins, profile);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system:
      "You are a tax planning analyst. You produce structured JSON forecasts. Return ONLY valid JSON with no markdown or explanation.",
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return parseForecastResponse(textBlock.text);
}
