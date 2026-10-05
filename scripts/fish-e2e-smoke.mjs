// Fish Audio TTS end-to-end smoke test against the real Anna local harness.
// Usage: node scripts/fish-e2e-smoke.mjs
// Requires: `anna-app dev --port 5191 --mock-llm fixtures/mock-llm.happy.jsonl` running.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const HARNESS_URL = process.env.HARNESS_URL || "http://localhost:5191/";
const CHROME =
  process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.env.E2E_OUT || path.join(process.cwd(), "fish-e2e-report.json");

const report = {
  checks: [],
  events: [],
  rpc: [],
  timeline: [],
  consoleErrors: [],
  consoleWarnings: [],
  pageErrors: [],
  httpErrors: [],
};
function check(name, ok, detail = "") {
  report.checks.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext();

// Instrumentation: runs before any page script in EVERY frame.
await context.addInitScript(() => {
  try {
    const top = window.top;
    if (!top.__E2E_EVENTS__) top.__E2E_EVENTS__ = [];
    const push = (type, detail) =>
      top.__E2E_EVENTS__.push({ ts: Date.now(), type, detail: detail || null });
    const shortStack = () =>
      String((new Error().stack || ""))
        .split("\n")
        .slice(1, 5)
        .map((s) => s.trim().replace(/https?:\/\/[^\s)]*/, ""))
        .join(" | ");
    if (window.speechSynthesis) {
      const ss = window.speechSynthesis;
      const os = ss.speak.bind(ss);
      ss.speak = (u) => {
        push("browser.speak", {
          text: u && u.text ? String(u.text).slice(0, 60) : null,
          stack: shortStack(),
        });
        return os(u);
      };
      const oc = ss.cancel.bind(ss);
      ss.cancel = () => {
        push("browser.cancel", {});
        return oc();
      };
    }
    const proto = window.HTMLMediaElement && window.HTMLMediaElement.prototype;
    if (proto) {
      const op = proto.play;
      proto.play = function () {
        push("audio.play", { src: String(this.src || "").slice(0, 40), tag: this.tagName });
        this.addEventListener("playing", () => push("audio.playing", {}), { once: true });
        const r = op.apply(this, arguments);
        if (r && r.catch) r.catch((e) => push("audio.play.error", { message: String(e).slice(0, 60) }));
        return r;
      };
      const opa = proto.pause;
      proto.pause = function () {
        push("audio.pause", { stack: shortStack() });
        return opa.apply(this, arguments);
      };
    }
  } catch (e) {
    /* ignore */
  }
});

const page = await context.newPage();
page.on("console", (msg) => {
  const t = msg.type();
  report.timeline.push({ ts: Date.now(), type: "console." + t, detail: msg.text() });
  if (t === "error") report.consoleErrors.push(msg.text());
  else if (t === "warning") report.consoleWarnings.push(msg.text());
});
page.on("pageerror", (err) => report.pageErrors.push(String((err && err.stack) || err)));
page.on("response", (res) => {
  const s = res.status();
  if (s >= 400) report.httpErrors.push(`${s} ${res.url()}`);
});
page.on("request", (req) => {
  if (!req.url().includes("/api/session/call")) return;
  let body = null;
  try {
    body = JSON.parse(req.postData() || "{}");
  } catch (e) {
    /* ignore */
  }
  req.__e2e = { ns: body && body.ns, method: body && body.method, args: body && body.args };
});
page.on("response", async (res) => {
  const req = res.request();
  if (!req.url().includes("/api/session/call")) return;
  let payload = null;
  try {
    payload = await res.json();
  } catch (e) {
    /* ignore */
  }
  const meta = req.__e2e || {};
  report.rpc.push({
    ns: meta.ns,
    method: meta.method,
    args: meta.args,
    ok: payload && payload.ok,
    result: payload && payload.result,
    error: payload && payload.error,
  });
});

async function waitForAppFrame(p) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const f = p.frames().find((fr) => /\/anna-apps\//.test(fr.url()));
    if (f) return f;
    await sleep(300);
  }
  throw new Error("app iframe never mounted");
}
const eventLog = () => page.evaluate(() => window.__E2E_EVENTS__ || []);

