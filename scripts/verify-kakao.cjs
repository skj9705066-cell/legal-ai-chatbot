const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = "http://localhost:3000";
const OUT = path.resolve(__dirname, "..", "screenshots");
fs.mkdirSync(OUT, { recursive: true });

async function snap(page, name) {
  const p = path.join(OUT, name);
  await page.screenshot({ path: p, fullPage: false });
  console.log("  [snap]", name);
  return p;
}

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    defaultViewport: { width: 420, height: 800 },
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  let passed = 0;
  let failed = 0;
  const findings = [];

  try {
    const page = await browser.newPage();

    // ── 1. 로그인 페이지에 카카오 버튼 존재 확인 ──────────────────────
    console.log("\n[1] /login 페이지 → 카카오 버튼 존재 확인");
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
    await wait(800);
    const kakaoBtn = await page.$('button[style*="FEE500"]');
    if (kakaoBtn) {
      const txt = await kakaoBtn.evaluate((el) => el.textContent.trim());
      console.log(`  ✅ 카카오 버튼 발견: "${txt}"`);
      passed++;
    } else {
      console.log("  ❌ 카카오 버튼 없음");
      failed++;
      findings.push("❌ 로그인 페이지에 카카오 버튼 없음");
    }
    await snap(page, "1-login-kakao-button.png");

    // ── 2. 카카오 버튼 클릭 → OAuth URL 리다이렉트 확인 ─────────────────
    console.log("\n[2] 카카오 버튼 클릭 → OAuth URL 확인");
    let kakaoRedirectUrl = null;
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("kauth.kakao.com/oauth/authorize")) {
        kakaoRedirectUrl = url;
        req.abort(); // 실제 카카오로 이동하지 않고 가로채기
      } else {
        req.continue().catch(() => {});
      }
    });
    await page.setRequestInterception(true);

    const kakaoBtn2 = await page.$('button[style*="FEE500"]');
    if (kakaoBtn2) {
      await kakaoBtn2.click();
      await wait(1500);
    }

    if (kakaoRedirectUrl) {
      const u = new URL(kakaoRedirectUrl);
      const clientId = u.searchParams.get("client_id");
      const redirectUri = u.searchParams.get("redirect_uri");
      const responseType = u.searchParams.get("response_type");
      console.log(`  ✅ 카카오 OAuth URL 생성됨`);
      console.log(`     client_id: ${clientId}`);
      console.log(`     redirect_uri: ${redirectUri}`);
      console.log(`     response_type: ${responseType}`);

      if (clientId === "b0cd3522dc636681ea44751f833170f0") {
        console.log("  ✅ client_id 일치");
        passed++;
      } else {
        console.log("  ❌ client_id 불일치");
        failed++;
        findings.push(`❌ client_id 불일치: ${clientId}`);
      }
      if (redirectUri && redirectUri.includes("/auth/kakao/callback")) {
        console.log("  ✅ redirect_uri 올바름");
        passed++;
      } else {
        console.log("  ❌ redirect_uri 없음 또는 잘못됨");
        failed++;
        findings.push(`❌ redirect_uri 오류: ${redirectUri}`);
      }
    } else {
      console.log("  ❌ 카카오 OAuth URL이 감지되지 않음");
      failed++;
      findings.push("❌ 카카오 OAuth URL 리다이렉트 없음");
    }

    await page.setRequestInterception(false);

    // ── 3. 회원가입 페이지 카카오 버튼 확인 ────────────────────────────
    console.log("\n[3] /signup 페이지 → 카카오 버튼 (일반사용자 탭)");
    const page2 = await browser.newPage();
    await page2.goto(`${BASE}/signup`, { waitUntil: "networkidle0" });
    await wait(800);
    const signupKakaoBtn = await page2.$('button[style*="FEE500"]');
    if (signupKakaoBtn) {
      const txt = await signupKakaoBtn.evaluate((el) => el.textContent.trim());
      console.log(`  ✅ 회원가입 카카오 버튼 발견: "${txt}"`);
      passed++;
    } else {
      console.log("  ❌ 회원가입 카카오 버튼 없음");
      failed++;
      findings.push("❌ 회원가입 페이지에 카카오 버튼 없음");
    }
    await snap(page2, "3-signup-kakao-button.png");

    // "변호사" 탭에서는 카카오 버튼이 없어야 함
    const clicked = await page2.evaluate(() => {
      const btn = [...document.querySelectorAll("button")]
        .find((b) => b.textContent.trim() === "변호사");
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (clicked) {
      await wait(500);
      const kakaoInLawyer = await page2.$('button[style*="FEE500"]');
      if (!kakaoInLawyer) {
        console.log("  ✅ 변호사 탭에선 카카오 버튼 없음 (정상)");
        passed++;
      } else {
        console.log("  ⚠️ 변호사 탭에도 카카오 버튼 노출됨");
        findings.push("⚠️ 변호사 탭에도 카카오 버튼이 보임 (의도와 다를 수 있음)");
      }
    }
    await snap(page2, "3b-signup-lawyer-tab.png");

    // ── 4. /auth/kakao/callback?code=invalid → 에러 처리 확인 ──────────
    console.log("\n[4] 콜백 페이지 — 잘못된 code → 에러 UI 확인");
    const page3 = await browser.newPage();
    await page3.goto(`${BASE}/auth/kakao/callback?code=INVALID_CODE_TEST`, {
      waitUntil: "networkidle0",
    });
    await wait(4000); // API 호출 + 에러 처리 대기

    const errorText = await page3.evaluate(() => {
      const p = document.querySelector("p");
      return p ? p.textContent : null;
    });
    const backBtn = await page3.$("button");
    if (errorText && errorText.length > 0) {
      console.log(`  ✅ 에러 메시지 표시: "${errorText}"`);
      passed++;
    } else {
      console.log("  ❌ 에러 UI가 표시되지 않음");
      failed++;
      findings.push("❌ 잘못된 code에 대한 에러 UI 없음");
    }
    if (backBtn) {
      const btnTxt = await backBtn.evaluate((el) => el.textContent.trim());
      console.log(`  ✅ 돌아가기 버튼: "${btnTxt}"`);
      passed++;
    }
    await snap(page3, "4-callback-error.png");

    // ── 5. API 라우트 직접 테스트 — 빈 body ─────────────────────────────
    console.log("\n[5] POST /api/auth/kakao — 필수 파라미터 누락 → 400 응답");
    const apiPage = await browser.newPage();
    await apiPage.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
    const apiResult = await apiPage.evaluate(async () => {
      const res = await fetch("/api/auth/kakao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return { status: res.status, body: await res.json() };
    });
    if (apiResult.status === 400) {
      console.log(`  ✅ 400 반환: ${JSON.stringify(apiResult.body)}`);
      passed++;
    } else {
      console.log(`  ❌ 예상 400, 실제 ${apiResult.status}`);
      failed++;
      findings.push(`❌ 빈 body에 400 반환 안됨: ${apiResult.status}`);
    }

    // ── 결과 요약 ─────────────────────────────────────────────────────
    console.log("\n" + "═".repeat(50));
    console.log(`결과: ${passed} 통과 / ${failed} 실패`);
    if (findings.length) {
      console.log("\nFindings:");
      findings.forEach((f) => console.log(" ", f));
    }
    console.log("═".repeat(50));
    console.log(`스크린샷 저장 위치: ${OUT}`);
  } finally {
    await browser.close();
  }
})().catch(console.error);
