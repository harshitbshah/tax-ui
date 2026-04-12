import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

import { deleteFilingCosts, getFilingCosts, saveFilingCosts } from "./filing-costs-cache";
import {
  chargesTotal,
  complianceTotal,
  type CountryCosts,
  parseCountryCosts,
} from "./filing-costs-schema";

// ── parseCountryCosts ────────────────────────────────────────────────────────

const VALID_US: CountryCosts = {
  filing: { amount: 340, method: "CPA" },
};

const VALID_INDIA: CountryCosts = {
  filing: { amount: 0, method: "self" },
  charges: [
    { label: "STT", amount: 3400 },
    { label: "Brokerage", amount: 1200 },
    { label: "GST", amount: 216 },
  ],
};

describe("parseCountryCosts", () => {
  test("accepts US costs with filing only", () => {
    const result = parseCountryCosts(VALID_US);
    expect(result.filing?.amount).toBe(340);
    expect(result.filing?.method).toBe("CPA");
    expect(result.charges).toBeUndefined();
  });

  test("accepts India costs with filing and charges", () => {
    const result = parseCountryCosts(VALID_INDIA);
    expect(result.filing?.amount).toBe(0);
    expect(result.charges).toHaveLength(3);
    expect(result.charges?.[0]?.label).toBe("STT");
    expect(result.charges?.[0]?.amount).toBe(3400);
  });

  test("accepts costs with no filing (charges only)", () => {
    const result = parseCountryCosts({ charges: [{ label: "STT", amount: 100 }] });
    expect(result.filing).toBeUndefined();
    expect(result.charges).toHaveLength(1);
  });

  test("accepts costs with no method", () => {
    const result = parseCountryCosts({ filing: { amount: 15 } });
    expect(result.filing?.amount).toBe(15);
    expect(result.filing?.method).toBeUndefined();
  });

  test("throws on null input", () => {
    expect(() => parseCountryCosts(null)).toThrow();
  });

  test("throws when filing.amount is negative", () => {
    expect(() => parseCountryCosts({ filing: { amount: -10 } })).toThrow("amount");
  });

  test("throws when filing.amount is missing", () => {
    expect(() => parseCountryCosts({ filing: { method: "CPA" } })).toThrow("amount");
  });

  test("throws when charges is not an array", () => {
    expect(() => parseCountryCosts({ charges: "nope" })).toThrow("charges");
  });

  test("throws when a charge has no label", () => {
    expect(() => parseCountryCosts({ charges: [{ label: "", amount: 100 }] })).toThrow("label");
  });

  test("throws when a charge amount is negative", () => {
    expect(() => parseCountryCosts({ charges: [{ label: "STT", amount: -1 }] })).toThrow("amount");
  });
});

// ── chargesTotal / complianceTotal ───────────────────────────────────────────

describe("chargesTotal", () => {
  test("returns 0 when no charges", () => {
    expect(chargesTotal({})).toBe(0);
    expect(chargesTotal({ filing: { amount: 100 } })).toBe(0);
  });

  test("sums all charge amounts", () => {
    expect(chargesTotal(VALID_INDIA)).toBe(3400 + 1200 + 216);
  });
});

describe("complianceTotal", () => {
  test("returns filing + charges", () => {
    expect(complianceTotal(VALID_INDIA)).toBe(0 + 3400 + 1200 + 216);
  });

  test("returns just filing when no charges", () => {
    expect(complianceTotal(VALID_US)).toBe(340);
  });

  test("returns 0 when empty", () => {
    expect(complianceTotal({})).toBe(0);
  });
});

// ── filing costs cache ───────────────────────────────────────────────────────

describe("filing costs cache", () => {
  let tmpDir: string;
  const origDataDir = process.env.TAX_UI_DATA_DIR;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), "taxlens-test-"));
    process.env.TAX_UI_DATA_DIR = tmpDir;
  });

  afterEach(async () => {
    process.env.TAX_UI_DATA_DIR = origDataDir;
    await rm(tmpDir, { recursive: true, force: true });
  });

  test("returns empty object when cache is empty", async () => {
    const result = await getFilingCosts("us");
    expect(result).toEqual({});
  });

  test("returns empty object for different country after saving", async () => {
    await saveFilingCosts(2025, "us", VALID_US);
    const result = await getFilingCosts("india");
    expect(result).toEqual({});
  });

  test("returns saved value after saveFilingCosts", async () => {
    await saveFilingCosts(2025, "us", VALID_US);
    const result = await getFilingCosts("us");
    expect(result[2025]).toBeDefined();
    expect(result[2025]!.filing?.amount).toBe(340);
  });

  test("overwrites existing entry for same year+country", async () => {
    await saveFilingCosts(2025, "us", VALID_US);
    await saveFilingCosts(2025, "us", { filing: { amount: 0, method: "DIY" } });
    const result = await getFilingCosts("us");
    expect(result[2025]!.filing?.method).toBe("DIY");
  });

  test("preserves other countries when saving", async () => {
    await saveFilingCosts(2025, "us", VALID_US);
    await saveFilingCosts(2025, "india", VALID_INDIA);
    expect((await getFilingCosts("us"))[2025]).toBeDefined();
    expect((await getFilingCosts("india"))[2025]).toBeDefined();
  });

  test("preserves other years when saving", async () => {
    await saveFilingCosts(2024, "us", VALID_US);
    await saveFilingCosts(2025, "us", { filing: { amount: 0 } });
    const result = await getFilingCosts("us");
    expect(result[2024]).toBeDefined();
    expect(result[2025]).toBeDefined();
  });

  test("deleteFilingCosts removes the entry", async () => {
    await saveFilingCosts(2025, "us", VALID_US);
    await deleteFilingCosts(2025, "us");
    const result = await getFilingCosts("us");
    expect(result[2025]).toBeUndefined();
  });

  test("deleteFilingCosts leaves other countries intact", async () => {
    await saveFilingCosts(2025, "us", VALID_US);
    await saveFilingCosts(2025, "india", VALID_INDIA);
    await deleteFilingCosts(2025, "us");
    expect((await getFilingCosts("us"))[2025]).toBeUndefined();
    expect((await getFilingCosts("india"))[2025]).toBeDefined();
  });

  test("deleteFilingCosts is a no-op when key does not exist", async () => {
    await expect(deleteFilingCosts(2025, "us")).resolves.toBeUndefined();
  });
});
