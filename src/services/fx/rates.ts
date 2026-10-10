/**
 * FX rates: live via open.er-api.com when reachable, otherwise bundled
 * rates baked in at build time (scripts/fetch-fx-rates.mjs).
 * The Anna host sandbox blocks direct external fetch, so the bundle
 * is the primary source there.
 */
import bundled from "./bundled-rates.json";

interface RateCache {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

export interface RateInfo {
  rate: number;
  /** ISO date (live) or bundle date string. */
  asOf: string;
  live: boolean;
}

const CACHE_KEY = "fx:rates";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function readCache(): RateCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as RateCache;
    if (Date.now() - c.fetchedAt > CACHE_TTL_MS) return null;
    return c;
  } catch {
    return null;
  }
}

function writeCache(c: RateCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

async function fetchRates(base: string): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { result: string; rates?: Record<string, number> };
    if (data.result !== "success" || !data.rates) return null;
    return data.rates;
  } catch {
    return null;
  }
}

/** Cross-rate via the bundled USD table. */
function bundledRate(from: string, to: string): number | null {
  const rates = (bundled as { rates: Record<string, number> }).rates;
  const rFrom = rates[from];
  const rTo = rates[to];
  if (typeof rFrom !== "number" || typeof rTo !== "number" || rFrom <= 0) return null;
  return rTo / rFrom;
}

function bundledDate(): string {
  return (bundled as { date?: string }).date ?? "unknown";
}

/**
 * Get conversion info from `from` to `to` (multiply amount in `from`).
 * Tries live rates first, falls back to bundled rates. Returns null
 * only when neither source has the pair.
 */
export async function getRateInfo(from: string, to: string): Promise<RateInfo | null> {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return { rate: 1, asOf: new Date().toISOString().slice(0, 10), live: true };

  let cache = readCache();
  if (!cache || cache.base !== f) {
    const rates = await fetchRates(f);
    if (rates) {
      cache = { base: f, rates, fetchedAt: Date.now() };
      writeCache(cache);
    }
  }
  if (cache) {
    const rate = cache.rates[t];
    if (typeof rate === "number" && rate > 0) {
      return { rate, asOf: new Date(cache.fetchedAt).toISOString().slice(0, 10), live: true };
    }
  }
  const bRate = bundledRate(f, t);
  if (bRate !== null) return { rate: bRate, asOf: bundledDate(), live: false };
  return null;
}

/** Legacy simple accessor. */
export async function getRate(from: string, to: string): Promise<number | null> {
  const info = await getRateInfo(from, to);
  return info ? info.rate : null;
}

/** Format a rate note, e.g. "FX: 1 USD = 1.3621 CAD (2026-10-09)". */
export function fxNote(from: string, to: string, rate: number, asOf?: string, live = true): string {
  const date = asOf ?? new Date().toISOString().slice(0, 10);
  const tag = live ? "" : " (bundled rates)";
  return `FX: 1 ${from.toUpperCase()} = ${rate.toFixed(4)} ${to.toUpperCase()} (${date}${tag})`;
}
