// Records the 60-second silent demo video (WebM, 390 x 844) from the app in demo mode.
//
//   1. cd web && VITE_API_MODE=mock npx vite --port 5179
//   2. From a folder with Playwright installed (npm i playwright; it uses the system Chrome):
//        node <repo>/scripts/record_demo.mjs [out.webm]
//      Playwright's video needs its ffmpeg build once: npx playwright install ffmpeg
//
// The recording page is not part of the app: it holds the app in a frame (390 x 744) above a
// caption strip that shows what the app says, in Tamil with a short English gloss, since the
// video plays without sound. Title and end cards are drawn over the frame.
// Demo mode only: no Gnani API is called. Children and readings are synthetic.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// Playwright is not a dependency of the repo: it is loaded from the folder you run this in.
const { chromium } = createRequire(join(process.cwd(), "noop.js"))("playwright");
const BASE = process.env.BASE ?? "http://localhost:5179";
const OUT = resolve(process.argv[2] ?? join(HERE, "..", "docs", "demo", "akshara_demo_2026-11.webm"));
const TA = JSON.parse(readFileSync(join(HERE, "..", "web", "src", "i18n", "ta.json"), "utf8"));
const W = 390;
const H = 844;
const APP_H = 744;

// The Tamil reader the video follows (synthetic), and a device voice that ends each word
// quickly instead of hanging in a headless browser.
const STORE = {
  reader: { id: "4", alias: "Kavin S.", initials: "KS", level: "Class 3", lang: "ta-IN" },
  lang: "ta-IN",
  readings: [],
};
const INIT = `(() => {
  try {
    if (location.origin.startsWith("http") && !sessionStorage.getItem("seeded")) {
      localStorage.clear();
      localStorage.setItem("akshara.v1", ${JSON.stringify(JSON.stringify(STORE))});
      sessionStorage.setItem("seeded", "1");
    }
  } catch (e) {}
  // A microphone that "speaks": a tone whose loudness rises and falls like a voice.
  const md = navigator.mediaDevices || {};
  md.getUserMedia = async () => {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 170;
    const gain = ctx.createGain();
    gain.gain.value = 0.22;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 2.7;
    const depth = ctx.createGain();
    depth.gain.value = 0.22;
    lfo.connect(depth).connect(gain.gain);
    osc.connect(gain);
    const dest = ctx.createMediaStreamDestination();
    gain.connect(dest);
    osc.start(); lfo.start();
    return dest.stream;
  };
  try { Object.defineProperty(navigator, "mediaDevices", { value: md, configurable: true }); } catch (e) {}
  window.speechSynthesis = {
    speak(u) { setTimeout(() => u.onend && u.onend(), 700); },
    cancel() {}, getVoices() { return []; }, speaking: false, pending: false,
  };
})();`;

const KOLAM_LOGO = (() => {
  const pts = [];
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    const r = 19 + 4.5 * Math.cos(4 * a);
    pts.push(`${(24 + r * Math.cos(a)).toFixed(2)} ${(24 + r * Math.sin(a)).toFixed(2)}`);
  }
  const dots = Array.from({ length: 8 }, (_, k) => {
    const a = (k / 8) * Math.PI * 2;
    return `<circle cx="${24 + 19 * Math.cos(a)}" cy="${24 + 19 * Math.sin(a)}" r="1.5" fill="#454a6b"/>`;
  }).join("");
  return `<svg viewBox="0 0 48 48" width="132" height="132" style="overflow:visible">${dots}
    <path class="ring" d="M${pts.join(" L")}Z" pathLength="1" fill="none" stroke="#0a6e9e" stroke-width="2.4" stroke-linejoin="round"/>
    <text x="24" y="24" text-anchor="middle" dominant-baseline="central" font-family="'Baloo Thambi 2'" font-weight="700" font-size="19" fill="#1c2140">அ</text></svg>`;
})();

