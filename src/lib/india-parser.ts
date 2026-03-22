import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PDFDocument } from "pdf-lib";

import {
  INDIA_EXTRACTION_PROMPT,
  INDIA_INCOME_PROMPT,
  INDIA_ITR1_PROMPT,
  INDIA_TAX_PROMPT,
} from "./prompt";
import { type IndianTaxReturn, IndianTaxReturnSchema } from "./schema";

// ~700 tokens/page for dense ITR schedules
const FRONT_PAGES = 25; // income schedules: Schedule CG, salary, OS, deductions  (~17.5K tokens)
const TAIL_PAGES = 12; // tax computation: Part B-TTI + Schedule TDS            (~8.4K tokens)
// Total two-pass: ~25.9K — comfortably under the 30K/min Sonnet limit

// ── Proactive token budget ────────────────────────────────────────────────────
// Track actual Sonnet usage in a 60-second sliding window so we can sleep
// proactively before the next call rather than waiting for a reactive 429.
const SONNET_TPM_BUDGET = 28_000; // conservative below the 30K official limit
const _sonnetLog: { tokens: number; at: number }[] = [];

function _recordTokens(inputTokens: number, outputTokens: number) {
  _sonnetLog.push({ tokens: inputTokens + outputTokens, at: Date.now() });
}

async function _waitForBudget(estimated: number) {
  const now = Date.now();
  // Evict entries older than 60s
  while (_sonnetLog.length > 0 && now - _sonnetLog[0]!.at >= 60_000) {
    _sonnetLog.shift();
  }
  const used = _sonnetLog.reduce((s, e) => s + e.tokens, 0);
  if (used + estimated <= SONNET_TPM_BUDGET) return;

  // Find the earliest point when enough tokens expire to fit the request
  let freed = 0;
  let sleepUntil = now;
  for (const entry of _sonnetLog) {
    freed += entry.tokens;
    sleepUntil = entry.at + 60_000;
    if (used - freed + estimated <= SONNET_TPM_BUDGET) break;
  }
  const waitMs = sleepUntil - now + 1_000; // +1s buffer
  if (waitMs > 0) {
    console.log(
      `[india-parser] Token budget: ${used.toLocaleString()} used, ~${estimated.toLocaleString()} needed — waiting ${Math.ceil(waitMs / 1_000)}s`,
    );
    await new Promise((r) => setTimeout(r, waitMs));
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export function reconcileIndianReturn(r: IndianTaxReturn): IndianTaxReturn {
  // Recompute totalTaxPaid from components
  const sumAmounts = (items: { amount: number }[]) => items.reduce((s, i) => s + i.amount, 0);
  const computedPaid =
    sumAmounts(r.tax.tds) + sumAmounts(r.tax.advanceTax) + sumAmounts(r.tax.selfAssessmentTax);
  if (computedPaid !== 0) {
    r.tax.totalTaxPaid = computedPaid;
  }

  // Recompute refundOrDue
  r.tax.refundOrDue = r.tax.totalTaxPaid - r.tax.totalTaxLiability;

  // Sync summary from canonical fields
  r.summary.grossTotalIncome = r.income.grossTotal;
  r.summary.taxableIncome = r.taxableIncome;
  r.summary.totalTaxPaid = r.tax.totalTaxPaid;
  r.summary.refundOrDue = r.tax.refundOrDue;

  return r;
}

// Retry on 429 with the server-specified wait time (Retry-After header).
// estimatedTokens is used for proactive budget checks before each attempt.
async function callClaudeWithRetry(
  pdfBase64: string,
  prompt: string,
  client: Anthropic,
  estimatedTokens = 0,
): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (estimatedTokens > 0) await _waitForBudget(estimatedTokens);

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
        output_config: {
          format: zodOutputFormat(IndianTaxReturnSchema),
        },
      });

      // Record actual usage for future proactive checks
      _recordTokens(response.usage.input_tokens, response.usage.output_tokens);

      const textBlock = response.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") throw new Error("No text response from Claude");
      return textBlock.text;
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Error && (err.message.includes("429") || err.message.includes("rate_limit"));
      if (!isRateLimit || attempt === 2) throw err;

      // Extract Retry-After seconds from the error headers if available, else default 65s
      let waitMs = 65_000;
      const headerMatch = err.message.match(/"retry-after":\s*"(\d+)"/);
      if (headerMatch) waitMs = (parseInt(headerMatch[1]!, 10) + 2) * 1000;

      console.log(
        `[india-parser] Rate limited — waiting ${Math.ceil(waitMs / 1000)}s before retry ${attempt + 2}/3`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw new Error("Exhausted retries");
}

async function parseIndianChunk(pdfBase64: string, client: Anthropic): Promise<IndianTaxReturn> {
  return JSON.parse(await callClaudeWithRetry(pdfBase64, INDIA_EXTRACTION_PROMPT, client));
}

async function parseItr1(pdfBase64: string, client: Anthropic): Promise<IndianTaxReturn> {
  return JSON.parse(await callClaudeWithRetry(pdfBase64, INDIA_ITR1_PROMPT, client));
}

