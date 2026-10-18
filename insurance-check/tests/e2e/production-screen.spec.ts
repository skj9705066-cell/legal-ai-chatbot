import { expect, test, type Page } from "@playwright/test";

/**
 * 운영(Production) 고객 화면 점검 — 운영 모드로 빌드한 서버에서만 실행한다(기본 E2E에서는 건너뜀).
 *   VERCEL_ENV=production npm run build && VERCEL_ENV=production npm start
 *   E2E_PRODUCTION=1 npx playwright test production-screen
 * ① 개발·테스트용 문구(데모·테스트 배지, '[설정 필요]', 배포 진단)가 고객 화면에 없다
 * ② 필수 고지(동의, 처리방침, 운영 주체·연락처·광고 심의 자리, 지급 비보장·손해사정·승환계약)는 남아 있다
 * ③ 준비 전에는 접수가 잠기고(전송 0건, API 503) 광고·분석 태그가 없다
 */

const ON = process.env.E2E_PRODUCTION === "1";
test.skip(!ON, "E2E_PRODUCTION=1 일 때만 실행 (운영 모드 빌드)");

// 'Vercel'은 내부 문구(배포 진단)로 보되, 처리방침·동의의 처리위탁 고지(수탁자 'Vercel Inc.', 'Vercel의 로그 보관')는 고객에게 꼭 보여야 하는 문구라 허용
const INTERNAL = /\[설정 필요|데모|테스트 모드|테스트 환경|Vercel(?! ?Inc\.|의 로그 보관)|환경변수|서비스 가칭|PREVIEW_TEST/;
const PAGES = ["/", "/privacy", "/privacy/withdraw", "/apply/complete", "/apply/done"];

async function visibleText(page: Page) {
  return page.locator("body").innerText();
}

for (const path of PAGES) {
  test(`① 내부 문구 없음: ${path}`, async ({ page }) => {
    await page.goto(path);
    const text = await visibleText(page);
    expect(text.match(INTERNAL)?.[0] ?? null).toBeNull();
  });
}

test("② 필수 고지가 남아 있다 (운영 주체 정보·처리방침·지급/손해사정/승환계약 고지)", async ({ page }) => {
  await page.goto("/");
  const op = page.getByTestId("apply-operator");
  for (const label of ["운영 주체", "소속 보험대리점", "담당 설계사", "고객 문의", "광고 심의"]) await expect(op).toContainText(label);
  await expect(op.getByRole("link", { name: "개인정보 처리방침" })).toBeVisible();
  const footer = page.locator("footer");
  for (const t of ["운영 주체", "개인정보 보호책임자", "광고 심의", "손해사정", "기존 보험계약을 해지하고"]) await expect(footer).toContainText(t);
  await expect(page.getByTestId("apply-trust")).toContainText("보험금 지급은 보장하지 않으며");

  await page.goto("/privacy");
  for (const t of ["1. 처리 주체", "2. 보험금 점검 신청 (필수 동의)", "5. 제3자 제공", "6. 처리위탁 및 국외 이전", "8. 개인정보의 파기", "11. 정보주체의 권리와 동의 철회", "12. 개인정보 보호책임자"]) {
    await expect(page.getByRole("heading", { name: t })).toBeVisible();
  }
});

test("③ 준비 전 접수 잠금: 동의 화면은 그대로, 신청은 전송되지 않고 API도 503", async ({ page, request, isMobile }) => {
  const posts: string[] = [];
  page.on("request", (r) => r.url().endsWith("/api/leads") && r.method() === "POST" && posts.push(r.url()));
  await page.goto("/#apply");
  await expect(page.getByText("현재 신청 접수를 준비하고 있어요")).toBeVisible();
  await expect(page.getByTestId("lock-diagnostics")).toHaveCount(0);

  const card = page.locator("#apply").getByRole("radiogroup").locator("label").filter({ hasText: "병원비·수술비" });
  if (isMobile) await card.tap();
  else await card.click();
  await page.locator("#apply").getByRole("button", { name: "다음", exact: true }).click();
  await expect(page.locator("#apply").getByText("개인정보 수집·이용 동의").first()).toBeVisible();
  await page.fill("#apply-name", "운영점검");
  await page.fill("#apply-phone", "01000000398");
  // force 금지: 이 화면은 부드러운 스크롤(scroll-behavior: smooth)을 쓰므로, 안정 대기 없이 누르면 스크롤 중 좌표를 놓쳐 체크가 안 될 수 있다
  await page.locator("#apply-privacy").check();
  await page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true }).click();
  await expect(page.getByTestId("apply-locked-notice")).toContainText("지금은 신청을 접수할 수 없어요");
  await expect(page.getByTestId("lock-diagnostics-notice")).toHaveCount(0);
  expect(posts).toHaveLength(0);

  const res = await request.post("/api/leads", { data: {}, headers: { origin: new URL(page.url()).origin } });
  expect(res.status()).toBe(503);
});

test("③ 준비 전에는 광고·분석 태그를 불러오지 않는다", async ({ page }) => {
  const tags: string[] = [];
  page.on("request", (r) => /googletagmanager|google-analytics|connect\.facebook\.net/.test(r.url()) && tags.push(r.url()));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(tags).toEqual([]);
});

test("④ 접수 상태 API: 잠김이고, 운영에서는 진단 정보(설정 이름 등)를 내보내지 않는다", async ({ request }) => {
  const res = await request.get("/api/status");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ submissionEnabled: false, diagnostics: null });
});

test("④ 운영에서는 데모 관리자 로그인(역할 선택·데모 비밀번호)이 화면·API 모두 막혀 있다", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: "상담 관리자 로그인" })).toBeVisible();
  await expect(page.locator("#login-role")).toHaveCount(0);
  const origin = new URL(page.url()).origin;
  const res = await page.request.post("/api/admin/login", { data: { role: "admin", password: "demo-admin-local" }, headers: { origin, referer: `${origin}/admin/login` } });
  expect(res.ok(), `데모 로그인 응답 ${res.status()}`).toBe(false);
  expect(res.headers()["set-cookie"] ?? "").not.toContain("ic_admin");
});