const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;800&family=Baloo+Thambi+2:wght@500;700&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#eef3f6;font-family:'Baloo 2',sans-serif;color:#1c2140}
  iframe{display:block;width:${W}px;height:${APP_H}px;border:0}
  .cap{height:${H - APP_H}px;box-sizing:border-box;padding:12px 20px;background:#1c2140;color:#fbfaf6;display:flex;flex-direction:column;justify-content:center;gap:2px;transition:opacity 200ms}
  .cap .ta{font-family:'Baloo Thambi 2';font-weight:700;font-size:19px;line-height:1.3}
  .cap .en{font-size:15px;line-height:1.3;color:#b9c2bf}
  .card{position:fixed;inset:0;background:#eef3f6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:32px;box-sizing:border-box;opacity:0;pointer-events:none;transition:opacity 300ms}
  .card.on{opacity:1}
  .card h1{margin:8px 0 0;font-size:44px;font-weight:800;line-height:1}
  .card p{margin:0;font-size:20px;font-weight:600;color:#454a6b;line-height:1.35}
  .card small{font-size:15px;color:#5c6180;line-height:1.4}
  .ring{stroke-dasharray:1 1;stroke-dashoffset:1}
  .card.on .ring{animation:draw 1400ms cubic-bezier(0.77,0,0.175,1) 200ms forwards}
  @keyframes draw{to{stroke-dashoffset:0}}
</style></head><body>
<iframe id="app" allow="microphone; autoplay"></iframe>
<div class="cap" id="cap"><div class="ta" id="ta"></div><div class="en" id="en"></div></div>
<div class="card on" id="title">${KOLAM_LOGO}<h1>Akshara</h1><p>a picture book that listens</p>
  <small>Reading practice for children in Kannada, Tamil and Hindi</small></div>
<div class="card" id="end">${KOLAM_LOGO}<h1>Akshara</h1>
  <p>Hears every word. Helps with each akshara. Tells the teacher who needs help.</p>
  <small>Prisma hears · Timbre speaks · Evon writes practice<br>Demo mode, synthetic data<br>github.com/akshara-team/akshara</small></div>
</body></html>`;

const browser = await chromium.launch({ channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
const videoDir = join(dirname(OUT), ".video-tmp");
rmSync(videoDir, { recursive: true, force: true });
mkdirSync(videoDir, { recursive: true });
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  hasTouch: true,
  recordVideo: { dir: videoDir, size: { width: W, height: H } },
});
await context.addInitScript(INIT);
const page = await context.newPage();
// The recording starts with the browser's blank page: paint it the wall's colour at once, so
// the first frame (the post's thumbnail) is never white.
await page.setContent('<body style="margin:0;background:#eef3f6;height:100vh"></body>');
const t0 = Date.now();
// Served from the app's own origin (intercepted here, never part of the app), so the app in
// the frame keeps its storage: a page with no origin would make it third-party.
await page.route(`${BASE}/__recording`, (route) =>
  route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: PAGE }),
);
await page.goto(`${BASE}/__recording`, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);

const frame = async () =>
  page.frames().find((fr) => fr !== page.mainFrame() && fr.url().startsWith(BASE)) ?? null;
/** Wait until `s` seconds into the video. */
const at = async (s) => {
  const ms = t0 + s * 1000 - Date.now();
  if (ms > 0) await page.waitForTimeout(ms);
  else if (ms < -400) console.warn(`late by ${(-ms / 1000).toFixed(1)}s at ${s}s`);
};
const caption = (key, en) =>
  page.evaluate(([ta, gloss]) => {
    document.getElementById("ta").textContent = ta;
    document.getElementById("en").textContent = gloss;
  }, [key ? TA[key] : "", en]);
const card = (id, on) => page.evaluate(([i, o]) => document.getElementById(i).classList.toggle("on", o), [id, on]);
/** Client-side navigation in the app, so the story in progress survives. */
const go = async (path, state) => {
  const f = await frame();
  await f.evaluate(([p, s]) => {
    window.history.pushState({ usr: s, key: Math.random().toString(36).slice(2), idx: 1 }, "", p);
    window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
  }, [path, state]);
};
const tap = async (selector) => (await frame()).locator(selector).first().tap();

// 0-4 s: title card while the app loads behind it.
await caption(null, "");
await page.evaluate((url) => (document.getElementById("app").src = url), `${BASE}/switch`);
let f = null;
while (!f) {
  f = await frame();
  if (!f) await page.waitForTimeout(100);
}
await f.waitForSelector(".reader-grid");
await at(4);

// 4-9 s: who is reading. Kavin taps the boat.
await card("title", false);
await caption("voice.tapYou", "Who is reading? Each child taps their own picture.");
await at(7.6);
await (await frame()).getByRole("button", { name: "Kavin S." }).tap();
await (await frame()).waitForSelector(".today");

// 9-15 s: home. Today's story is a real picture book; one Read button.
await at(9);
await caption("home.firstStoryHelp", "Today's story is ready. Tap Read.");
await at(13.4);
await tap(".action");
await (await frame()).waitForSelector(".reading");

// 15-26 s: the book page. Tap the mic and read; the ring follows the voice.
await at(15);
await caption("read.readAloud", "Read the page aloud.");
await at(17.2);
await tap(".action");
await caption("voice.listening", "Listening. The ring follows the child's voice.");
await at(24.6);
await tap(".action");

// 26-29 s: checking, a kolam line draws itself.
await (await frame()).waitForSelector(".checking-stage");
await at(26);
await caption("voice.thinking", "Checking every word.");

// 29-34 s: part 1 marked in place: a skipped word gets an empty dot, never a cross.
await (await frame()).waitForSelector(".marked");
await caption("feedback.wellRead", "Every word marked where it stands. The empty dot: a skipped word.");
await at(33);
await tap(".action"); // part 2
await (await frame()).waitForSelector(".action-aside");
await tap(".action-aside"); // the demo's stand-in for reading part 2
await caption("voice.thinking", "Part 2.");
await (await frame()).waitForSelector(".marked", { timeout: 8000 });

// 35-38 s: part 2: one word read as a different word.
await caption("feedback.wellRead", "Turmeric: read as a different word.");
await at(38.5);

// 38-50 s: the slate. The missed word splits into aksharas, each said and lit, rejoins.
await go("/practice", { words: ["நாளை", "பார்க்கலாம்"] });
await (await frame()).waitForSelector(".tiles");
await caption("practice.listen", "The missed word splits into aksharas. Each one is said aloud.");
await (await frame()).waitForSelector(".action-asides", { timeout: 15000 });
await caption("practice.yourTurn", "Now the child reads the whole word.");
await at(45);
await tap(".action");
await at(47.2);
await tap(".action");
await (await frame()).waitForSelector('.tiles[data-state="ok"]');
await caption("practice.great", "Read right.");

// 50-55 s: the story's kolam completes.
await at(50);
await go("/results");
await (await frame()).waitForSelector(".finish");
await caption("results.title", "The story's kolam is complete. A star, and a count, never a score.");

// 55-58 s: the teacher's register, grouped by reading step.
await at(55);
await (await frame()).goto(`${BASE}/teacher`);
await (await frame()).waitForSelector(".register");
await caption(null, "The teacher's register: grouped by reading step, with marks to check by ear.");

// 58-61 s: end card.
await at(58);
await card("end", true);
await caption(null, "");
await at(61);

const video = page.video();
await context.close();
await browser.close();
mkdirSync(dirname(OUT), { recursive: true });
renameSync(await video.path(), OUT);
rmSync(videoDir, { recursive: true, force: true });
console.log(`saved ${OUT} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
