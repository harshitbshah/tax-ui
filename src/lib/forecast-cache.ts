import path from "path";

import type { ForecastResponse } from "./forecaster";

const DATA_DIR = process.env.TAX_UI_DATA_DIR || process.cwd();
const CACHE_FILE = path.join(DATA_DIR, ".forecast-cache.json");

async function readCache(): Promise<Record<string, ForecastResponse>> {
  const file = Bun.file(CACHE_FILE);
  if (!(await file.exists())) return {};
  try {
    const raw = await file.json();
    // Backward compat: old format stored a single ForecastResponse at root (not keyed by country)
    if (raw && typeof raw === "object" && "projectedYear" in raw) {
      return { us: raw as ForecastResponse };
    }
    return raw as Record<string, ForecastResponse>;
  } catch {
    return {};
  }
}

export async function getForecastCache(country: string): Promise<ForecastResponse | null> {
  const cache = await readCache();
  return cache[country] ?? null;
}

export async function saveForecastCache(
  country: string,
  forecast: ForecastResponse,
): Promise<void> {
  const cache = await readCache();
  cache[country] = forecast;
  await Bun.write(CACHE_FILE, JSON.stringify(cache, null, 2));
}

export async function clearForecastCache(country?: string): Promise<void> {
  const file = Bun.file(CACHE_FILE);
  if (!(await file.exists())) return;
  if (!country) {
    const fs = await import("fs/promises");
    await fs.unlink(CACHE_FILE);
    return;
  }
  const cache = await readCache();
  delete cache[country];
  await Bun.write(CACHE_FILE, JSON.stringify(cache, null, 2));
}
