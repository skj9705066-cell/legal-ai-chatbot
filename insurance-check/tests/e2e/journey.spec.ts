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
  // 스토리 카드를 누르면 그 유형이 신청서에 반영되어 유형 단계 없이 바로 이름 입력
  await page.getByTestId("story-old-policy").click();
  await expect(page.locator("#apply-name")).toBeFocused();
  await page.fill("#apply-name", "테스트");
  await page.fill("#apply-phone", phone);
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await expect(page.getByRole("definition").filter({ hasText: "숨은·만기·휴면보험금" })).toBeVisible();
  // 선택 동의(마케팅)는 기본 해제 상태이고, 하지 않아도 신청된다
  await expect(page.locator("#apply-marketing")).not.toBeChecked();
  await page.locator("#apply-privacy").check();
  await page.waitForTimeout(2100); // 봇 차단용 최소 체류시간
  await page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true }).click();
  await expect(page).toHaveURL(/\/apply\/complete$/);
  await expect(page.getByRole("heading", { name: "무료 점검 상담 신청이 접수되었습니다." })).toBeVisible();
  await expect(page.getByTestId("contact-info")).toBeVisible();
  const refNo = (await page.locator("strong.font-mono").first().textContent())!.trim();
  return { events, refNo };
}

test("A: claim → coverage offer → separate consent → coverage complete", async ({ page }) => {
  const { events } = await submitLead(page, "010-9000-0001", "?utm_source=e2e&utm_medium=test&utm_campaign=journey_a");
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
  for (const ev of ["landing_view", "scenario_card_click", "check_type_select", "form_view", "form_start", "form_submit_attempt", "lead_submit_success"]) expect(joined).toContain(ev);
  expect(joined).toContain("coverage_opt_in");
  expect(joined).toContain('"utmSource":"e2e"');
  for (const pii of ["테스트", "9000"]) expect(joined).not.toContain(pii);
});

test("a failed save never shows the completion screen", async ({ page }) => {
  const events: string[] = [];
  await page.addInitScript(() => Object.defineProperty(navigator, "sendBeacon", { value: undefined }));
  page.on("request", (req) => {
    if (req.url().endsWith("/api/events")) events.push(req.postData() ?? "");
  });
  // 저장 API가 실패하는 상황(DB 장애 등)을 흉내 낸다
  await page.route("**/api/leads", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ ok: false, error: "일시적인 오류로 신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }) }));
  await page.goto("/");
  await page.getByTestId("story-hospital").click();
  await page.fill("#apply-name", "테스트");
  await page.fill("#apply-phone", "010-9000-0009");
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await page.locator("#apply-privacy").check();
  await page.waitForTimeout(2100);
  await page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "저장하지 못했습니다" })).toBeVisible();
  await expect(page).not.toHaveURL(/\/apply\/complete/);
  await page.waitForTimeout(300);
  const joined = events.join("\n");
  expect(joined).toContain("lead_submit_error");
  expect(joined).not.toContain("lead_submit_success");
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
