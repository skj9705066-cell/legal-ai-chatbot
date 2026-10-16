import { expect, test, type Page } from "@playwright/test";

/**
 * 배포 검증용 점검 — 로컬과 배포 사이트에 같은 기준을 적용한다.
 *   로컬:  npx playwright test release-check
 *   배포:  E2E_BASE_URL=https://insurance-check-demo.vercel.app DEMO_ADMIN_PASSWORD=… npx playwright test release-check
 * 확인 항목: ① 사례 5개 중 3개 우선 노출 ② 나머지 2개 접힘 ③ 사례별 신청 유형 자동 선택
 *            ④ '보험사 심사 및 지급 여부 결정' 문구 ⑤ 모바일 신청 2단계 ⑥ 신청 저장 → 관리자 CRM 조회
 * 데모 모드에서만 신청을 넣는다(가짜 이름·번호). 운영 모드면 신청 테스트를 건너뛴다.
 */

const REMOTE = !!process.env.E2E_BASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.E2E_BASE_URL);
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD || (REMOTE ? "" : "demo-admin-local");

// 로컬에서는 다른 E2E와 레이트리밋 버킷을 나눈다(배포 환경에서는 Vercel이 이 헤더를 덮어써 의미 없음).
test.use({ extraHTTPHeaders: { "x-real-ip": "release-check" } });

const PRIMARY = [
  { id: "small-bills", quote: "병원비가 얼마 안 나와서 그냥 넘어갔어요.", kind: "실손의료보험", last: "보험사 심사 및 지급 여부 결정", pick: "병원비·수술비" },
  { id: "surgery-rider", quote: "수술했을 때 실손보험만 받으면 끝인 줄 알았어요.", kind: "수술비 특약", last: "보험사 심사 및 지급 여부 결정", pick: "병원비·수술비" },
  { id: "maturity", quote: "오래전에 가입한 보험이라 만기된 줄도 몰랐어요.", kind: "만기보험금", last: "보험사 지급 신청", pick: "숨은·만기보험금" },
];
const MORE = [
  { id: "diagnosis", quote: "진단을 받았는데 진단비는 생각 못 했어요.", kind: "진단비 특약", last: "보험사 심사 및 지급 여부 결정", pick: "병원비·수술비" },
  { id: "dormant", quote: "중간에 받을 돈이 있는 줄 몰랐어요.", kind: "중도·휴면보험금", last: "보험사 지급 신청", pick: "숨은·만기보험금" },
];

const slides = (page: Page) => page.getByTestId("claim-cases-track-slide");
const moreButton = (page: Page) => page.locator("#claim-cases").getByRole("button", { name: /다른 사례/ });

async function isDemo(page: Page) {
  return (await page.getByText("데모 모드").count()) > 0;
}

test("① 3개 우선 노출 ② 나머지 2개 접힘 ④ 심사·지급 문구", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#claim-cases");
  await expect(section.getByRole("heading", { name: "실손보험만 받고 끝인 줄 아셨나요?" })).toBeVisible();

  // ① 처음에는 정해진 순서의 3장만
  await expect(slides(page)).toHaveCount(3);
  for (const [i, c] of PRIMARY.entries()) {
    const card = slides(page).nth(i);
    await expect(card).toContainText(c.quote);
    await expect(card).toContainText(c.kind);
    await expect(card).toContainText("상황별 확인 절차 예시");
    await expect(card.locator("ol li").last()).toHaveText(new RegExp(`${c.last}$`)); // ④
  }

  // ② 나머지 2장은 접힌 상태(DOM에도 없음) → '다른 사례 보기'로 펼침 → 다시 접기
  for (const c of MORE) await expect(section.getByText(c.quote)).toHaveCount(0);
  await expect(moreButton(page)).toHaveText(/다른 사례 보기 \(2\)/);
  await expect(moreButton(page)).toHaveAttribute("aria-expanded", "false");
  await moreButton(page).click();
  await expect(slides(page)).toHaveCount(5);
  await expect(moreButton(page)).toHaveAttribute("aria-expanded", "true");
  for (const [i, c] of MORE.entries()) {
    const card = slides(page).nth(3 + i);
    await expect(card).toContainText(c.quote);
    await expect(card.locator("ol li").last()).toHaveText(new RegExp(`${c.last}$`));
  }
  await moreButton(page).click();
  await expect(slides(page)).toHaveCount(3);

  // 지급 보장·실제 후기처럼 보이는 표현이 없다
  await expect(section).not.toContainText(/지급 보장|실제 지급 후기입니다|고객 후기/);
  await expect(section).toContainText("소멸시효");
});

