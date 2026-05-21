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
  console.error("No browser found");
  process.exit(1);
}

const OUT = path.resolve(__dirname, "..", "screenshots");
fs.mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1280, height: 820 };
const MOBILE = { width: 390, height: 844 };

const DEMO_ID = "demo-" + Date.now();
const NOW = Date.now();

const consultation = {
  id: DEMO_ID,
  title: "전세보증금 반환을 거부하는 임대인",
  category: "부동산",
  messages: [
    {
      role: "user",
      content:
        "전세 계약이 종료되었는데 임대인이 보증금을 반환하지 않고 있습니다. 새 임차인을 구하라고만 합니다. 어떻게 대응해야 할까요?",
    },
    {
      role: "assistant",
      content:
        "## 상황 정리\n\n임대인의 보증금 반환 거부는 채무불이행에 해당합니다. **주택임대차보호법 제3조의2**에 따른 임차권등기명령 신청과 보증금반환청구 소송이 가능합니다.\n\n## 관련 법령\n- **주택임대차보호법 제3조의2** (임차권등기명령)\n- **민법 제536조** (동시이행의 항변권)\n- **주택임대차보호법 제4조** (임대차기간)\n\n## 실무적 조언\n1. 내용증명 발송으로 반환 청구 의사 명확히 표시\n2. 임차권등기명령 신청 후 다른 곳으로 이사 가능\n3. 보증금반환청구 소송 진행",
    },
    {
      role: "user",
      content: "내용증명은 어떻게 보내야 하나요?",
    },
    {
      role: "assistant",
      content:
        "## 내용증명 발송 방법\n\n우체국에서 발송하실 수 있으며, 동일한 내용 3부를 작성합니다.\n\n### 필수 기재사항\n- 임대차 계약 정보\n- 보증금 액수와 반환 요청\n- 지연이자 청구 통지\n- 회신 기한 (통상 14일)\n\n발송 후 우체국에서 발급하는 등기번호를 보관해두세요.",
    },
    {
      role: "user",
      content: "소송까지 가면 시간이 얼마나 걸리나요?",
    },
    {
      role: "assistant",
      content:
        "## 소송 진행 기간\n\n- **소액사건 (3000만원 이하)**: 약 3~6개월\n- **단독사건 (3000만원~5억원)**: 약 6개월~1년\n- **합의사건 (5억원 초과)**: 1년 이상\n\n임차권등기명령은 신청 후 약 2~4주 내 효력이 발생합니다.\n\n본 답변은 일반적 법률 정보 제공이며, 구체적 사안은 변호사와의 상담을 권장드립니다.",
    },
  ],
  status: "in_progress",
  starred: false,
  createdAt: NOW - 600000,
  updatedAt: NOW,
};

const matching = {
  consultationId: DEMO_ID,
  caseSummary: {
    caseType: "전세보증금 반환 분쟁",
    keyIssues: [
      "임대인의 보증금 반환 거부",
      "임차권등기명령 신청 필요성",
      "동시이행 항변 가능성 검토",
      "지연이자 청구 범위",
    ],
    relevantLaws: [
      "주택임대차보호법 제3조의2",
      "민법 제536조",
      "주택임대차보호법 제4조",
    ],
    urgency: "high",
    summary:
      "전세 계약 종료 후 임대인이 보증금 반환을 거부하고 새 임차인 모집 책임을 임차인에게 전가하는 사안입니다.",
  },
  feeRange: { min: 100000, max: 300000 },
  consultationMethod: "video",
  status: "matching",
  interestCount: 14,
  proposals: [
    {
      id: "p1",
      lawyerId: "lw_003",
      fee: 180000,
      message: "유사 사건 다수 경험. 신속히 대응해 드리겠습니다.",
      arrivedAt: NOW,
    },
    {
      id: "p2",
      lawyerId: "lw_001",
      fee: 250000,
      message: "착수 즉시 내용증명부터 발송 가능합니다.",
      arrivedAt: NOW,
    },
    {
      id: "p3",
      lawyerId: "lw_005",
      fee: 220000,
      message: "양측 합의 가능성도 함께 검토해드립니다.",
      arrivedAt: NOW,
    },
    {
      id: "p4",
      lawyerId: "lw_004",
      fee: 150000,
      message: "변론 전략을 분명히 가지고 임하겠습니다.",
      arrivedAt: NOW,
    },
    {
      id: "p5",
      lawyerId: "lw_002",
      fee: 280000,
      message: "초기 상담에서 쟁점부터 정리해 드립니다.",
      arrivedAt: NOW,
    },
  ],
  startedAt: NOW - 22000,
  selectedLawyerId: null,
  createdAt: NOW - 60000,
  updatedAt: NOW,
};

