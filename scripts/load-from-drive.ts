/**
 * Load historical tax return PDFs from Google Drive mount into tax-ui.
 *
 * Usage:
 *   cd ~/Projects/tax-ui
 *   bun run scripts/load-from-drive.ts
 *
 * PDFs are read from ~/gdrive and parsed via the same Claude API pipeline
 * used by the UI upload flow. Results are saved to .tax-returns.json.
 */

import { readFileSync } from "fs";
import path from "path";

import { parseTaxReturn } from "../src/lib/parser";
import { getApiKey, getReturns, saveReturn } from "../src/lib/storage";

const DRIVE_BASE = path.join(
  process.env.HOME || "/home/harshit-shah",
  "gdrive/Important Documents/Documents/Tax Return",
);

// Map of tax year -> PDF path on Drive
const RETURNS: Record<number, string> = {
  2018: path.join(DRIVE_BASE, "2018/HARSHIT SHAH 2018 Tax Return - Signed.pdf"),
  2019: path.join(DRIVE_BASE, "2019/HARSHIT SHAH and JAINI PARIKH 2019 Tax Return - Signed.pdf"),
  2020: path.join(DRIVE_BASE, "2020/HARSHIT SHAH and JAINI PARIKH 2020 Tax Return - Filed.pdf"),
  2021: path.join(DRIVE_BASE, "2021/HARSHIT SHAH and JAINI PARIKH 2021 Tax Return.pdf"),
};

async function main() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("No API key found. Open tax-ui in the browser and enter your Anthropic API key first.");
    process.exit(1);
  }

  const existing = getReturns();
  const existingYears = Object.keys(existing).map(Number);
  console.log("Already loaded years:", existingYears.sort().join(", ") || "none");

  for (const [yearStr, pdfPath] of Object.entries(RETURNS)) {
    const year = Number(yearStr);

    if (existingYears.includes(year)) {
      console.log(`\nSkipping ${year} - already loaded.`);
      continue;
    }

    console.log(`\nProcessing ${year}: ${path.basename(pdfPath)}`);

    let buffer: Buffer;
    try {
      buffer = readFileSync(pdfPath);
    } catch {
      console.error(`  Could not read file: ${pdfPath}`);
      console.error(`  Make sure Google Drive is mounted at ~/gdrive`);
      continue;
    }

    const base64 = buffer.toString("base64");
    console.log(`  File size: ${(buffer.length / 1024).toFixed(0)} KB`);
    console.log(`  Sending to Claude API...`);

    try {
      const taxReturn = await parseTaxReturn(base64, apiKey);
      await saveReturn(taxReturn);
      console.log(`  Saved ${year} (filing status: ${taxReturn.filingStatus}, AGI: $${taxReturn.federal.agi?.toLocaleString()})`);
      console.log(`  Waiting 90s before next call to avoid rate limits...`);
      await new Promise((resolve) => setTimeout(resolve, 90_000));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("prompt is too long") || message.includes("too many tokens")) {
        console.error(`  PDF too large for Claude API. Try uploading just the main 1040 pages via the UI.`);
      } else {
        console.error(`  Parse failed: ${message}`);
      }
    }
  }

  console.log("\nDone.");
}

main();
