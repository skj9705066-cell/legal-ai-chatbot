import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function submitLead(page: Page, phone: string, utm = "") {
  const events: string[] = [];
  // sendBeacon 본문은 Playwright가 읽지 못하므로 fetch(keepalive) 폴백 경로로 검사한다.
  await page.addInitScript(() => Object.defineProperty(navigator, "sendBeacon", { value: undefined }));
  page.on("request", (req) => {
    if (req.url().endsWith("/api/events")) events.push(req.postData() ?? "");
  });
  await page.goto(`/${utm}`);
  await page.locator("#services").getByRole("button", { name: "조회가 어려우면 상담 신청" }).click();
  await expect(page.locator("#apply-name")).toBeFocused();
  await page.fill("#apply-name", "테스트");
  await page.fill("#apply-phone", phone);
  await page.getByRole("button", { name: "다음" }).click();
  await page.locator("#apply-time-weekday_afternoon").check({ force: true });
  await page.fill("#apply-memo", "만기 보험금 확인 문의");
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByRole("definition").filter({ hasText: "숨은·만기·휴면보험금" })).toBeVisible();
  await page.locator("#apply-privacy").check();
  await page.waitForTimeout(2100); // 봇 차단용 최소 체류시간
  await page.getByRole("button", { name: "무료 점검 신청하기" }).click();
  await expect(page).toHaveURL(/\/apply\/complete$/);
  await expect(page.getByRole("heading", { name: "보험금 점검 신청이 접수되었습니다" })).toBeVisible();
  return events;
}

test("A: claim → coverage offer → separate consent → coverage complete", async ({ page }) => {
  const events = await submitLead(page, "010-9000-0001", "?utm_source=e2e&utm_medium=test&utm_campaign=journey_a");
  await expect(page.getByRole("heading", { name: "현재 가입하신 보험, 보장도 함께 확인해 보시겠어요?" })).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(axe.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")).map((v) => v.id)).toEqual([]);

  await page.getByRole("link", { name: "무료 보장 분석 상담 신청" }).click();
  await expect(page).toHaveURL(/\/apply\/coverage$/);
  for (const t of ["상담 목적", "이용 항목", "연락 방법", "처리 주체"]) await expect(page.getByText(t, { exact: true }).first()).toBeVisible();
  await expect(page.locator("#cov-consent")).not.toBeChecked();
  await page.locator("#cov-method-phone").check({ force: true });
  await page.locator("#cov-time-weekday_morning").check({ force: true });
  await page.getByRole("button", { name: "동의하고 보장 분석 신청" }).click();
  await expect(page.getByText("보장 분석 상담을 위한 별도 동의가 필요합니다.")).toBeVisible();
  await expect(page).toHaveURL(/\/apply\/coverage$/);
  await page.locator("#cov-consent").check();
  await page.getByRole("button", { name: "동의하고 보장 분석 신청" }).click();
  await expect(page).toHaveURL(/\/apply\/coverage\/complete$/);
  await expect(page.getByRole("heading", { name: "보장 분석 상담도 함께 신청되었습니다" })).toBeVisible();

  // 이벤트 페이로드에 개인정보가 없어야 한다
  await page.waitForTimeout(300);
  const joined = events.join("\n");
  expect(joined).toContain("form_submit_success");
  expect(joined).toContain("coverage_opt_in");
  expect(joined).toContain('"utmSource":"e2e"');
  for (const pii of ["테스트", "9000", "만기 보험금"]) expect(joined).not.toContain(pii);
});

test("B: decline coverage → claim-only completion, no sales opt-in", async ({ page }) => {
  await submitLead(page, "010-9000-0002");
  await page.getByRole("button", { name: "보험금 점검만 이용할게요" }).click();
  await expect(page).toHaveURL(/\/apply\/done$/);
  await expect(page.getByRole("heading", { name: "보험금 점검 안내만 진행합니다" })).toBeVisible();
  // 뒤로 가서 다시 추가 신청을 시도해도 막힌다 (토큰 폐기)
  await page.goto("/apply/coverage");
  await expect(page.getByText("보장 분석 추가 신청을 진행할 수 없는 상태입니다")).toBeVisible();
});

test("direct access to completion page without a receipt shows an error state", async ({ page }) => {
  await page.goto("/apply/complete");
  await expect(page.getByRole("heading", { name: "신청 정보를 찾을 수 없습니다" })).toBeVisible();
});

test("privacy withdrawal request", async ({ page }) => {
  await page.goto("/privacy/withdraw");
  await page.locator("#wd-type-withdraw_marketing").check();
  await page.fill("#wd-name", "테스트");
  await page.fill("#wd-phone", "010-9000-0001");
  await page.getByRole("button", { name: "요청 접수" }).click();
  await expect(page.getByText("요청이 접수되었습니다")).toBeVisible();
});