async function seedStorage(page) {
  await page.evaluateOnNewDocument(
    (c, m) => {
      localStorage.setItem("legaladvisor.consultations.v1", JSON.stringify([c]));
      localStorage.setItem("legaladvisor.matching.v1", JSON.stringify([m]));
    },
    consultation,
    matching,
  );
}

async function ready(page) {
  // Let fonts/CSS settle
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 350));
}

async function snap(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("  saved", path.relative(process.cwd(), file));
}

async function snapFull(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log("  saved", path.relative(process.cwd(), file));
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    defaultViewport: null,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  try {
    // ---------- Desktop ----------
    const dpage = await browser.newPage();
    await dpage.setViewport(DESKTOP);
    await seedStorage(dpage);

    const errors = [];
    dpage.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
    dpage.on("console", (m) => {
      if (m.type() === "error") errors.push("[console.error] " + m.text());
    });

    console.log("→ desktop home");
    await dpage.goto("http://localhost:3000/", { waitUntil: "networkidle0", timeout: 60000 });
    await ready(dpage);
    await snap(dpage, "desktop-01-home.png");
    await snapFull(dpage, "desktop-01-home-full.png");

    console.log("→ desktop chat (seeded with 3 AI turns)");
    await dpage.goto(`http://localhost:3000/chat/${DEMO_ID}`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await ready(dpage);
    await snap(dpage, "desktop-02-chat.png");

    console.log("→ desktop matching (5 proposals, matching state)");
    await dpage.goto(`http://localhost:3000/matching/${DEMO_ID}`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await ready(dpage);
    await snap(dpage, "desktop-03-matching.png");
    await snapFull(dpage, "desktop-03-matching-full.png");

    console.log("→ desktop mypage");
    await dpage.goto("http://localhost:3000/mypage", {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await ready(dpage);
    await snap(dpage, "desktop-04-mypage.png");

    await dpage.close();

    // ---------- Mobile ----------
    const mpage = await browser.newPage();
    await mpage.setViewport(MOBILE);
    await seedStorage(mpage);
    mpage.on("pageerror", (e) => errors.push("[pageerror M] " + e.message));
    mpage.on("console", (m) => {
      if (m.type() === "error") errors.push("[console.error M] " + m.text());
    });

    console.log("→ mobile home");
    await mpage.goto("http://localhost:3000/", { waitUntil: "networkidle0", timeout: 60000 });
    await ready(mpage);
    await snap(mpage, "mobile-01-home.png");
    await snapFull(mpage, "mobile-01-home-full.png");

    console.log("→ mobile chat");
    await mpage.goto(`http://localhost:3000/chat/${DEMO_ID}`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await ready(mpage);
    await snap(mpage, "mobile-02-chat.png");

    console.log("→ mobile matching");
    await mpage.goto(`http://localhost:3000/matching/${DEMO_ID}`, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await ready(mpage);
    await snap(mpage, "mobile-03-matching.png");
    await snapFull(mpage, "mobile-03-matching-full.png");

    console.log("→ mobile mypage");
    await mpage.goto("http://localhost:3000/mypage", {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await ready(mpage);
    await snap(mpage, "mobile-04-mypage.png");

    await mpage.close();

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
