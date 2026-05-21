/**
 * Renders public/icon.svg into PNG icons via puppeteer-core.
 * Produces:
 *   - icon-192.png (192x192)
 *   - icon-512.png (512x512)
 *   - icon-maskable-512.png (512x512, content inset by ~16% safe zone)
 *   - apple-touch-icon.png (180x180)
 *   - favicon-32.png (32x32)
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = CHROME_PATHS.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error("No Chrome/Edge binary found at known Windows locations");
  process.exit(1);
}

const PUBLIC_DIR = path.resolve(__dirname, "..", "public");
const svgPath = path.join(PUBLIC_DIR, "icon.svg");
const svgSource = fs.readFileSync(svgPath, "utf8");

const targets = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180, maskable: false },
  { name: "favicon-32.png", size: 32, maskable: false },
];

function buildHtml({ size, maskable }) {
  // Maskable icons need a safe zone in the central 80% — pad outer 10% with brand fill.
  const innerScale = maskable ? 0.78 : 1;
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; background: transparent; }
  .frame {
    width: ${size}px;
    height: ${size}px;
    background: ${maskable ? "linear-gradient(135deg,#0f172a,#1e293b 45%,#0f766e)" : "transparent"};
    border-radius: ${maskable ? "0" : `${Math.round(size * 0.22)}px`};
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .inner {
    width: ${Math.round(size * innerScale)}px;
    height: ${Math.round(size * innerScale)}px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .inner svg {
    width: 100%;
    height: 100%;
    display: block;
  }
</style></head><body>
  <div class="frame"><div class="inner">${svgSource}</div></div>
</body></html>`;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    for (const target of targets) {
      const page = await browser.newPage();
      await page.setViewport({
        width: target.size,
        height: target.size,
        deviceScaleFactor: 1,
      });
      await page.setContent(buildHtml(target), { waitUntil: "load" });
      const el = await page.$(".frame");
      if (!el) throw new Error("frame not found");
      const buf = await el.screenshot({ type: "png", omitBackground: !target.maskable });
      const outPath = path.join(PUBLIC_DIR, target.name);
      fs.writeFileSync(outPath, buf);
      console.log(`wrote ${target.name} (${target.size}x${target.size})`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
