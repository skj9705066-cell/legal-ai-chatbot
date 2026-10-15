import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const FORBIDDEN = ["평균 404", "404만원", "모든 고객", "대상자로 선정", "금융위원회 인증", "100% 환급", "무조건"];

test("hero, stats with source and compliance copy", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("혹시 아직 받지 못한");
  await expect(page.getByText("병원비·수술비 미청구 보험금, 숨은 보험금, 과오납 보험료·해지환급금 확인 방법을 안내합니다.")).toBeVisible();
  for (const badge of ["무료 점검 안내", "보험 가입 필수 아님", "공식 조회 서비스 안내"]) {
    await expect(page.getByRole("listitem").filter({ hasText: badge }).first()).toBeVisible();
  }
  await expect(page.getByText("10조 3,000억원").first()).toBeVisible();
  await expect(page.getByText("약 3조 2,470억원").first()).toBeVisible();
  await expect(page.getByText("약 80만 건").first()).toBeVisible();
  await expect(page.locator('a[href="https://www.fsc.go.kr/po010103/87270"]').first()).toBeVisible();
  await expect(page.locator('a[href="https://cont.insure.or.kr"]').first()).toBeVisible();
  await expect(page.getByText("개인별 환급 가능 여부나 환급 금액을 의미하거나 보장하지 않습니다").first()).toBeVisible();
  const text = await page.locator("body").innerText();
  for (const f of FORBIDDEN) expect(text, `forbidden phrase: ${f}`).not.toContain(f);
  // 데모 모드 표시
  await expect(page.getByText("데모 모드").first()).toBeVisible();
});

test("all section CTAs lead to the single form", async ({ page }) => {
  await page.goto("/");
  expect(await page.locator("form").count()).toBe(1);
  await page.getByRole("button", { name: "내 보험금 점검 시작하기" }).first().click();
  await expect(page.locator("#apply")).toBeInViewport();
  // 유형 카드에서 고르면 폼에 반영
  await page.getByRole("button", { name: "이 유형으로 점검 신청" }).last().click();
  await expect(page.locator("#apply-type-refund")).toBeChecked();
  await expect(page.locator("#apply-name")).toBeFocused();
});

test("form validation: required fields, phone format, error focus", async ({ page }) => {
  await page.goto("/#apply");
  await page.getByRole("button", { name: "무료 점검 상담 신청하기" }).click();
  await expect(page.getByRole("alert").first()).toContainText("입력 내용을 확인해 주세요");
  await expect(page.locator("#apply-type-unclaimed")).toBeFocused();
  await page.locator("#apply-type-hidden").check();
  await page.fill("#apply-name", "홍길동");
  await page.fill("#apply-phone", "0101234");
  await page.getByRole("button", { name: "무료 점검 상담 신청하기" }).click();
  await expect(page.getByText("휴대전화번호 형식을 확인해 주세요")).toBeVisible();
  await expect(page.locator("#apply-phone")).toBeFocused();
  // 동의 기본 미체크
  await expect(page.locator("#apply-privacy")).not.toBeChecked();
  await expect(page.locator("#apply-marketing")).not.toBeChecked();
  // 동의 상세 내용 확인 가능
  await page.locator("#apply-privacy").locator("xpath=../..").getByRole("button", { name: "내용 보기" }).click();
  await expect(page.getByText("수집 목적").first()).toBeVisible();
  await expect(page.getByText("거부 권리").first()).toBeVisible();
});

test("accessibility: landing has no serious axe violations", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(900); // 등장 애니메이션(opacity) 종료 후 측정
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
});

test("responsive: no horizontal overflow", async ({ page }) => {
  for (const width of [360, 430, 1200]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test("mobile sticky CTA hides at hero and at the form", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/");
  const sticky = page.getByTestId("mobile-sticky-cta");
  await expect(sticky).toHaveAttribute("data-hidden", "true");
  await page.locator("#process").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-hidden", "false");
  await page.locator("#apply-name").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-hidden", "true");
});
