import { devices, expect, test, type Page } from "@playwright/test";

/**
 * 실제 DB 연결 점검 — 테스트(staging) 모드 배포에서만 실행한다(기본 E2E에서는 건너뜀).
 *   E2E_STAGING=1 E2E_BASE_URL=<테스트 배포 주소> STAGING_ADMIN_EMAIL=… STAGING_ADMIN_PASSWORD=… npx playwright test staging-db --project=desktop
 * 테스트 데이터만 쓴다: 이름 '테스트검증', 휴대전화 010-0000-04xx(가입자에게 배정되지 않는 번호대).
 * 저장된 신청은 모두 '테스트 신청'(운영 지표 제외)으로 기록된다.
 * 신청 API는 IP당 10분 5건 제한이 있어, 이 파일은 정확히 5건만 보낸다(UI 신청 PC 1 + 모바일 1 + 검증 2 + 재전송 1). 다시 돌릴 땐 10분 뒤에.
 */

const ON = process.env.E2E_STAGING === "1";
const EMAIL = process.env.STAGING_ADMIN_EMAIL ?? "";
const PASSWORD = process.env.STAGING_ADMIN_PASSWORD ?? "";
const NAME = "테스트검증";
const suffix = String(Date.now() % 100).padStart(2, "0");
const PHONE = `010-0000-04${suffix}`;
const PHONE_DIGITS = PHONE.replace(/-/g, "");
const MOBILE_PHONE = `010-0000-06${suffix}`;

test.describe.configure({ mode: "serial" });
test.skip(!ON, "E2E_STAGING=1 일 때만 실행 (테스트 모드 배포 + 실제 DB)");
// 모바일 신청은 아래에서 화면 크기·터치를 직접 지정하므로, 파일 전체는 desktop 프로젝트에서 한 번만 돈다
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop 프로젝트에서 1회만"));

async function login(page: Page) {
  test.skip(!EMAIL || !PASSWORD, "STAGING_ADMIN_EMAIL / STAGING_ADMIN_PASSWORD 필요");
  await page.goto("/admin/login");
  await page.fill("#login-email", EMAIL);
  await page.fill("#login-password", PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

let refNo = "";
let mobileRefNo = "";
let mobileBody: Record<string, unknown> | null = null;

/** 신청 버튼을 누르고 /api/leads 응답을 기다린다. 실패하면 서버 응답 또는 화면 안내를 메시지에 담는다 */
async function submitAndExpectSaved(page: Page, press: () => Promise<void>) {
  const request = page.waitForRequest((r) => r.url().endsWith("/api/leads") && r.method() === "POST", { timeout: 15_000 }).catch(() => null);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/leads") && r.request().method() === "POST", { timeout: 15_000 }).catch(() => null);
  await press();
  const [req, res] = await Promise.all([request, response]);
  const alerts = (await page.getByRole("alert").allInnerTexts()).join(" | ");
  expect(res, `신청 API 요청이 나가지 않음. 화면 안내: ${alerts || "(없음)"}`).not.toBeNull();
  expect(res!.status(), `신청 API ${res!.status()}: ${await res!.text()} / 화면 안내: ${alerts || "(없음)"}`).toBe(200);
  await expect(page).toHaveURL(/\/apply\/complete$/);
  await expect(page.getByTestId("test-receipt-note")).toBeVisible();
  const no = (await page.locator("strong.font-mono").first().textContent())!.trim();
  expect(no).toMatch(/^IC-\d{6}-[A-Z0-9]{5}$/);
  return { no, body: req!.postDataJSON() as Record<string, unknown> };
}

test("DB 자동 점검이 모두 통과한다 (공개 키 차단·최소 권한·칼럼·관리자)", async ({ page }) => {
  await login(page);
  await page.goto("/admin/settings?recheck=1");
  const box = page.getByTestId("db-check");
  await expect(box).toContainText("통과");
  const failed = box.locator('[data-ok="false"]');
  expect(await failed.allInnerTexts()).toEqual([]);
});

test("테스트 모드 화면: 배너 표시, 광고·분석 태그 없음", async ({ page }) => {
  const thirdParty: string[] = [];
  page.on("request", (r) => {
    if (/googletagmanager|google-analytics|facebook\.net|facebook\.com\/tr/.test(r.url())) thirdParty.push(r.url());
  });
  await page.goto("/");
  await expect(page.getByText("테스트 모드").first()).toBeVisible();
  await page.waitForTimeout(800);
  expect(thirdParty).toEqual([]);
});

test("신청 저장: 사례 버튼 → 유형 자동 선택 → 테스트 데이터로 신청", async ({ page }) => {
  await page.goto("/?utm_source=staging_check&utm_medium=qa&utm_campaign=db_connect");
  await page.getByTestId("claim-case-cta-surgery-rider").click();
  await expect(page.getByTestId("apply-picked-type")).toContainText("병원비·수술비");
  await page.fill("#apply-name", NAME);
  await page.fill("#apply-phone", PHONE);
  await page.locator("#apply-privacy").check();
  await page.locator("#apply-marketing").check(); // 선택 동의도 기록되는지 확인
  await page.waitForTimeout(2100);
  refNo = (await submitAndExpectSaved(page, () => page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true }).click())).no;

  // 보장 분석 상담 동의: 신청과 분리된 별도 화면의 선택 항목, 기본 해제. 동의 없이는 진행되지 않는다(실제 동의는 하지 않음)
  await page.getByRole("link", { name: "무료 보장 분석 상담 신청" }).click();
  await expect(page).toHaveURL(/\/apply\/coverage$/);
  await expect(page.locator("#cov-consent")).not.toBeChecked();
  await page.getByRole("button", { name: "동의하고 보장 분석 신청" }).click();
  await expect(page.getByText("보장 분석 상담을 위한 별도 동의가 필요합니다.")).toBeVisible();
  await expect(page).toHaveURL(/\/apply\/coverage$/);
});

