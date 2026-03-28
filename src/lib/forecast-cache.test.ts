import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { clearForecastCache, getForecastCache, saveForecastCache } from "./forecast-cache";
import type { ForecastResponse } from "./forecaster";

const minimalForecast: ForecastResponse = {
  projectedYear: 2025,
  taxLiability: { value: 30000, low: 25000, high: 35000 },
  effectiveRate: { value: 20.0, low: 17.0, high: 23.0 },
  estimatedOutcome: { value: 2000, low: -1000, high: 5000, label: "refund" },
  bracket: { rate: 22, floor: 89075, ceiling: 170050, projectedIncome: 150000, headroom: 20050 },
  assumptions: [],
  actionItems: [],
  riskFlags: [],
  generatedAt: "2026-03-28T10:00:00.000Z",
};

// Clear before AND after — beforeEach handles dirty state from interrupted prior runs
beforeEach(async () => {
  await clearForecastCache();
});

afterEach(async () => {
  await clearForecastCache();
});

describe("getForecastCache", () => {
  test("returns null when no cache file exists", async () => {
    const result = await getForecastCache();
    expect(result).toBeNull();
  });

  test("returns saved forecast after saveForecastCache", async () => {
    await saveForecastCache(minimalForecast);
    const result = await getForecastCache();
    expect(result).not.toBeNull();
    expect(result?.projectedYear).toBe(2025);
    expect(result?.taxLiability.value).toBe(30000);
  });

  test("returns null after clearForecastCache", async () => {
    await saveForecastCache(minimalForecast);
    await clearForecastCache();
    const result = await getForecastCache();
    expect(result).toBeNull();
  });
});

describe("saveForecastCache", () => {
  test("second save for same data overwrites first (upsert semantics)", async () => {
    await saveForecastCache(minimalForecast);
    const updated: ForecastResponse = { ...minimalForecast, projectedYear: 2026 };
    await saveForecastCache(updated);
    const result = await getForecastCache();
    expect(result?.projectedYear).toBe(2026);
  });

  test("persists all required top-level fields", async () => {
    await saveForecastCache(minimalForecast);
    const result = await getForecastCache();
    expect(result?.effectiveRate).toEqual({ value: 20.0, low: 17.0, high: 23.0 });
    expect(result?.estimatedOutcome.label).toBe("refund");
    expect(result?.bracket?.headroom).toBe(20050);
    expect(result?.generatedAt).toBe("2026-03-28T10:00:00.000Z");
  });

  test("persists india section when present", async () => {
    const withIndia: ForecastResponse = {
      ...minimalForecast,
      india: {
        regimeRecommendation: "new",
        oldRegimeTax: 450000,
        newRegimeTax: 380000,
        savingUnderRecommended: 70000,
        reasoning: "New regime is better.",
      },
    };
    await saveForecastCache(withIndia);
    const result = await getForecastCache();
    expect(result?.india?.regimeRecommendation).toBe("new");
    expect(result?.india?.savingUnderRecommended).toBe(70000);
  });

  test("india is undefined when not saved", async () => {
    await saveForecastCache(minimalForecast);
    const result = await getForecastCache();
    expect(result?.india).toBeUndefined();
  });
});

describe("clearForecastCache", () => {
  test("is a no-op when no cache exists (does not throw)", async () => {
    await expect(clearForecastCache()).resolves.toBeUndefined();
  });
});
