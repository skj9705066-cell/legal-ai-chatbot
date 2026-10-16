import { expect, test, type Page } from "@playwright/test";

/**
 * 실제 DB 연결 점검 — 테스트(staging) 모드 배포에서만 실행한다(기본 E2E에서는 건너뜀).
 *   E2E_STAGING=1 E2E_BASE_URL=<테스트 배포 주소> STAGING_ADMIN_EMAIL=… STAGING_ADMIN_PASSWORD=… npx playwright test staging-db --project=desktop
 * 테스트 데이터만 쓴다: 이름 '테스트검증', 휴대전화 010-0000-04xx(가입자에게 배정되지 않는 번호대).
 * 저장된 신청은 모두 '테스트 신청'(운영 지표 제외)으로 기록된다.
 * 신청 API는 IP당 10분 5건 제한이 있어, 이 파일은 정확히 5건만 보낸다(UI 신청 1 + 검증 2 + 재전송 2). 다시 돌릴 땐 10분 뒤에.
 */

const ON = process.env.E2E_STAGING === "1";
const EMAIL = process.env.STAGING_ADMIN_EMAIL ?? "";
const PASSWORD = process.env.STAGING_ADMIN_PASSWORD ?? "";
const NAME = "테스트검증";
const suffix = String(Date.now() % 100).padStart(2, "0");
const PHONE = `010-0000-04${suffix}`;
const PHONE_DIGITS = PHONE.replace(/-/g, "");

test.describe.configure({ mode: "serial" });
test.skip(!ON, "E2E_STAGING=1 일 때만 실행 (테스트 모드 배포 + 실제 DB)");
test.skip(({ isMobile }) => isMobile, "데스크톱에서 1회만");

async function login(page: Page) {
  test.skip(!EMAIL || !PASSWORD, "STAGING_ADMIN_EMAIL / STAGING_ADMIN_PASSWORD 필요");
  await page.goto("/admin/login");
  await page.fill("#login-email", EMAIL);
  await page.fill("#login-password", PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

let refNo = "";

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
  await page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true }).click();
  await expect(page).toHaveURL(/\/apply\/complete$/);
  await expect(page.getByTestId("test-receipt-note")).toBeVisible();
  refNo = (await page.locator("strong.font-mono").first().textContent())!.trim();
  expect(refNo).toMatch(/^IC-\d{6}-[A-Z0-9]{5}$/);

  // 보장 분석 상담 동의: 신청과 분리된 별도 화면의 선택 항목, 기본 해제. 동의 없이는 진행되지 않는다(실제 동의는 하지 않음)
  await page.getByRole("link", { name: "무료 보장 분석 상담 신청" }).click();
  await expect(page).toHaveURL(/\/apply\/coverage$/);
  await expect(page.locator("#cov-consent")).not.toBeChecked();
  await page.getByRole("button", { name: "동의하고 보장 분석 신청" }).click();
  await expect(page.getByText("보장 분석 상담을 위한 별도 동의가 필요합니다.")).toBeVisible();
  await expect(page).toHaveURL(/\/apply\/coverage$/);
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

test("같은 제출 키로 다시 보내면 새로 저장하지 않고 같은 신청번호", async ({ page, baseURL }) => {
  await page.goto("/");
  const key = `staging-replay-${Date.now()}`;
  const body = {
    serviceType: "hidden",
    name: NAME,
    phone: `010-0000-05${suffix}`,
    privacyConsent: true,
    elapsedMs: 3000,
    website: "",
    idempotencyKey: key,
    attribution: { utmSource: "staging_check" },
  };
  const send = () => page.request.post("/api/leads", { data: body, headers: { origin: baseURL!, referer: `${baseURL}/` } });
  const a = await (await send()).json();
  const b = await (await send()).json();
  expect(a.ok).toBe(true);
  expect(b.ok).toBe(true);
  expect(b.refNo).toBe(a.refNo);
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
});
