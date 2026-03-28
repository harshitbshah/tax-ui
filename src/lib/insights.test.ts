import { describe, expect, test } from "bun:test";

import { buildInsightsPrompt, parseInsightsResponse } from "./insights";
import type { IndianTaxReturn, TaxReturn } from "./schema";

// Minimal fixtures
const makeReturn = (year: number, overrides: Partial<TaxReturn> = {}): TaxReturn =>
  ({
    year,
    filingStatus: "single",
    income: {
      total: 120000,
      items: [{ label: "Wages", amount: 120000 }],
    },
    federal: {
      agi: 115000,
      taxableIncome: 100000,
      tax: 18000,
      deductions: [{ label: "Standard deduction", amount: 15000 }],
      additionalTaxes: [],
      credits: [],
      payments: [{ label: "Withholding", amount: 20000 }],
      refundOrOwed: 2000,
    },
    states: [
      {
        name: "CA",
        agi: 115000,
        taxableIncome: 100000,
        tax: 6000,
        deductions: [],
        adjustments: [],
        payments: [{ label: "Withholding", amount: 6500 }],
        refundOrOwed: 500,
      },
    ],
    dependents: [],
    rates: { federal: { marginal: 22, effective: 15.0 } },
    summary: {
      federalAmount: 2000,
      stateAmounts: [{ state: "CA", amount: 500 }],
      netPosition: 2500,
    },
    ...overrides,
  }) as TaxReturn;

const makeIndiaReturn = (fy: number): IndianTaxReturn =>
  ({
    financialYear: fy,
    assessmentYear: String(fy + 1),
    itrForm: "ITR-1",
    name: "Test User",
    residencyStatus: "resident",
    income: {
      salary: [{ label: "Salary", amount: 1200000 }],
      houseProperty: [],
      capitalGains: { stcg: { items: [], total: 0 }, ltcg: { items: [], total: 0 } },
      otherSources: [],
      grossTotal: 1200000,
    },
    deductions: [{ label: "80C", amount: 150000 }],
    taxableIncome: 1000000,
    tax: {
      grossTax: 120000,
      surcharge: 0,
      educationCess: 4800,
      totalTaxLiability: 124800,
      tds: [{ label: "TDS", amount: 130000 }],
      advanceTax: [],
      selfAssessmentTax: [],
      totalTaxPaid: 130000,
      refundOrDue: 5200,
    },
    summary: {
      grossTotalIncome: 1200000,
      taxableIncome: 1000000,
      totalTaxPaid: 130000,
      refundOrDue: 5200,
    },
  }) as IndianTaxReturn;

const usReturns: Record<number, TaxReturn> = {
  2022: makeReturn(2022),
  2023: makeReturn(2023, {
    income: { total: 130000, items: [{ label: "Wages", amount: 130000 }] },
  }),
};

describe("buildInsightsPrompt", () => {
  test("includes the selected year in the prompt", () => {
    const prompt = buildInsightsPrompt(2023, usReturns, {});
    expect(prompt).toContain("2023");
  });

  test("includes the year's income data", () => {
    const prompt = buildInsightsPrompt(2023, usReturns, {});
    expect(prompt).toContain("130000");
  });

  test("includes other years as context summaries", () => {
    const prompt = buildInsightsPrompt(2023, usReturns, {});
    expect(prompt).toContain("2022");
    // Other years section should not include full detail
    expect(prompt).toContain("Other years");
  });

  test("does not include selected year in other years summary", () => {
    const prompt = buildInsightsPrompt(2023, usReturns, {});
    const otherSection = prompt.split("Other years")[1] ?? "";
    expect(otherSection).not.toContain('"year": 2023');
  });

  test("includes India return when matching financial year exists", () => {
    const indiaReturns = { 2022: makeIndiaReturn(2022) };
    // India FY 2022-23 matches US calendar year 2023 (financialYear === year - 1)
    const prompt = buildInsightsPrompt(2023, usReturns, indiaReturns);
    expect(prompt).toContain("India ITR");
    expect(prompt).toContain("1200000");
  });

  test("omits India section when no matching return exists", () => {
    const indiaReturns = { 2019: makeIndiaReturn(2019) };
    const prompt = buildInsightsPrompt(2023, usReturns, indiaReturns);
    expect(prompt).not.toContain("India ITR");
  });

  test("throws when no US return exists for selected year", () => {
    expect(() => buildInsightsPrompt(2025, usReturns, {})).toThrow("No US return for year 2025");
  });

  test("includes schema instructions requesting JSON array", () => {
    const prompt = buildInsightsPrompt(2023, usReturns, {});
    expect(prompt).toContain("JSON array");
    expect(prompt).toContain('"category"');
  });
});

describe("parseInsightsResponse", () => {
  const validJson = JSON.stringify([
    {
      title: "Maximize 401k",
      description:
        "You were $8k into the 22% bracket. Contributing $8k to 401k would have dropped you to 12%.",
      estimatedSaving: "$1,760",
      category: "retirement",
    },
    {
      title: "Capital gains harvesting",
      description:
        "You had $12k short-term gains with no losses. Harvesting $5k in losses would have saved $1,100.",
      estimatedSaving: "$1,100",
      category: "capital_gains",
    },
  ]);

  test("parses valid JSON array", () => {
    const items = parseInsightsResponse(validJson);
    expect(items).toHaveLength(2);
    expect(items[0]!.title).toBe("Maximize 401k");
    expect(items[0]!.category).toBe("retirement");
    expect(items[0]!.estimatedSaving).toBe("$1,760");
  });

  test("strips markdown code fences", () => {
    const fenced = "```json\n" + validJson + "\n```";
    const items = parseInsightsResponse(fenced);
    expect(items).toHaveLength(2);
  });

  test("normalizes unknown category to 'deductions'", () => {
    const json = JSON.stringify([{ title: "A", description: "B", category: "unknown_cat" }]);
    const items = parseInsightsResponse(json);
    expect(items[0]!.category).toBe("deductions");
  });

  test("omits estimatedSaving when not present", () => {
    const json = JSON.stringify([{ title: "A", description: "B", category: "withholding" }]);
    const items = parseInsightsResponse(json);
    expect(items[0]!.estimatedSaving).toBeUndefined();
  });

  test("omits estimatedSaving when empty string", () => {
    const json = JSON.stringify([
      { title: "A", description: "B", category: "deductions", estimatedSaving: "" },
    ]);
    const items = parseInsightsResponse(json);
    expect(items[0]!.estimatedSaving).toBeUndefined();
  });

  test("throws on invalid JSON", () => {
    expect(() => parseInsightsResponse("not json")).toThrow();
  });

  test("throws when response is an object not an array", () => {
    expect(() => parseInsightsResponse('{"title": "x"}')).toThrow("Expected JSON array");
  });

  test("extracts JSON array from surrounding text", () => {
    const text = 'Here are the insights:\n[{"title":"T","description":"D","category":"india"}]';
    const items = parseInsightsResponse(text);
    expect(items).toHaveLength(1);
    expect(items[0]!.category).toBe("india");
  });
});
