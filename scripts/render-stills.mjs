// Renders the original media used by the page from the /lab scenes.
// Usage: npm run dev   (in another shell), then: node scripts/render-stills.mjs [name ...]
// Writes WebP stills and the mass-driver film into public/media/.
import { chromium } from "playwright-core";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = new URL("../public/media/", import.meta.url).pathname;
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// name, scene, viewport (CSS px, rendered @2x), progress, frozen time
const STILLS = [
  ["hero-poster", "hero", 1280, 720, 0, 6],
  ["kardashev-poster", "kardashev", 1280, 720, 0, 3],
  ["sun-poster", "sun", 1280, 720, 0, 4],
  ["output-poster", "output", 1280, 720, 0, 0],
  ["factory", "factory", 1280, 720, 0, 0],
  ["space", "space", 1280, 720, 0, 0],
  ["mass", "mass", 1280, 720, 0, 0],
  ["chip-0", "chip-0", 450, 600, 0, 0],
  ["chip-1", "chip-1", 450, 600, 0, 0],
  ["chip-2", "chip-2", 450, 600, 0, 0],
  ["chip-3", "chip-3", 450, 600, 0, 0],
];

const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
});

for (const [name, scene, w, h, p, t] of STILLS) {
  if (only.length && !only.includes(name)) continue;
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/lab/${scene}?p=${p}&t=${t}`, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction(() => document.body.dataset.ready === "1", null, { timeout: 90000 });
  await page.waitForTimeout(500);
  const png = await page.screenshot({ type: "png" });
  await sharp(png).webp({ quality: 84, effort: 5 }).toFile(`${OUT}${name}.webp`);
  console.log(`still ${name} (${w * 2}x${h * 2})`);
  await page.close();
}

// Modal film: record the drifting mass-driver scene straight from its canvas.
if (!only.length || only.includes("mass-film")) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/lab/mass-1`, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction(() => document.body.dataset.ready === "1", null, { timeout: 90000 });
  const b64 = await page.evaluate(async () => {
    const canvas = document.querySelector("canvas");
    const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 4_000_000 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    rec.start(500);
    await new Promise((r) => setTimeout(r, 14000));
    rec.stop();
    await done;
    const buf = await new Blob(chunks, { type: "video/webm" }).arrayBuffer();
    let s = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  writeFileSync(`${OUT}mass-film.webm`, Buffer.from(b64, "base64"));
  console.log("film mass-film.webm");
  await page.close();
}

await browser.close();