test("③ 사례 버튼 → 해당 유형이 선택된 신청 단계", async ({ page }) => {
  for (const c of [...PRIMARY, ...MORE]) {
    await page.goto("/");
    if (MORE.includes(c)) await moreButton(page).click();
    await page.getByTestId(`claim-case-cta-${c.id}`).click();
    await expect(page.getByTestId("apply-picked-type"), c.id).toContainText(c.pick);
    await expect(page.locator("#apply-name")).toBeVisible();
  }
});

test("⑤ 모바일 신청 단계 간소화 (2단계, 필수 4항목)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "모바일 전용");
  await page.goto("/");
  test.skip((await page.getByText("현재 신청 접수를 준비하고 있어요").count()) > 0, "운영 모드 잠금 상태 — 폼 없음");

  // 유형을 고르지 않고 시작: 1단계 유형 선택 → 고르면 바로 2단계
  await page.locator("#apply").scrollIntoViewIfNeeded();
  await expect(page.locator("#apply").getByText(/1단계\s*\/\s*2/)).toBeVisible();

  // 사례에서 유형을 고르고 오면 유형 단계를 건너뛰고 2단계 한 화면
  await page.goto("/");
  await page.getByTestId("claim-case-cta-small-bills").click();
  const apply = page.locator("#apply");
  await expect(apply.getByText(/2단계\s*\/\s*2/)).toBeVisible();
  await expect(page.getByTestId("apply-picked-type")).toContainText("병원비·수술비");
  await expect(page.locator("#apply-name")).toBeVisible();
  await expect(page.locator("#apply-phone")).toBeVisible();
  await expect(page.locator("#apply-privacy")).not.toBeChecked();
  await expect(page.locator("#apply-marketing")).not.toBeChecked();
  await expect(apply.getByRole("button", { name: "다음", exact: true })).toHaveCount(0);
  // 사용자가 직접 입력하는 칸은 이름·휴대전화뿐
  const visibleInputs = await apply.locator("input[type=text], input[type=tel], input:not([type]), textarea, select").evaluateAll(
    (els) => els.filter((e) => (e as HTMLElement).offsetParent !== null && !e.closest("[aria-hidden=true]")).map((e) => e.id),
  );
  expect(visibleInputs.sort()).toEqual(["apply-name", "apply-phone"]);

  const submit = apply.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true });
  const box = (await submit.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(48);
  expect(box.width).toBeGreaterThan(page.viewportSize()!.width * 0.75);

  // 필수 동의 없이 누르면 접수되지 않는다
  await page.fill("#apply-name", "검증");
  await page.fill("#apply-phone", "010-9000-0451");
  await submit.click();
  await expect(page).not.toHaveURL(/\/apply\/complete/);
});

test("⑥ 신청 저장 → 관리자 CRM 조회 (데모 모드)", async ({ page, isMobile }) => {
  test.skip(isMobile, "데스크톱에서 1회만");
  test.skip(!PASSWORD, "DEMO_ADMIN_PASSWORD가 없어 관리자 조회를 할 수 없음");
  await page.goto("/?utm_source=release_check&utm_medium=qa&utm_campaign=deploy_verify");
  test.skip(!(await isDemo(page)), "운영 모드 — 실고객 DB에 테스트 신청을 넣지 않음");

  await page.getByTestId("claim-case-cta-surgery-rider").click();
  await page.fill("#apply-name", "배포검증");
  await page.fill("#apply-phone", "010-9000-0452");
  await page.locator("#apply-privacy").check();
  await page.waitForTimeout(2100); // 봇 차단용 최소 체류시간
  await page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true }).click();
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
  await expect(row).toContainText("release_check");
  await expect(row).toContainText("010-****-0452");
  await row.getByRole("link", { name: refNo }).click();
  await expect(page.locator("div").filter({ has: page.getByText("광고성 정보(선택)", { exact: true }) }).last()).toContainText("미동의/철회");
});
