const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = CHROME_PATHS.find((p) => fs.existsSync(p));

const OUT = path.resolve(__dirname, "..", "screenshots");
fs.mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1280, height: 820 };
const MOBILE = { width: 390, height: 844 };

async function ready(page) {
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 500));
}

async function snap(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
  console.log("  saved", name);
}

async function snapFull(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
  console.log("  saved", name);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    defaultViewport: null,
    args: ["--no-sandbox"],
  });
  try {
    const errors = [];

    // Desktop pages
    const dpage = await browser.newPage();
    await dpage.setViewport(DESKTOP);
    dpage.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
    dpage.on("console", (m) => {
      if (m.type() === "error") errors.push("[console.error] " + m.text());
    });

    console.log("→ desktop /login");
    await dpage.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });
    await ready(dpage);
    await snap(dpage, "auth-desktop-login.png");

    console.log("→ desktop /signup");
    await dpage.goto("http://localhost:3000/signup", { waitUntil: "networkidle0" });
    await ready(dpage);
    await snap(dpage, "auth-desktop-signup.png");

    console.log("→ desktop /lawyer/register step 1");
    await dpage.goto("http://localhost:3000/lawyer/register", { waitUntil: "networkidle0" });
    await ready(dpage);
    await snap(dpage, "auth-desktop-lawyer-1.png");

    // Click 다음 after filling step 1
    await dpage.type('input[type="email"]', "test@example.com");
    await dpage.evaluate(() => {
      // fill the name (first text input) and phone
      const inputs = Array.from(document.querySelectorAll('input'));
      const name = inputs.find(i => i.placeholder?.includes("실명"));
      if (name) {
        name.focus();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(name, "김변호");
        name.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const pwd = inputs.find(i => i.type === 'password');
      if (pwd) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(pwd, "password123");
        pwd.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const phone = inputs.find(i => i.placeholder?.includes("010"));
      if (phone) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(phone, "010-1234-5678");
        phone.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 200));

    // Click 다음 button by locating via evaluate
    const clicked = await dpage.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.trim() === '다음',
      );
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (clicked) {
      await new Promise(r => setTimeout(r, 700));
      console.log("→ desktop /lawyer/register step 2");
      await snap(dpage, "auth-desktop-lawyer-2.png");
    }

    console.log("→ desktop / (signed out — verify Footer link)");
    await dpage.goto("http://localhost:3000/", { waitUntil: "networkidle0" });
    await ready(dpage);
    await snapFull(dpage, "auth-desktop-home-full.png");

    // Matching gate: seed a consultation, navigate while unauthenticated, expect AuthModal
    console.log("→ desktop /matching with seed (unauth — expect modal)");
    const DEMO_ID = "noauth-demo-" + Date.now();
    await dpage.evaluateOnNewDocument((id) => {
      const consultation = {
        id,
        title: "전세보증금 반환 분쟁",
        category: "부동산",
        messages: [
          { role: "user", content: "보증금을 못 받고 있습니다." },
          { role: "assistant", content: "## 상황 정리\n주택임대차보호법..." },
        ],
        status: "in_progress",
        starred: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      localStorage.setItem("legaladvisor.consultations.v1", JSON.stringify([consultation]));
      localStorage.removeItem("legaladvisor.session.v1");
    }, DEMO_ID);
    await dpage.goto(`http://localhost:3000/matching/${DEMO_ID}`, { waitUntil: "networkidle0" });
    await ready(dpage);
    await snap(dpage, "auth-desktop-matching-gate.png");

    await dpage.close();

    // Mobile
    const mpage = await browser.newPage();
    await mpage.setViewport(MOBILE);
    mpage.on("pageerror", (e) => errors.push("[pageerror M] " + e.message));
    mpage.on("console", (m) => {
      if (m.type() === "error") errors.push("[console.error M] " + m.text());
    });

    console.log("→ mobile /login");
    await mpage.goto("http://localhost:3000/login", { waitUntil: "networkidle0" });
    await ready(mpage);
    await snap(mpage, "auth-mobile-login.png");

    console.log("→ mobile /lawyer/register");
    await mpage.goto("http://localhost:3000/lawyer/register", { waitUntil: "networkidle0" });
    await ready(mpage);
    await snap(mpage, "auth-mobile-lawyer.png");

    console.log("\n--- console/page errors ---");
    if (errors.length === 0) console.log("(none)");
    else errors.forEach((e) => console.log(e));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error("DRIVER ERROR:", e);
  process.exit(1);
});
