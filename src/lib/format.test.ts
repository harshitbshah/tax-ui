import { describe, expect, test } from "bun:test";

import { formatCurrency, formatINRCompact, formatPercent, formatPercentChange } from "./format";

describe("formatCurrency", () => {
  test("formats positive amounts", () => {
    expect(formatCurrency(1000)).toBe("$1,000");
    expect(formatCurrency(1234567)).toBe("$1,234,567");
  });

  test("formats negative amounts", () => {
    expect(formatCurrency(-500)).toBe("-$500");
  });

  test("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  test("shows sign when requested", () => {
    expect(formatCurrency(100, true)).toBe("+$100");
    expect(formatCurrency(-100, true)).toBe("-$100");
    expect(formatCurrency(0, true)).toBe("+$0");
  });
});

describe("formatPercent", () => {
  test("formats percentages with one decimal", () => {
    expect(formatPercent(22)).toBe("22.0%");
    expect(formatPercent(22.5)).toBe("22.5%");
    expect(formatPercent(0)).toBe("0.0%");
  });
});

describe("formatINRCompact", () => {
  test("formats amounts below ₹1L as full INR", () => {
    expect(formatINRCompact(0)).toBe("₹0");
    expect(formatINRCompact(22592)).toBe("₹22,592");
    expect(formatINRCompact(99999)).toBe("₹99,999");
  });

  test("formats ₹1L and above as lakhs", () => {
    expect(formatINRCompact(100000)).toBe("₹1.00L");
    expect(formatINRCompact(187524)).toBe("₹1.88L");
    expect(formatINRCompact(326107)).toBe("₹3.26L");
    expect(formatINRCompact(1968221)).toBe("₹19.68L");
  });

  test("formats ₹1Cr and above as crores", () => {
    expect(formatINRCompact(10000000)).toBe("₹1.00Cr");
    expect(formatINRCompact(25000000)).toBe("₹2.50Cr");
    expect(formatINRCompact(100000000)).toBe("₹10.0Cr");
  });

  test("handles negative amounts", () => {
    expect(formatINRCompact(-1642114)).toBe("-₹16.42L");
    expect(formatINRCompact(-22592)).toBe("-₹22,592");
  });

  test("shows sign prefix when showSign is true", () => {
    expect(formatINRCompact(359717, true)).toBe("+₹3.60L");
    expect(formatINRCompact(-14252, true)).toBe("-₹14,252");
    expect(formatINRCompact(0, true)).toBe("₹0");
  });
});

describe("formatPercentChange", () => {
  test("formats positive changes with plus sign", () => {
    expect(formatPercentChange(110, 100)).toBe("+10.0%");
    expect(formatPercentChange(200, 100)).toBe("+100.0%");
  });

  test("formats negative changes with minus sign", () => {
    expect(formatPercentChange(90, 100)).toBe("-10.0%");
    expect(formatPercentChange(50, 100)).toBe("-50.0%");
  });

  test("handles zero change", () => {
    expect(formatPercentChange(100, 100)).toBe("+0.0%");
  });

  test("handles negative base values", () => {
    // -100 to -50 is an increase (less negative)
    expect(formatPercentChange(-50, -100)).toBe("+50.0%");
    // -100 to -150 is a decrease (more negative)
    expect(formatPercentChange(-150, -100)).toBe("-50.0%");
  });
});
