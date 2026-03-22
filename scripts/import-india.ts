/**
 * One-shot script: parse India ITR PDFs and save to .india-tax-returns.json
 * Usage: bun run scripts/import-india.ts <path-to-pdf> [<path-to-pdf2> ...]
 */

import path from "path";

import { parseIndianReturn } from "../src/lib/india-parser";
import { unwrapIfJavaSerialized } from "../src/lib/pdf-utils";
import { saveIndiaReturn } from "../src/lib/india-storage";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("ANTHROPIC_API_KEY not set");
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: bun run scripts/import-india.ts <pdf> [<pdf2> ...]");
  process.exit(1);
}

for (const filePath of files) {
  const abs = path.resolve(filePath);
  console.log(`\nParsing: ${abs}`);
  const file = Bun.file(abs);
  const buffer = unwrapIfJavaSerialized(Buffer.from(await file.arrayBuffer()));
  const base64 = buffer.toString("base64");

  try {
    const result = await parseIndianReturn(base64, apiKey);
    console.log(`  → AY ${result.assessmentYear} (FY ${result.financialYear})`);
    console.log(`  → Name: ${result.name}`);
    console.log(`  → Gross income: ₹${result.income.grossTotal.toLocaleString("en-IN")}`);
    console.log(
      `  → STCG total: ₹${result.income.capitalGains.stcg.total.toLocaleString("en-IN")}`,
    );
    console.log(
      `  → LTCG total: ₹${result.income.capitalGains.ltcg.total.toLocaleString("en-IN")}`,
    );
    console.log(`  → Tax liability: ₹${result.tax.totalTaxLiability.toLocaleString("en-IN")}`);
    console.log(`  → Tax paid: ₹${result.tax.totalTaxPaid.toLocaleString("en-IN")}`);
    console.log(
      `  → Refund/Due: ₹${result.tax.refundOrDue.toLocaleString("en-IN")} (${result.tax.refundOrDue >= 0 ? "refund" : "due"})`,
    );
    await saveIndiaReturn(result);
    console.log(`  ✓ Saved to .india-tax-returns.json`);
  } catch (err) {
    console.error(`  ✗ Failed:`, err);
  }
}
