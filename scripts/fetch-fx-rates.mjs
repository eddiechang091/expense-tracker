/**
 * Fetch latest FX rates (base USD) and bake them into the app bundle.
 * Run automatically before `npm run build`. Never fails the build —
 * if the network is unavailable, the previous bundled file is kept.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "services", "fx", "bundled-rates.json");

try {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.result !== "success" || !data.rates) throw new Error("bad response");
  const date = data.time_last_update_utc?.slice(5, 16) ?? new Date().toISOString().slice(0, 10);
  writeFileSync(OUT, JSON.stringify({ base: "USD", date, rates: data.rates }, null, 2) + "\n");
  console.log(`[fx] bundled rates updated (${date}, ${Object.keys(data.rates).length} currencies)`);
} catch (err) {
  console.warn(`[fx] could not refresh rates (${err}); keeping existing bundle`);
}
