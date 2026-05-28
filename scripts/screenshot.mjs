import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "screenshots");

const BASE = "https://legal-ai-chatbot-five.vercel.app";

const PAGES = [
  { name: "01-terms",   url: `${BASE}/terms`,    fullPage: true },
  { name: "02-privacy", url: `${BASE}/privacy`,  fullPage: true },
  { name: "03-chat-ai-notice", url: `${BASE}/chat/demo-id`, fullPage: false, waitFor: ".bg-brand-50" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },  // iPhone 14 Pro
  deviceScaleFactor: 2,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  locale: "ko-KR",
});

import { mkdirSync } from "fs";
mkdirSync(OUT, { recursive: true });

for (const p of PAGES) {
  const page = await ctx.newPage();
  console.log(`→ ${p.url}`);
  await page.goto(p.url, { waitUntil: "networkidle", timeout: 30000 });

  if (p.waitFor) {
    try { await page.waitForSelector(p.waitFor, { timeout: 8000 }); } catch {}
  }

  // Scroll a little to ensure lazy content loads for chat page
  if (p.name.includes("chat")) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1500);
  }

  const file = path.join(OUT, `${p.name}.png`);
  await page.screenshot({ path: file, fullPage: p.fullPage });
  console.log(`  saved → ${file}`);
  await page.close();
}

// Desktop screenshot of terms page too
const deskCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5 });
const deskPage = await deskCtx.newPage();
await deskPage.goto(`${BASE}/terms`, { waitUntil: "networkidle" });
await deskPage.screenshot({ path: path.join(OUT, "04-terms-desktop.png"), fullPage: true });
console.log("  saved → 04-terms-desktop.png");
await deskCtx.close();

await browser.close();
console.log("done");
