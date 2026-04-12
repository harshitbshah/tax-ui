export type ChargeItem = {
  label: string;
  amount: number;
};

export type CountryCosts = {
  filing?: { amount: number; method?: string };
  // Generic labeled charges — brokerage, STT, exchange fees, GST, stamp duty, etc.
  charges?: ChargeItem[];
};

// Full file shape: year (string) → country code → costs
export type FilingCostsData = Record<string, Record<string, CountryCosts>>;

export function chargesTotal(costs: CountryCosts): number {
  return costs.charges?.reduce((sum, c) => sum + c.amount, 0) ?? 0;
}

export function complianceTotal(costs: CountryCosts): number {
  return (costs.filing?.amount ?? 0) + chargesTotal(costs);
}

// Validates and returns a typed CountryCosts. Throws with a descriptive message on failure.
export function parseCountryCosts(raw: unknown): CountryCosts {
  if (!raw || typeof raw !== "object") throw new Error("Expected an object");
  const r = raw as Record<string, unknown>;
  const result: CountryCosts = {};

  if (r.filing !== undefined) {
    if (!r.filing || typeof r.filing !== "object") throw new Error("'filing' must be an object");
    const f = r.filing as Record<string, unknown>;
    if (typeof f.amount !== "number" || f.amount < 0)
      throw new Error("'filing.amount' must be a non-negative number");
    result.filing = { amount: f.amount };
    if (f.method !== undefined) {
      if (typeof f.method !== "string") throw new Error("'filing.method' must be a string");
      result.filing.method = f.method;
    }
  }

  if (r.charges !== undefined) {
    if (!Array.isArray(r.charges)) throw new Error("'charges' must be an array");
    result.charges = r.charges.map((c: unknown, i: number) => {
      if (!c || typeof c !== "object") throw new Error(`charges[${i}]: expected object`);
      const ci = c as Record<string, unknown>;
      if (typeof ci.label !== "string" || !ci.label.trim())
        throw new Error(`charges[${i}]: 'label' must be a non-empty string`);
      if (typeof ci.amount !== "number" || ci.amount < 0)
        throw new Error(`charges[${i}]: 'amount' must be a non-negative number`);
      return { label: ci.label, amount: ci.amount };
    });
  }

  return result;
}
