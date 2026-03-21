/**
 * Run reconcile() against all stored tax returns and print any warnings.
 * Usage: bun run scripts/validate-returns.ts
 */

import { readFileSync } from "fs";
import path from "path";

import { reconcile } from "../src/lib/parser";
import type { TaxReturn } from "../src/lib/schema";

const DATA_PATH = path.join(process.cwd(), ".tax-returns.json");
const raw = JSON.parse(readFileSync(DATA_PATH, "utf-8")) as Record<string, TaxReturn>;
const years = Object.keys(raw).map(Number).sort((a, b) => a - b);

console.log(`Validating ${years.length} years: ${years.join(", ")}\n`);

// Intercept console.warn to collect and display cleanly
const warnings: string[] = [];
const origWarn = console.warn;
console.warn = (...args: unknown[]) => warnings.push(args.join(" "));

for (const year of years) {
  warnings.length = 0;
  reconcile(raw[year]!);
  if (warnings.length === 0) {
    console.log(`${year}: ✓ all checks passed`);
  } else {
    console.log(`${year}: ${warnings.length} warning(s)`);
    for (const w of warnings) console.log(`  ${w}`);
  }
}

console.warn = origWarn;
