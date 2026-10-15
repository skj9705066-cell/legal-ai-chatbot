import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PASSWORD = process.env.DEMO_ADMIN_PASSWORD || "demo-admin-local";

async function login(page: Page, role: "admin" | "counselor" | "viewer") {
  await page.goto("/admin/login");
  await page.selectOption("#login-role", role);
  await page.fill("#login-password", PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe("admin", () => {
  test.skip(({ isMobile }) => isMobile, "desktop only");

  test("unauthenticated access is redirected", async ({ page }) => {
    await page.goto("/admin/performance");
    await expect(page).toHaveURL(/\/admin\/login$/);
    const res = await page.request.get("/api/admin/export");
    expect(res.status()).toBe(401);
  });

  test("wrong password is rejected", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#login-password", "wrong");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "올바르지 않거나" })).toBeVisible();
  });

  test("admin: CRM table, sales view, performance, audit, settings", async ({ page }) => {
    await login(page, "admin");
    await expect(page.getByRole("heading", { name: "상담 DB" })).toBeVisible();
    await expect(page.getByRole("link", { name: "CSV 내보내기" })).toBeVisible();
    for (const h of ["신청번호", "유입 채널/UTM", "보험금 점검 상태", "보장 분석 동의", "보장 분석 상태", "다음 연락", "담당자", "처리 메모"]) {
      await expect(page.getByRole("columnheader", { name: h })).toBeVisible();
    }
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? "")).map((v) => v.id)).toEqual([]);

    // 영업 대상 목록에는 미동의 고객이 없다
    await page.goto("/admin?view=sales");
    await expect(page.getByRole("heading", { name: "보장 분석 영업 대상" })).toBeVisible();
    await expect(page.locator("tbody").getByText("미동의")).toHaveCount(0);

    // 연락처 원문 열람은 감사로그에 남는다
    await page.goto("/admin");
    await page.locator("tbody a").first().click();
    await page.getByRole("button", { name: /원문 보기/ }).click();
    await expect(page.locator("text=/^010\\d{8}$/")).toBeVisible();
    await page.goto("/admin/audit");
    await expect(page.getByText("lead.reveal_phone").first()).toBeVisible();

    await page.goto("/admin/performance");
    await expect(page.getByRole("heading", { name: "광고 성과" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "유효 제출" })).toBeVisible();

    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "환경설정 · 배포 체크리스트" })).toBeVisible();
    await expect(page.getByText("APPROVAL_AD_REVIEW")).toBeVisible();
  });

  test("counselor: no CSV export, no audit/settings menu", async ({ page }) => {
    await login(page, "counselor");
    await expect(page.getByRole("link", { name: "CSV 내보내기" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "감사로그" })).toHaveCount(0);
    expect((await page.request.get("/api/admin/export")).status()).toBe(403);
  });

  test("viewer: read only", async ({ page }) => {
    await login(page, "viewer");
    await expect(page.locator("tbody select")).toHaveCount(0);
  });
});
