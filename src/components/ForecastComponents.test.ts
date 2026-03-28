import { describe, expect, test } from "bun:test";

import { confidenceBadgeClass } from "./AssumptionsCard";
import { computeFillPercent } from "./BracketBar";
import { sortedByHighFirst } from "./RiskFlags";

// ── BracketBar ────────────────────────────────────────────────────────────────

describe("computeFillPercent", () => {
  test("income at bracket floor → 0%", () => {
    expect(computeFillPercent(89075, 170050, 89075)).toBe(0);
  });

  test("income at bracket ceiling → 100%", () => {
    expect(computeFillPercent(89075, 170050, 170050)).toBe(100);
  });

  test("income at midpoint → 50%", () => {
    const floor = 0;
    const ceiling = 100000;
    expect(computeFillPercent(floor, ceiling, 50000)).toBe(50);
  });

  test("income well above ceiling is clamped to 100%", () => {
    expect(computeFillPercent(89075, 170050, 999999)).toBe(100);
  });

  test("income below floor is clamped to 0%", () => {
    expect(computeFillPercent(89075, 170050, 50000)).toBe(0);
  });

  test("returns correct fill for typical position in 22% bracket", () => {
    // projectedIncome = 150000, floor = 89075, ceiling = 170050
    // (150000 - 89075) / (170050 - 89075) * 100 ≈ 75.2%
    const pct = computeFillPercent(89075, 170050, 150000);
    expect(pct).toBeGreaterThan(75);
    expect(pct).toBeLessThan(76);
  });

  test("returns 0 when ceiling equals floor (degenerate case)", () => {
    expect(computeFillPercent(100000, 100000, 100000)).toBe(0);
  });
});

// ── AssumptionsCard ───────────────────────────────────────────────────────────

describe("confidenceBadgeClass", () => {
  test("high confidence → emerald text classes", () => {
    const cls = confidenceBadgeClass("high");
    expect(cls).toContain("emerald");
  });

  test("medium confidence → amber text classes", () => {
    const cls = confidenceBadgeClass("medium");
    expect(cls).toContain("amber");
  });

  test("low confidence → rose text classes", () => {
    const cls = confidenceBadgeClass("low");
    expect(cls).toContain("rose");
  });
});

// ── RiskFlags ─────────────────────────────────────────────────────────────────

describe("sortedByHighFirst", () => {
  test("high severity items appear before medium", () => {
    const flags = [
      { severity: "medium" as const, description: "medium risk" },
      { severity: "high" as const, description: "high risk" },
      { severity: "medium" as const, description: "another medium" },
    ];
    const sorted = sortedByHighFirst(flags);
    expect(sorted[0]?.severity).toBe("high");
    expect(sorted[1]?.severity).toBe("medium");
    expect(sorted[2]?.severity).toBe("medium");
  });

  test("all high severity → order preserved", () => {
    const flags = [
      { severity: "high" as const, description: "first" },
      { severity: "high" as const, description: "second" },
    ];
    const sorted = sortedByHighFirst(flags);
    expect(sorted[0]?.description).toBe("first");
    expect(sorted[1]?.description).toBe("second");
  });

  test("all medium → order preserved", () => {
    const flags = [
      { severity: "medium" as const, description: "a" },
      { severity: "medium" as const, description: "b" },
    ];
    const sorted = sortedByHighFirst(flags);
    expect(sorted[0]?.description).toBe("a");
  });

  test("does not mutate original array", () => {
    const flags = [
      { severity: "medium" as const, description: "first" },
      { severity: "high" as const, description: "second" },
    ];
    sortedByHighFirst(flags);
    expect(flags[0]?.severity).toBe("medium"); // original unchanged
  });

  test("empty array returns empty array", () => {
    expect(sortedByHighFirst([])).toEqual([]);
  });
});
