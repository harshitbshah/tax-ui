import { describe, expect, test } from "bun:test";

import {
  buildIndiaNavItems,
  buildUsNavItems,
  getDefaultIndiaSelection,
  getDefaultUsSelection,
  getMostRecentYearItem,
  parseSelectedId,
} from "./nav";
import type { IndianTaxReturn, TaxReturn } from "./schema";

// Minimal stubs — only the fields nav functions actually read (Object.keys on the records)
const usReturn = {} as TaxReturn;
const indiaReturn = {} as IndianTaxReturn;

// ── buildUsNavItems ────────────────────────────────────────────────────────────

describe("buildUsNavItems", () => {
  test("empty returns yields empty list", () => {
    expect(buildUsNavItems({})).toEqual([]);
  });

  test("single year — no All time item", () => {
    const items = buildUsNavItems({ 2024: usReturn });
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("2024");
    expect(items.find((i) => i.id === "summary")).toBeUndefined();
  });

  test("multiple years — includes All time first", () => {
    const items = buildUsNavItems({ 2022: usReturn, 2024: usReturn, 2023: usReturn });
    expect(items[0]?.id).toBe("summary");
    expect(items[0]?.label).toBe("All time");
  });

  test("years are sorted descending", () => {
    const items = buildUsNavItems({ 2021: usReturn, 2024: usReturn, 2022: usReturn });
    const years = items.filter((i) => i.id !== "summary").map((i) => Number(i.id));
    expect(years).toEqual([2024, 2022, 2021]);
  });
});

// ── buildIndiaNavItems ─────────────────────────────────────────────────────────

describe("buildIndiaNavItems", () => {
  test("empty returns yields empty list", () => {
    expect(buildIndiaNavItems({})).toEqual([]);
  });

  test("single year — no All years item", () => {
    const items = buildIndiaNavItems({ 2024: indiaReturn });
    expect(items).toHaveLength(1);
    expect(items.find((i) => i.id === "summary")).toBeUndefined();
  });

  test("multiple years — includes All years first", () => {
    const items = buildIndiaNavItems({ 2022: indiaReturn, 2024: indiaReturn });
    expect(items[0]?.id).toBe("summary");
    expect(items[0]?.label).toBe("All years");
  });

  test("labels formatted as FY YYYY-YY", () => {
    const items = buildIndiaNavItems({ 2024: indiaReturn });
    expect(items[0]?.label).toBe("FY 2024-25");
  });

  test("FY label wraps correctly at century boundary", () => {
    const items = buildIndiaNavItems({ 2099: indiaReturn });
    expect(items[0]?.label).toBe("FY 2099-00");
  });

  test("years sorted descending", () => {
    const items = buildIndiaNavItems({ 2021: indiaReturn, 2024: indiaReturn, 2022: indiaReturn });
    const years = items.filter((i) => i.id !== "summary").map((i) => Number(i.id));
    expect(years).toEqual([2024, 2022, 2021]);
  });
});

// ── getDefaultUsSelection ─────────────────────────────────────────────────────

describe("getDefaultUsSelection", () => {
  test("empty returns → summary", () => {
    expect(getDefaultUsSelection({})).toBe("summary");
  });

  test("single year → that year", () => {
    expect(getDefaultUsSelection({ 2024: usReturn })).toBe(2024);
  });

  test("multiple years → summary", () => {
    expect(getDefaultUsSelection({ 2023: usReturn, 2024: usReturn })).toBe("summary");
  });
});

// ── getDefaultIndiaSelection ──────────────────────────────────────────────────

describe("getDefaultIndiaSelection", () => {
  test("empty returns → summary", () => {
    expect(getDefaultIndiaSelection({})).toBe("summary");
  });

  test("single year → that year", () => {
    expect(getDefaultIndiaSelection({ 2024: indiaReturn })).toBe(2024);
  });

  test("multiple years → summary", () => {
    expect(getDefaultIndiaSelection({ 2023: indiaReturn, 2024: indiaReturn })).toBe("summary");
  });
});

// ── getMostRecentYearItem ─────────────────────────────────────────────────────

describe("getMostRecentYearItem", () => {
  test("returns undefined for empty list", () => {
    expect(getMostRecentYearItem([])).toBeUndefined();
  });

  test("returns undefined when only summary item", () => {
    expect(getMostRecentYearItem([{ id: "summary", label: "All time" }])).toBeUndefined();
  });

  test("returns first non-summary item", () => {
    const items = [
      { id: "summary", label: "All time" },
      { id: "2024", label: "2024" },
      { id: "2023", label: "2023" },
    ];
    expect(getMostRecentYearItem(items)?.id).toBe("2024");
  });

  test("works without summary item", () => {
    const items = [{ id: "2024", label: "2024" }];
    expect(getMostRecentYearItem(items)?.id).toBe("2024");
  });
});

// ── parseSelectedId ───────────────────────────────────────────────────────────

describe("parseSelectedId", () => {
  test("summary string → summary", () => {
    expect(parseSelectedId("summary")).toBe("summary");
  });

  test("forecast string → forecast", () => {
    expect(parseSelectedId("forecast")).toBe("forecast");
  });

  test("pending prefix → pending string", () => {
    expect(parseSelectedId("pending:abc-123")).toBe("pending:abc-123");
  });

  test("numeric string → number", () => {
    expect(parseSelectedId("2024")).toBe(2024);
  });
});
