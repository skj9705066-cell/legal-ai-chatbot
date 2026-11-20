import { expect, test, type Page } from "@playwright/test";
import { applySubmit, fillApplyForm } from "./helpers";

/**
 * 배포 검증용 점검(2026-11 무료 방문 점검) — 로컬과 배포 사이트에 같은 기준을 적용한다.
 *   로컬:  npx playwright test release-check
 *   배포:  E2E_BASE_URL=https://insurance-check-demo.vercel.app DEMO_ADMIN_PASSWORD=… npx playwright test release-check
 * 확인 항목: ① 후킹 문구·고지 ② 카드포인트·미청구 보험금 안내 + 카드 → 관심 서비스 자동 체크
 *            ③ 방문 과정·안전 약속·운영자(설계사 소속) 고지 ④ 모바일 신청서: 직접 입력은 성함·휴대전화뿐, 나머지는 큰 버튼
 *            ⑤ 신청 저장 → 관리자 CRM 조회(지역·관심 서비스)
 * 데모 모드에서만 신청을 넣는다(가짜 이름·번호). 운영 모드면 신청 테스트를 건너뛴다.
 */

const REMOTE = !!process.env.E2E_BASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.E2E_BASE_URL);
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD || (REMOTE ? "" : "demo-admin-local");

// 로컬에서는 다른 E2E와 레이트리밋 버킷을 나눈다(배포 환경에서는 Vercel이 이 헤더를 덮어써 의미 없음).
test.use({ extraHTTPHeaders: { "x-real-ip": "release-check" } });

async function isDemo(page: Page) {
  return (await page.getByText("데모 모드").count()) > 0;
}

test("① 후킹 문구와 지급 비보장 고지", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("돈이");
  await expect(page.locator("#hero")).toContainText("사용하지 않은 카드포인트부터 청구하지 못한 보험금까지.");
  await expect(page.locator("#hero")).toContainText("각 보험사·카드사가 결정합니다");
});

test("② 안내 카드 3종 → 해당 항목이 체크된 신청서", async ({ page }) => {
  for (const id of ["card_points", "unclaimed", "hidden"]) {
    await page.goto("/");
    await page.getByTestId(`money-${id}`).getByRole("button").click();
    await expect(page.locator(`#apply-interest-${id}`), id).toBeChecked();
    await expect(page.locator("#apply-name")).toBeFocused();
  }
});

test("③ 방문 과정·안전 약속·운영자 고지", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("process-safety")).toContainText("비밀번호·인증번호·카드번호는 절대 여쭙지 않아요.");
  await expect(page.getByTestId("operator-notice")).toContainText("보험대리점 소속 보험설계사가 운영해요.");
  await expect(page.getByTestId("operator-notice")).toContainText("보험 가입은 조건이 아니에요.");
});

test("④ 모바일 신청서 간소화: 직접 입력 2칸 + 큰 선택 버튼", async ({ page, isMobile }) => {
  test.skip(!isMobile, "모바일 전용");
  await page.goto("/");
  test.skip((await page.getByText("현재 신청 접수를 준비하고 있어요").count()) > 0, "운영 모드 잠금 상태");
  const apply = page.locator("#apply");
  await apply.scrollIntoViewIfNeeded();
  await expect(apply.getByRole("button", { name: "다음", exact: true })).toHaveCount(0);
  const visibleInputs = await apply.locator("input[type=text], input[type=tel], input:not([type]), textarea, select").evaluateAll(
    (els) => els.filter((e) => (e as HTMLElement).offsetParent !== null && !e.closest("[aria-hidden=true]")).map((e) => e.id),
  );
  expect(visibleInputs.sort()).toEqual(["apply-name", "apply-phone"]);
  const box = (await applySubmit(page).boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(60);
  expect(box.width).toBeGreaterThan(page.viewportSize()!.width * 0.75);
  // 필수 동의 없이 누르면 접수되지 않는다
  await page.fill("#apply-name", "검증");
  await page.fill("#apply-phone", "010-9000-0451");
  await applySubmit(page).click();
  await expect(page).not.toHaveURL(/\/apply\/complete/);
});

test("⑤ 신청 저장 → 관리자 CRM 조회 (데모 모드)", async ({ page, isMobile }) => {
  test.skip(isMobile, "데스크톱에서 1회만");
  test.skip(!PASSWORD, "DEMO_ADMIN_PASSWORD가 없어 관리자 조회를 할 수 없음");
  await page.goto("/?utm_source=release_check&utm_medium=qa&utm_campaign=deploy_verify");
  test.skip(!(await isDemo(page)), "운영 모드 — 실고객 DB에 테스트 신청을 넣지 않음");

  await page.getByTestId("money-unclaimed").getByRole("button").click();
  await fillApplyForm(page, { name: "배포검증", phone: "010-9000-0452", region: "gyeonggi" });
  await page.waitForTimeout(2100); // 봇 차단용 최소 체류시간
  await applySubmit(page).click();
  await expect(page).toHaveURL(/\/apply\/complete$/);
  await expect(page.getByTestId("demo-receipt-note")).toBeVisible();
  const refNo = (await page.locator("strong.font-mono").first().textContent())!.trim();

  // 관리자 로그인 레이트리밋이 다른 테스트와 섞이지 않게(로컬 전용 — Vercel에서는 덮어써짐)
  await page.setExtraHTTPHeaders({ "x-real-ip": `release-${test.info().testId}` });
  await page.goto("/admin/login");
  await page.selectOption("#login-role", "admin");
  await page.fill("#login-password", PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto(`/admin?q=${encodeURIComponent(refNo)}`);
  const row = page.getByRole("row").filter({ hasText: refNo });
  await expect(row, "신청이 CRM에 없음 — 데모 메모리 저장소가 다른 서버 인스턴스에 있을 수 있음").toHaveCount(1);
  await expect(row).toContainText("미청구 보험금");
  await expect(row).toContainText("경기");
  await expect(row).toContainText("release_check");
  await expect(row).toContainText("010-****-0452");
  await row.getByRole("link", { name: refNo }).click();
  await expect(page.locator("div").filter({ has: page.getByText("광고성 정보(선택)", { exact: true }) }).last()).toContainText("미동의/철회");
});