test.describe("모바일 390x844 · 터치", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: devices["Pixel 7"].userAgent, deviceScaleFactor: 2 });

  test("신청 저장 (모바일): 사례 버튼 탭 → 이름·번호 타이핑 → 동의 탭 → 신청", async ({ page }) => {
    await page.goto("/?utm_source=staging_check&utm_medium=qa&utm_campaign=db_connect_mobile");
    await page.getByTestId("claim-case-cta-maturity").tap();
    await expect(page.getByTestId("apply-picked-type")).toContainText("숨은·만기보험금");
    for (const [sel, text] of [["#apply-name", `${NAME}모바일`], ["#apply-phone", MOBILE_PHONE.replace(/-/g, "")]] as const) {
      await page.locator(sel).tap();
      await expect(page.locator(sel)).toBeFocused();
      await page.keyboard.type(text);
    }
    await page.locator('label[for="apply-privacy"]').tap();
    await expect(page.locator("#apply-privacy")).toBeChecked();
    await page.waitForTimeout(2100);
    const saved = await submitAndExpectSaved(page, () => page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true }).tap());
    mobileRefNo = saved.no;
    mobileBody = saved.body;
  });
});

test("테스트 모드에서도 서버 검증 유지: 필수 동의·형식·봇 차단", async ({ page, baseURL }) => {
  await page.goto("/");
  const headers = { origin: baseURL!, referer: `${baseURL}/` };
  const base = { serviceType: "unclaimed", name: NAME, phone: `010-0000-07${suffix}`, elapsedMs: 3000, website: "" };
  const noConsent = await page.request.post("/api/leads", { data: { ...base }, headers });
  expect(noConsent.status()).toBe(422);
  expect((await noConsent.json()).fieldErrors).toHaveProperty("privacyConsent");
  const bot = await page.request.post("/api/leads", { data: { ...base, privacyConsent: true, website: "x" }, headers });
  expect(bot.status()).toBe(400);
  const foreign = await page.request.post("/api/leads", { data: { ...base, privacyConsent: true }, headers: { origin: "https://evil.example" } });
  expect(foreign.status()).toBe(403);
});

test("같은 제출(제출 키)을 다시 보내면 새로 저장하지 않고 같은 신청번호 — 모바일 신청 재전송", async ({ page, baseURL }) => {
  expect(mobileBody, "앞 모바일 신청의 요청 본문").not.toBeNull();
  await page.goto("/");
  const res = await page.request.post("/api/leads", { data: mobileBody, headers: { origin: baseURL!, referer: `${baseURL}/` } });
  expect(res.status(), await res.text()).toBe(200);
  expect((await res.json()).refNo).toBe(mobileRefNo);
});

test("관리자 CRM: 저장된 신청 조회 — 테스트 표시·마스킹·동의 기록·연락처 복호화", async ({ page }) => {
  expect(refNo, "앞 테스트의 신청번호").not.toBe("");
  await login(page);
  await page.goto(`/admin?q=${encodeURIComponent(refNo)}`);
  const row = page.getByRole("row").filter({ hasText: refNo });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(`010-****-04${suffix}`);
  await expect(row).toContainText("미청구 보험금");
  await expect(row).toContainText("staging_check");
  await row.getByRole("link", { name: refNo }).click();
  await expect(page.getByText("테스트 · 지표 제외")).toBeVisible();
  // 동의: 여부 · 문구 버전 · 시각
  await expect(page.locator("dd").filter({ hasText: /^동의 · claim-.+ · \d/ })).toHaveCount(1);
  await expect(page.locator("dd").filter({ hasText: /^동의 · marketing-.+ · \d/ })).toHaveCount(1);
  // 연락처 원문은 권한자만, 서버에서 복호화 (열람은 감사로그에 기록)
  await page.getByRole("button", { name: /원문 보기/ }).click();
  await expect(page.getByText(PHONE_DIGITS)).toBeVisible();
  // CSV: 마스킹 번호 + 테스트 표시, 원문 번호 없음
  const csv = await (await page.request.get(`/api/admin/export?q=${encodeURIComponent(refNo)}`)).text();
  expect(csv).toContain(refNo);
  expect(csv).toContain("테스트(지표 제외)");
  expect(csv).not.toContain(PHONE_DIGITS);

  // 모바일에서 보낸 신청도 같은 CRM에 한 건으로 보인다
  expect(mobileRefNo, "모바일 신청번호").not.toBe("");
  await page.goto(`/admin?q=${encodeURIComponent(mobileRefNo)}`);
  const mrow = page.getByRole("row").filter({ hasText: mobileRefNo });
  await expect(mrow).toHaveCount(1);
  await expect(mrow).toContainText(`010-****-06${suffix}`);
  await expect(mrow).toContainText("숨은·만기·휴면 보험금");
  await expect(mrow).toContainText("staging_check");
});