// Detect ITR form type from first page using a fast Haiku call
async function detectFormType(
  firstPageBase64: string,
  client: Anthropic,
): Promise<"ITR-1" | "ITR-2" | "ITR-3" | "ITR-4"> {
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: firstPageBase64 },
            },
            {
              type: "text",
              text: "What ITR form type is this? Reply with ONLY one of: ITR-1, ITR-2, ITR-3, ITR-4.",
            },
          ],
        },
      ],
    });
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    if (text.includes("ITR-1") || text.toLowerCase().includes("sahaj")) return "ITR-1";
    if (text.includes("ITR-3")) return "ITR-3";
    if (text.includes("ITR-4") || text.toLowerCase().includes("sugam")) return "ITR-4";
    return "ITR-2";
  } catch {
    return "ITR-2";
  }
}

async function extractPageRange(
  pdfDoc: PDFDocument,
  startIndex: number,
  count: number,
): Promise<string> {
  const total = pdfDoc.getPageCount();
  const indices = Array.from(
    { length: Math.min(count, total - startIndex) },
    (_, i) => startIndex + i,
  );
  const newDoc = await PDFDocument.create();
  const pages = await newDoc.copyPages(pdfDoc, indices);
  pages.forEach((p) => newDoc.addPage(p));
  return Buffer.from(await newDoc.save()).toString("base64");
}

// Two-pass parse for large ITR PDFs:
// Pass 1 — front pages → income schedules (Schedule CG, OS, salary, deductions)
// Pass 2 — tail pages → tax computation (Part B-TTI + Schedule TDS)
// Merging programmatically avoids Claude conflating Schedule CG detail with
// Part B-TTI summary totals when both are present in the same document.
async function twoPassParse(pdfBase64: string, client: Anthropic): Promise<IndianTaxReturn> {
  const pdfBytes = Buffer.from(pdfBase64, "base64");
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const total = pdfDoc.getPageCount();

  console.log(
    `[india-parser] PDF has ${total} pages — two-pass: income (1-${FRONT_PAGES}), tax (${total - TAIL_PAGES + 1}-${total})`,
  );

  const frontPdf = await extractPageRange(pdfDoc, 0, FRONT_PAGES);
  const tailPdf = await extractPageRange(pdfDoc, total - TAIL_PAGES, TAIL_PAGES);

  // Pass 1: income data — no prior Sonnet call in this parse, proceed immediately
  const income: IndianTaxReturn = JSON.parse(
    await callClaudeWithRetry(frontPdf, INDIA_INCOME_PROMPT, client),
  );

  // Pass 2: tax — check budget before sending; estimate from page count
  const tailEstimated = TAIL_PAGES * 750;
  const tax: IndianTaxReturn = JSON.parse(
    await callClaudeWithRetry(tailPdf, INDIA_TAX_PROMPT, client, tailEstimated),
  );

  // Merge: income fields from pass 1, tax fields from pass 2
  return {
    ...income,
    tax: tax.tax,
    summary: {
      grossTotalIncome: income.income.grossTotal,
      taxableIncome: income.taxableIncome,
      totalTaxPaid: tax.tax.totalTaxPaid,
      refundOrDue: tax.tax.totalTaxPaid - tax.tax.totalTaxLiability,
    },
  };
}

export async function parseIndianReturn(
  pdfBase64: string,
  apiKey: string,
): Promise<IndianTaxReturn> {
  const client = new Anthropic({ apiKey });

  const pdfBytes = Buffer.from(pdfBase64, "base64");
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const total = pdfDoc.getPageCount();

  // Detect form type from first page (fast Haiku call — separate rate limit bucket)
  const firstPageBase64 = await extractPageRange(pdfDoc, 0, 1);
  const formType = await detectFormType(firstPageBase64, client);
  console.log(`[india-parser] Detected form type: ${formType} (${total} pages)`);

  // ITR-1 (Sahaj): always single-pass — simple salary form, no capital gains
  if (formType === "ITR-1") {
    return reconcileIndianReturn(await parseItr1(pdfBase64, client));
  }

  // ITR-2 and others: single-pass for small PDFs, two-pass for large
  if (total <= FRONT_PAGES + TAIL_PAGES) {
    return reconcileIndianReturn(await parseIndianChunk(pdfBase64, client));
  }

  return reconcileIndianReturn(await twoPassParse(pdfBase64, client));
}

export async function extractIndianYearFromPdf(
  pdfBase64: string,
  apiKey: string,
): Promise<{ assessmentYear: string; financialYear: number } | null> {
  const client = new Anthropic({ apiKey });

  const pdfBytes = Buffer.from(pdfBase64, "base64");
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const firstPageDoc = await PDFDocument.create();
  const [firstPage] = await firstPageDoc.copyPages(pdfDoc, [0]);
  firstPageDoc.addPage(firstPage);
  const firstPageBase64 = Buffer.from(await firstPageDoc.save()).toString("base64");

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: firstPageBase64,
              },
            },
            {
              type: "text",
              text: "What Assessment Year is this Indian ITR for? Respond with ONLY the AY string like '2025-26'. If you cannot determine it, respond with 'UNKNOWN'.",
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const ayMatch = textBlock.text.match(/(\d{4})-(\d{2,4})/);
    if (ayMatch) {
      const assessmentYear = `${ayMatch[1]}-${ayMatch[2]!.slice(-2).padStart(2, "0")}`;
      const financialYear = parseInt(ayMatch[1]!, 10) - 1;
      return { assessmentYear, financialYear };
    }
    return null;
  } catch (error) {
    console.error("India year extraction failed:", error);
    return null;
  }
}
