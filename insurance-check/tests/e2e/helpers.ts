import { expect, type Page } from "@playwright/test";

/**
 * 관리자 로그인 — 데모 모드는 데모 비밀번호+역할, 테스트(staging)·운영 모드는 Supabase Auth 이메일·비밀번호.
 * STAGING_ADMIN_EMAIL이 있으면 실제 DB 모드로 본다. 비밀번호는 환경변수로만 받는다.
 */
export async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  const email = process.env.STAGING_ADMIN_EMAIL;
  if (email) {
    await page.fill("#login-email", email);
    await page.fill("#login-password", process.env.STAGING_ADMIN_PASSWORD ?? "");
  } else {
    // 테스트·운영 모드 화면은 이메일 로그인만 있다. 계정 비밀값 없이 데모 로그인을 기다리면 시간 초과만 나므로 바로 알린다
    await page.locator("#login-password").waitFor();
    const demoLogin = await page.locator("#login-role").count();
    expect(demoLogin, "테스트(staging) 배포의 관리자 로그인에는 STAGING_ADMIN_EMAIL·STAGING_ADMIN_PASSWORD(GitHub Secrets)가 필요합니다").toBeGreaterThan(0);
    await page.selectOption("#login-role", "admin");
    await page.fill("#login-password", process.env.DEMO_ADMIN_PASSWORD || "demo-admin-local");
  }
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
