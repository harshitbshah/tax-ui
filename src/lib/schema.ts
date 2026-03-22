import { z } from "zod";

const LabeledAmount = z.object({
  label: z.string(),
  amount: z.number(),
});

const Dependent = z.object({
  name: z.string(),
  relationship: z.string(),
});

const StateReturn = z.object({
  name: z.string(),
  agi: z.number(),
  deductions: z.array(LabeledAmount),
  taxableIncome: z.number(),
  tax: z.number(),
  adjustments: z.array(LabeledAmount),
  payments: z.array(LabeledAmount),
  refundOrOwed: z.number(),
});

const TaxRates = z.object({
  federal: z.object({ marginal: z.number(), effective: z.number() }),
  state: z.object({ marginal: z.number(), effective: z.number() }).optional(),
  combined: z.object({ marginal: z.number(), effective: z.number() }).optional(),
});

export const TaxReturnSchema = z.object({
  year: z.number(),
  name: z.string(),
  filingStatus: z.enum([
    "single",
    "married_filing_jointly",
    "married_filing_separately",
    "head_of_household",
    "qualifying_surviving_spouse",
  ]),
  dependents: z.array(Dependent),
  income: z.object({
    items: z.array(LabeledAmount),
    total: z.number(),
  }),
  federal: z.object({
    agi: z.number(),
    deductions: z.array(LabeledAmount),
    taxableIncome: z.number(),
    tax: z.number(),
    additionalTaxes: z.array(LabeledAmount),
    credits: z.array(LabeledAmount),
    payments: z.array(LabeledAmount),
    refundOrOwed: z.number(),
  }),
  states: z.array(StateReturn),
  summary: z.object({
    federalAmount: z.number(),
    stateAmounts: z.array(z.object({ state: z.string(), amount: z.number() })),
    netPosition: z.number(),
  }),
  rates: TaxRates.optional(),
});

export type TaxReturn = z.infer<typeof TaxReturnSchema>;
export type LabeledAmount = z.infer<typeof LabeledAmount>;

// ── Indian ITR schema ──────────────────────────────────────────────────────

export const IndianTaxReturnSchema = z.object({
  // "2025-26" for FY 2024-25; use assessmentYear as the canonical string identifier
  assessmentYear: z.string(),
  // Start year of the financial year: FY 2024-25 → 2024
  financialYear: z.number(),
  // ITR form type — ITR-1 (Sahaj) for salary-only filers, ITR-2 for capital gains etc.
  itrForm: z.enum(["ITR-1", "ITR-2", "ITR-3", "ITR-4"]).optional(),
  name: z.string(),
  pan: z.string().optional(),
  residencyStatus: z.enum(["resident", "non_resident", "rnor"]),

  income: z.object({
    salary: z.array(LabeledAmount),
    houseProperty: z.array(LabeledAmount),
    capitalGains: z.object({
      // Short-term capital gains; label distinguishes rate buckets and pre/post-Jul 23 2024 split
      stcg: z.object({
        items: z.array(LabeledAmount),
        total: z.number(),
      }),
      // Long-term capital gains
      ltcg: z.object({
        items: z.array(LabeledAmount),
        total: z.number(),
      }),
    }),
    otherSources: z.array(LabeledAmount),
    grossTotal: z.number(),
  }),

  // Chapter VI-A deductions: 80C, 80D, etc.
  deductions: z.array(LabeledAmount),
  taxableIncome: z.number(),

  tax: z.object({
    grossTax: z.number(),
    surcharge: z.number(),
    educationCess: z.number(),
    totalTaxLiability: z.number(),
    // TDS/TCS deducted at source
    tds: z.array(LabeledAmount),
    // Advance tax paid during the year
    advanceTax: z.array(LabeledAmount),
    selfAssessmentTax: z.array(LabeledAmount),
    totalTaxPaid: z.number(),
    // Positive = refund, negative = additional tax due
    refundOrDue: z.number(),
  }),

  summary: z.object({
    grossTotalIncome: z.number(),
    taxableIncome: z.number(),
    totalTaxPaid: z.number(),
    refundOrDue: z.number(),
  }),
});

export type IndianTaxReturn = z.infer<typeof IndianTaxReturnSchema>;

export interface PendingUpload {
  id: string;
  filename: string;
  year: number | null;
  status: "extracting-year" | "parsing";
  file: File;
}

export interface FileProgress {
  id: string;
  filename: string;
  status: "pending" | "parsing" | "complete" | "error";
  year?: number;
  error?: string;
}

export interface FileWithId {
  id: string;
  file: File;
}