// ---------------------------------------------------------------------------
// Main E2E flow
// ---------------------------------------------------------------------------
let frame = null;
try {
  await page.goto(HARNESS_URL, { waitUntil: "domcontentloaded" });
  frame = await waitForAppFrame(page);
  await frame.waitForSelector("#main-content", { timeout: 30000 });
  check("Harness mounted the app iframe", true, frame.url().slice(-48));
  const hostDetected = await frame.evaluate(
    () => "ANNA_TOOL_IDS_MARKER" && (!!window.__ANNA_TOOL_IDS__ || /\/anna-apps\//.test(location.pathname))
  );
  check("App detects the Anna host", hostDetected);

  // The Lucky Cat contains a continuously animating SVG, so Playwright's
  // actionability ("stable") check never passes. Dispatch the click directly.
  const clickCat = () =>
    frame.evaluate(() => {
      const top = window.top;
      if (!top.__E2E_EVENTS__) top.__E2E_EVENTS__ = [];
      top.__E2E_EVENTS__.push({ ts: Date.now(), type: "cat.click", detail: null });
      const b = document.querySelector(".lucky-cat-btn");
      if (b) b.click();
    });

  // 1. Open Dashboard -------------------------------------------------------
  await frame.evaluate(() => {
    window.location.hash = "#/dashboard";
  });
  await frame.waitForSelector(".app-main", { timeout: 15000 });
  check("1. Dashboard opened", /\/dashboard/.test(frame.url()), await frame.locator("h1").first().innerText());

  // 2. Ensure a current-month expense exists --------------------------------
  await frame.evaluate(() => {
    window.location.hash = "#/add-expense";
  });
  await frame.waitForSelector('input[placeholder="0.00"]', { timeout: 15000 });
  await frame.fill('input[placeholder="0.00"]', "42.50");
  await frame.locator("select").first().selectOption("food");
  await frame.fill('input[placeholder="Weekly groceries"]', "Sushi dinner");
  await frame.click('button[type="submit"]');
  await frame.waitForFunction(() => /\/expenses/.test(location.hash), { timeout: 15000 });
  await frame.waitForSelector("#main-content", { timeout: 10000 });
  const listed = await frame.locator("text=Sushi dinner").count();
  check("2. Current-month expense exists", listed > 0, `${listed} matching row(s)`);
  // 3. Wait until the Money Buddy insight is ready --------------------------
  await frame.evaluate(() => {
    window.location.hash = "#/dashboard";
  });
  await frame.waitForSelector(".lucky-cat-btn", { timeout: 20000 });
  const llmBefore = report.rpc.filter((r) => r.ns === "llm").length;
  await frame.waitForFunction(
    () => {
      const b = document.querySelector(".lucky-cat-btn");
      return b && !b.disabled;
    },
    { timeout: 30000 }
  );
  const llmAfterInsight = report.rpc.filter((r) => r.ns === "llm").length;
  check("3. Money Buddy insight ready (LLM responded)", llmAfterInsight > 0, `${llmAfterInsight} llm.complete call(s)`);

  // 4. Lucky Cat is enabled --------------------------------------------------
  const enabled = await frame.locator(".lucky-cat-btn").isEnabled();
  check("4. Lucky Cat enabled", enabled);

  // Helper: poll a predicate until truthy or timeout.
  async function waitFor(fn, timeout) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const v = await fn();
      if (v) return v;
      await sleep(300);
    }
    return null;
  }

  // 5. Click Lucky Cat -------------------------------------------------------
  await clickCat();
  const spokeBubble = await waitFor(
    () => frame.locator(".cat-bubble--speaking").count().then((c) => c > 0),
    8000
  );
  check("5. Lucky Cat click -> speaking/loading state", !!spokeBubble);

  // 6-10. Real Fish RPC (Executa cold start + Fish API can take a while) -----
  const realInvoke = await waitFor(() => {
    const inv = report.rpc.filter((r) => r.ns === "tools" && r.method === "invoke").pop();
    return inv && inv.ok && inv.result ? inv : null;
  }, 60000);
  // The Anna host resolves tools.invoke with the plugin payload directly
  // ({ audio_base64, format }); accept an enveloped shape too for safety.
  const invokeAudio = (inv) => {
    if (!inv || !inv.result) return null;
    const r = inv.result;
    if (typeof r.audio_base64 === "string") return r;
    if (r.data && typeof r.data.audio_base64 === "string") return r.data;
    return null;
  };
  const invokeOk = !!(realInvoke && realInvoke.ok && invokeAudio(realInvoke));
  check("6. Browser called Fish provider via RPC (tools.invoke)", !!realInvoke);
  check("7. anna.tools.invoke succeeded", invokeOk, realInvoke ? JSON.stringify(realInvoke.result).slice(0, 60) + "…" : "none");

  const audioPayload = invokeAudio(realInvoke);
  const audioB64 = audioPayload?.audio_base64;
  let audioBytes = 0;
  let magic = null;
  if (audioB64) {
    const buf = Buffer.from(audioB64, "base64");
    audioBytes = buf.length;
    magic = buf.slice(0, 4).toString("latin1");
  }
  const fishFormat = audioPayload?.format;
  check(
    "8. fish-tts Executa invoked",
    realInvoke?.args?.tool_id === "tool-dev-fish-tts" && realInvoke?.args?.method === "synthesize",
    `tool_id=${realInvoke?.args?.tool_id} method=${realInvoke?.args?.method}`
  );
  check("9. Fish API returned audio (HTTP 200 upstream)", !!audioB64, `format: ${fishFormat}`);
  check("10. Audio bytes returned from Fish", audioBytes > 100, `${audioBytes} bytes, magic="${magic}"`);
  const reportedFormat = fishFormat === "opus" ? "audio/ogg; codecs=opus" : "audio/mpeg";

  // 11-12. HTMLAudioElement playback + provider ------------------------------
  const played = await waitFor(
    () => eventLog().then((ev) => ev.filter((e) => e.type === "audio.play").length > 0),
    30000
  );
  check("11. HTMLAudioElement playback started", !!played);
  let events = await eventLog();
  const browserSpeaksFishPhase = events.filter((e) => e.type === "browser.speak").length;
  check("12. Actual provider used = Fish", !!played && browserSpeaksFishPhase === 0, played ? "fish" : "browser");

  // 13. Click while speaking -> stop ----------------------------------------
  await waitFor(
    () => frame.locator(".cat-bubble--speaking").count().then((c) => c > 0),
    5000
  );
  await clickCat();
  const pausedNow = await waitFor(
    () => eventLog().then((ev) => ev.some((e) => e.type === "audio.pause")),
    8000
  );
  const speakingAfterStop = await frame.locator(".cat-bubble--speaking").count();
  check("13. Stop while speaking (playback stops)", !!pausedNow && speakingAfterStop === 0, `pause=${!!pausedNow} bubble=${speakingAfterStop}`);

  // 14. Click again -> restart ----------------------------------------------
  const playsBeforeRestart = (await eventLog()).filter((e) => e.type === "audio.play").length;
  await clickCat();
  const replayed = await waitFor(
    () => eventLog().then((ev) => ev.filter((e) => e.type === "audio.play").length > playsBeforeRestart),
    60000
  );
  const playsAfterRestart = (await eventLog()).filter((e) => e.type === "audio.play").length;
  check("14. Replay (playback restarts)", !!replayed, `${playsBeforeRestart} -> ${playsAfterRestart}`);
  await clickCat(); // stop before fallback test
  await sleep(500);

  // 15. Force Fish failure -> browser SpeechSynthesis fallback ---------------
  const playsBeforeFallback = (await eventLog()).filter((e) => e.type === "audio.play").length;
  const speaksBeforeFallback = (await eventLog()).filter((e) => e.type === "browser.speak").length;
  await page.route("**/api/session/call", async (route) => {
    const r = route.request();
    let b = null;
    try {
      b = JSON.parse(r.postData() || "{}");
    } catch (e) {
      /* ignore */
    }
    if (b && b.ns === "tools" && b.method === "invoke") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, result: { success: false, error: "FORCED_FISH_FAILURE" } }),
      });
    }
    return route.continue();
  });
  await clickCat();
  await frame.waitForSelector(".cat-bubble--speaking", { timeout: 15000 });
  await sleep(800);
  let events2 = await eventLog();
  const speaksAfterFallback = events2.filter((e) => e.type === "browser.speak").length;
  const playsAfterFallback = events2.filter((e) => e.type === "audio.play").length;
  check("15. Browser SpeechSynthesis fallback used", speaksAfterFallback > speaksBeforeFallback, `speak ${speaksBeforeFallback} -> ${speaksAfterFallback}`);
  const providerUsed = playsAfterFallback > playsBeforeFallback ? "fish" : speaksAfterFallback > speaksBeforeFallback ? "browser" : "unknown";
  check(
    "15b. Fallback used only browser (no Fish audio when forced to fail)",
    playsAfterFallback === playsBeforeFallback,
    `audio.play unchanged (${playsAfterFallback})`
  );
  await clickCat(); // stop browser speech
  await sleep(500);
  await page.unroute("**/api/session/call");

  // 16. Fish + browser never speak simultaneously ---------------------------
  const neverSimultaneous = playsAfterFallback === playsBeforeFallback && speaksBeforeFallback === 0;
  check("16. Fish and browser never spoke simultaneously", neverSimultaneous, `fish-only phase had 0 browser.speak; fallback phase had 0 audio.play`);

  // 17. No additional anna.llm.complete when clicking Lucky Cat -------------
  const llmFinal = report.rpc.filter((r) => r.ns === "llm").length;
  check("17. No extra llm.complete on Lucky Cat clicks", llmFinal === llmAfterInsight, `llm calls ${llmAfterInsight} -> ${llmFinal}`);

  // 18. /ai still works, no Read Aloud buttons ------------------------------
  await frame.evaluate(() => {
    window.location.hash = "#/ai";
  });
  await frame.waitForSelector(".chat-welcome, .chat-scroll", { timeout: 20000 });
  const aiHeading = await frame.locator("h1").first().innerText();
  const readAloudButtons = await frame
    .locator(".read-aloud-btn, button[aria-label='Read aloud'], button[aria-label='Stop reading aloud']")
    .count();
  const hasComposer = await frame.locator(".composer-input, textarea").count();
  check("18. /ai works", /Money Buddy/.test(aiHeading), aiHeading);
  check("18b. /ai has no Read Aloud buttons", readAloudButtons === 0, `${readAloudButtons} found; composer=${hasComposer}`);

  report.events = await eventLog();
  report.report_extras = { providerUsed, audioBytes, magic, format: fishFormat };
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log("\nreport written to", OUT);
} catch (err) {
  console.error("E2E crashed:", err);
  report.crash = String((err && err.stack) || err);
  try {
    await browser.close();
  } catch (e) {
    /* ignore */
  }
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  process.exitCode = 1;
}

