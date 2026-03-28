import path from "path";

import type { InsightItem } from "./insights";

const DATA_DIR = process.env.TAX_UI_DATA_DIR || process.cwd();
const CACHE_FILE = path.join(DATA_DIR, ".insights-cache.json");

async function readCache(): Promise<Record<string, InsightItem[]>> {
  const file = Bun.file(CACHE_FILE);
  if (!(await file.exists())) return {};
  try {
    return (await file.json()) as Record<string, InsightItem[]>;
  } catch {
    return {};
  }
}

export async function getInsightsCache(year: number): Promise<InsightItem[] | null> {
  const cache = await readCache();
  return cache[String(year)] ?? null;
}

export async function saveInsightsCache(year: number, items: InsightItem[]): Promise<void> {
  const cache = await readCache();
  cache[String(year)] = items;
  await Bun.write(CACHE_FILE, JSON.stringify(cache, null, 2));
}

export async function clearInsightsCache(): Promise<void> {
  const file = Bun.file(CACHE_FILE);
  if (await file.exists()) {
    const fs = await import("fs/promises");
    await fs.unlink(CACHE_FILE);
  }
}
