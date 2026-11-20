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

/** 신청서(2026-11 방문 점검)의 신청 버튼 */
export const applySubmit = (page: Page) => page.locator("#apply form").getByRole("button", { name: "무료 점검 신청하기", exact: true });

/**
 * 신청서 채우기 — 보이는 선택 버튼(라벨)을 누른다. 안내 카드에서 이미 고른 관심 서비스는 그대로 둔다.
 * 가상 이름·테스트 번호(010-0000-xxxx)만 넘길 것.
 */
export async function fillApplyForm(
  page: Page,
  o: { name?: string; phone: string; region?: string; time?: string; interests?: readonly string[]; tap?: boolean },
) {
  await waitFormReady(page);
  const press = async (inputId: string) => {
    const label = page.locator(`label:has(#${inputId})`);
    if (o.tap) await label.tap();
    else await label.click();
  };
  await page.fill("#apply-name", o.name ?? "흐름검사");
  await page.fill("#apply-phone", o.phone);
  await press(`apply-region-${o.region ?? "seoul"}`);
  await press(`apply-time-${o.time ?? "anytime"}`);
  const interests = o.interests ?? [];
  for (const i of interests) if (!(await page.locator(`#apply-interest-${i}`).isChecked())) await press(`apply-interest-${i}`);
  // 아무 항목도 고르지 않은 상태라면 '잘 모르겠어요'
  if (!interests.length && (await page.locator('#apply input[name="interests"]:checked').count()) === 0) await press("apply-interest-not_sure");
  const consent = page.locator('label[for="apply-privacy"]');
  if (!(await page.locator("#apply-privacy").isChecked())) {
    if (o.tap) await consent.tap();
    else await consent.click();
  }
}

/** 신청서 스크립트가 붙을 때까지 기다린다(준비 전에는 신청 버튼이 아무것도 전송하지 않는다) */
export async function waitFormReady(page: Page) {
  await page.locator('#apply form[data-ready="true"]').waitFor();
}
