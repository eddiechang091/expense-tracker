/** Real-time FX rates via open.er-api.com (free, no key required). */

interface RateCache {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
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

async function fetchRates(base: string): Promise<Record<string, number>> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
  if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
  const data = (await res.json()) as {
    result: string;
    rates?: Record<string, number>;
  };
  if (data.result !== "success" || !data.rates) throw new Error("FX bad response");
  return data.rates;
}

/**
 * Get the conversion rate from `from` to `to` (multiply amount in `from` by this).
 * Uses cached rates when fresh, otherwise fetches. Returns null on failure.
 */
export async function getRate(from: string, to: string): Promise<number | null> {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return 1;

  let cache = readCache();
  if (!cache || cache.base !== f) {
    try {
      const rates = await fetchRates(f);
      cache = { base: f, rates, fetchedAt: Date.now() };
      writeCache(cache);
    } catch {
      return null;
    }
  }
  const rate = cache.rates[t];
  return typeof rate === "number" && rate > 0 ? rate : null;
}

/** Format a rate note, e.g. "FX: 1 USD = 1.3621 CAD (2026-10-09)". */
export function fxNote(from: string, to: string, rate: number): string {
  const date = new Date().toISOString().slice(0, 10);
  return `FX: 1 ${from.toUpperCase()} = ${rate.toFixed(4)} ${to.toUpperCase()} (${date})`;
}
