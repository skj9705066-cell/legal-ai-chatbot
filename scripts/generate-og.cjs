/**
 * Generates public/og-image.png (1200x630) via puppeteer-core.
 * Uses the Lawsel brand gradient + scale icon + Korean slogan.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = CHROME_PATHS.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error("No Chrome/Edge binary found at known Windows locations");
  process.exit(1);
}

const PUBLIC_DIR = path.resolve(__dirname, "..", "public");
const W = 1200;
const H = 630;

/* ── SVG scale icon (inline, same geometry as LawselLogo) ────── */
const SCALE_SVG = `
<svg width="96" height="96" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="og-g" x1="2" y1="4" x2="30" y2="28" gradientUnits="userSpaceOnUse">
      <stop stop-color="#a5b4fc"/>
      <stop offset="1" stop-color="#e0e7ff"/>
    </linearGradient>
  </defs>
  <line x1="5" y1="10" x2="27" y2="10" stroke="url(#og-g)" stroke-width="1.9" stroke-linecap="round"/>
  <line x1="16" y1="10" x2="16" y2="26" stroke="url(#og-g)" stroke-width="1.9" stroke-linecap="round"/>
  <line x1="9" y1="26" x2="23" y2="26" stroke="url(#og-g)" stroke-width="1.9" stroke-linecap="round"/>
  <line x1="6" y1="10" x2="6" y2="15" stroke="url(#og-g)" stroke-width="1.4" stroke-linecap="round"/>
  <line x1="26" y1="10" x2="26" y2="15" stroke="url(#og-g)" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M2 15 A4 3 0 0 1 10 15" stroke="url(#og-g)" stroke-width="1.4" stroke-linecap="round" fill="none"/>
  <path d="M22 15 A4 3 0 0 1 30 15" stroke="url(#og-g)" stroke-width="1.4" stroke-linecap="round" fill="none"/>
  <circle cx="16" cy="10" r="3" fill="#F59E0B"/>
  <circle cx="16" cy="10" r="1.4" fill="white" opacity="0.6"/>
  <circle cx="27" cy="17.5" r="1.4" fill="#F59E0B" opacity="0.85"/>
</svg>`;

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    width: ${W}px;
    height: ${H}px;
    overflow: hidden;
    background: transparent;
  }

  .card {
    width: ${W}px;
    height: ${H}px;
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #4338CA 68%, #6366F1 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    font-family: 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
  }

  /* 장식 원형들 */
  .deco-circle {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.07);
  }
  .c1 { width: 520px; height: 520px; top: -200px; right: -140px; }
  .c2 { width: 320px; height: 320px; bottom: -120px; left: -80px; }
  .c3 { width: 180px; height: 180px; top: 40px; left: 120px; background: rgba(255,255,255,0.02); }

  /* 격자 배경 */
  .grid-bg {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 60px 60px;
  }

  /* 상단 badge */
  .badge {
    position: absolute;
    top: 40px;
    left: 56px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 999px;
    padding: 6px 16px;
    font-size: 15px;
    font-weight: 700;
    color: rgba(255,255,255,0.8);
    letter-spacing: 0.02em;
  }
  .badge-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #F59E0B;
  }

  /* URL 하단 */
  .url {
    position: absolute;
    bottom: 36px;
    right: 56px;
    font-size: 16px;
    font-weight: 400;
    color: rgba(255,255,255,0.45);
    letter-spacing: 0.04em;
  }

  /* 가로 구분선 */
  .divider {
    position: absolute;
    bottom: 0;
    left: 0; right: 0;
    height: 4px;
    background: linear-gradient(90deg, #F59E0B 0%, #FBBF24 40%, transparent 100%);
  }

  /* 메인 컨텐츠 */
  .content {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .logo-row {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 8px;
  }

  .logo-text {
    font-size: 80px;
    font-weight: 900;
    color: white;
    letter-spacing: -3px;
    line-height: 1;
  }
  .logo-text span {
    color: #F59E0B;
  }

  .headline {
    font-size: 38px;
    font-weight: 700;
    color: rgba(255,255,255,0.95);
    letter-spacing: -1px;
    text-align: center;
    line-height: 1.35;
  }

  .sub {
    font-size: 22px;
    font-weight: 400;
    color: rgba(255,255,255,0.6);
    letter-spacing: 0.04em;
    text-align: center;
  }

  /* 도트 패턴 우상단 */
  .dots {
    position: absolute;
    top: 50px;
    right: 56px;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 10px;
    opacity: 0.18;
  }
  .dot { width: 4px; height: 4px; border-radius: 50%; background: white; }
</style>
</head>
<body>
<div class="card">
  <div class="grid-bg"></div>
  <div class="deco-circle c1"></div>
  <div class="deco-circle c2"></div>
  <div class="deco-circle c3"></div>

  <div class="dots">
    ${Array(48).fill('<div class="dot"></div>').join("")}
  </div>

  <div class="badge">
    <div class="badge-dot"></div>
    AI 법률 상담 플랫폼
  </div>

  <div class="content">
    <div class="logo-row">
      ${SCALE_SVG}
      <div class="logo-text">로<span>셀</span></div>
    </div>
    <div class="headline">딱 맞는 변호사를 골라드립니다</div>
    <div class="sub">24시간 무료 AI 법률 상담 · 전문 변호사 매칭</div>
  </div>

  <div class="url">lawsel.kr</div>
  <div class="divider"></div>
</div>
</body>
</html>`;

(async () => {
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
    await page.setContent(HTML, { waitUntil: "networkidle0", timeout: 15000 });

    const card = await page.$(".card");
    if (!card) throw new Error(".card element not found");

    const buf = await card.screenshot({ type: "png", omitBackground: false });
    const outPath = path.join(PUBLIC_DIR, "og-image.png");
    fs.writeFileSync(outPath, buf);
    console.log(`✓ og-image.png written (${W}x${H}, @2x)`);
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
