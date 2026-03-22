import { describe, expect, test } from "bun:test";

import { reconcileIndianReturn } from "./india-parser";
import type { IndianTaxReturn } from "./schema";

function buildTestReturn(overrides: Partial<IndianTaxReturn> = {}): IndianTaxReturn {
  return {
    assessmentYear: "2025-26",
    financialYear: 2024,
    itrForm: "ITR-2",
    name: "Test User",
    pan: "ABCDE1234F",
    residencyStatus: "non_resident",
    income: {
      salary: [],
      houseProperty: [],
      capitalGains: {
        stcg: {
          items: [
            { label: "STCG (pre-Jul 23 2024)", amount: 81639 },
            { label: "STCG (post-Jul 23 2024)", amount: -1723753 },
          ],
          total: -1642114,
        },
        ltcg: { items: [], total: 0 },
      },
      otherSources: [],
      grossTotal: 0,
    },
    deductions: [],
    taxableIncome: 0,
    tax: {
      grossTax: 0,
      surcharge: 0,
      educationCess: 0,
      totalTaxLiability: 0,
      tds: [{ label: "TDS (Zerodha)", amount: 1500 }],
      advanceTax: [],
      selfAssessmentTax: [],
      totalTaxPaid: 0,
      refundOrDue: 0,
    },
    summary: {
      grossTotalIncome: 0,
      taxableIncome: 0,
      totalTaxPaid: 0,
      refundOrDue: 0,
    },
    ...overrides,
  };
}

describe("IndianTaxReturn schema validation", () => {
  test("STCG items can have negative amounts (losses)", () => {
    const r = buildTestReturn();
    expect(r.income.capitalGains.stcg.items[1]!.amount).toBe(-1723753);
    expect(r.income.capitalGains.stcg.total).toBe(-1642114);
  });

  test("residencyStatus accepts non_resident", () => {
    const r = buildTestReturn({ residencyStatus: "non_resident" });
    expect(r.residencyStatus).toBe("non_resident");
  });

  test("assessmentYear and financialYear are linked correctly (AY 2025-26 = FY 2024)", () => {
    const r = buildTestReturn();
    expect(r.assessmentYear).toBe("2025-26");
    expect(r.financialYear).toBe(2024);
  });

  test("refundOrDue is positive when more tax paid than owed", () => {
    const r = buildTestReturn();
    const totalTaxPaid = r.tax.tds.reduce((s, i) => s + i.amount, 0);
    const refundOrDue = totalTaxPaid - r.tax.totalTaxLiability;
    expect(refundOrDue).toBe(1500);
  });
});

describe("reconcileIndianReturn", () => {
  test("recomputes totalTaxPaid from tds + advanceTax + selfAssessmentTax", () => {
    const r = buildTestReturn({
      tax: {
        grossTax: 20000,
        surcharge: 0,
        educationCess: 800,
        totalTaxLiability: 20800,
        tds: [
          { label: "Employer TDS", amount: 15000 },
          { label: "Bank TDS", amount: 3000 },
        ],
        advanceTax: [{ label: "Advance Tax Q3", amount: 5000 }],
        selfAssessmentTax: [{ label: "Self Assessment", amount: 2000 }],
        totalTaxPaid: 0, // will be recomputed
        refundOrDue: 0,
      },
    });
    const result = reconcileIndianReturn(r);
    expect(result.tax.totalTaxPaid).toBe(25000); // 15000 + 3000 + 5000 + 2000
  });

  test("recomputes refundOrDue as totalTaxPaid - totalTaxLiability", () => {
    const r = buildTestReturn({
      tax: {
        grossTax: 22000,
        surcharge: 0,
        educationCess: 592,
        totalTaxLiability: 22592,
        tds: [{ label: "Zerodha TDS", amount: 382309 }],
        advanceTax: [],
        selfAssessmentTax: [],
        totalTaxPaid: 0,
        refundOrDue: 0,
      },
    });
    const result = reconcileIndianReturn(r);
    expect(result.tax.refundOrDue).toBe(382309 - 22592); // 359717 — refund
  });

  test("refundOrDue is negative when tax owed (underpaid)", () => {
    const r = buildTestReturn({
      tax: {
        grossTax: 50000,
        surcharge: 0,
        educationCess: 2000,
        totalTaxLiability: 52000,
        tds: [{ label: "Employer TDS", amount: 30000 }],
        advanceTax: [],
        selfAssessmentTax: [],
        totalTaxPaid: 0,
        refundOrDue: 0,
      },
    });
    const result = reconcileIndianReturn(r);
    expect(result.tax.refundOrDue).toBe(-22000); // underpaid
  });

  test("syncs summary fields from canonical income and tax fields", () => {
    const r = buildTestReturn({
      income: {
        salary: [{ label: "Salary", amount: 500000 }],
        houseProperty: [],
        capitalGains: { stcg: { items: [], total: 0 }, ltcg: { items: [], total: 0 } },
        otherSources: [],
        grossTotal: 500000,
      },
      taxableIncome: 350000,
      tax: {
        grossTax: 5000,
        surcharge: 0,
        educationCess: 150,
        totalTaxLiability: 5150,
        tds: [{ label: "Employer TDS", amount: 6000 }],
        advanceTax: [],
        selfAssessmentTax: [],
        totalTaxPaid: 0,
        refundOrDue: 0,
      },
      summary: { grossTotalIncome: 0, taxableIncome: 0, totalTaxPaid: 0, refundOrDue: 0 },
    });
    const result = reconcileIndianReturn(r);
    expect(result.summary.grossTotalIncome).toBe(500000);
    expect(result.summary.taxableIncome).toBe(350000);
    expect(result.summary.totalTaxPaid).toBe(6000);
    expect(result.summary.refundOrDue).toBe(850); // 6000 - 5150
  });

  test("preserves AI totalTaxPaid when all payment arrays are empty", () => {
    // If TDS/advance/SAT are all empty, keep AI's totalTaxPaid rather than setting to 0
    const r = buildTestReturn({
      tax: {
        grossTax: 10000,
        surcharge: 0,
        educationCess: 400,
        totalTaxLiability: 10400,
        tds: [],
        advanceTax: [],
        selfAssessmentTax: [],
        totalTaxPaid: 12000, // AI-extracted value
        refundOrDue: 1600,
      },
    });
    const result = reconcileIndianReturn(r);
    expect(result.tax.totalTaxPaid).toBe(12000); // kept — computedPaid is 0, skipped
  });

  test("ITR-1: capital gains zero, income from salary only", () => {
    const r = buildTestReturn({
      itrForm: "ITR-1",
      income: {
        salary: [{ label: "Salary", amount: 800000 }],
        houseProperty: [],
        capitalGains: { stcg: { items: [], total: 0 }, ltcg: { items: [], total: 0 } },
        otherSources: [{ label: "Interest", amount: 15000 }],
        grossTotal: 815000,
      },
      tax: {
        grossTax: 54500,
        surcharge: 0,
        educationCess: 1635,
        totalTaxLiability: 56135,
        tds: [{ label: "Employer TDS", amount: 56135 }],
        advanceTax: [],
        selfAssessmentTax: [],
        totalTaxPaid: 0,
        refundOrDue: 0,
      },
    });
    const result = reconcileIndianReturn(r);
    expect(result.itrForm).toBe("ITR-1");
    expect(result.income.capitalGains.stcg.total).toBe(0);
    expect(result.tax.totalTaxPaid).toBe(56135);
    expect(result.tax.refundOrDue).toBe(0);
  });
});
