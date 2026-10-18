import { expect, test } from "@playwright/test";
import { adminLogin } from "./helpers";

/**
 * 오류 상황 — 사용자가 이해할 수 있는 안내가 뜨고, 실패를 성공처럼 보이지 않으며, 권한 없는 접근은 막힌다.
 * (이름 누락·잘못된 번호·동의 누락·연타·네트워크 끊김·새로고침/뒤로가기는 apply-flow.spec.ts, 저장 실패 500은 journey.spec.ts)
 */

const REAL_DB = process.env.E2E_STAGING === "1";

test("전화번호 미입력: 안내 문구가 뜨고 전송하지 않는다 @preview", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (r) => r.url().endsWith("/api/leads") && r.method() === "POST" && posts.push(r.url()));
  await page.goto("/#apply");
  await page.locator("#apply").getByRole("radiogroup").locator("label").filter({ hasText: "병원비·수술비" }).click();
  await page.locator("#apply").getByRole("button", { name: "다음", exact: true }).click();
  await page.fill("#apply-name", "오류검사");
  await page.locator("#apply-privacy").check();
  await page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true }).click();
  await expect(page.getByText("휴대전화번호를 입력해 주세요.")).toBeVisible();
  await expect(page.locator("#apply-phone")).toBeFocused();
  expect(posts).toHaveLength(0);
});

test("DB 장애(503): 완료 화면 없이 안내 → 복구 후 다시 누르면 같은 제출 키로 정상 접수", async ({ page }) => {
  test.skip(REAL_DB, "실제 DB에는 신청을 추가로 보내지 않는다");
  await page.setExtraHTTPHeaders({ "x-real-ip": "err-db-down" });
  const keys: string[] = [];
  let down = true;
  await page.route("**/api/leads", async (route) => {
    keys.push(JSON.parse(route.request().postData() ?? "{}").idempotencyKey);
    if (down) {
      // 서버가 DB 자동 점검 실패 시 실제로 돌려주는 응답과 같은 형식
      return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: "현재 신청 접수를 일시 중단했습니다. 잠시 후 다시 시도해 주세요." }) });
    }
    return route.continue();
  });
  await page.goto("/");
  await page.getByTestId("claim-case-cta-small-bills").click();
  await page.fill("#apply-name", "오류검사");
  await page.fill("#apply-phone", "010-0000-0481");
  await page.locator("#apply-privacy").check();
  await page.waitForTimeout(2100);
  const submit = page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true });
  await submit.click();
  await expect(page.getByRole("alert").filter({ hasText: "일시 중단" })).toBeVisible();
  await expect(page).not.toHaveURL(/\/apply\/complete/);
  // 입력값 유지, 버튼 다시 사용 가능
  await expect(page.locator("#apply-name")).toHaveValue("오류검사");
  await expect(submit).toBeEnabled();
  down = false;
  await submit.click();
  await expect(page).toHaveURL(/\/apply\/complete$/);
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]); // 같은 제출 키 → 서버가 중복 저장하지 않는다
});

test("세션 만료: 편집 중 로그인이 풀리면 저장되지 않고 '다시 로그인' 안내, 목록 접근은 로그인 화면으로 @preview", async ({ page, context }) => {
  await page.setExtraHTTPHeaders({ "x-real-ip": "err-session" });
  await adminLogin(page);
  const first = page.locator("tbody a").first();
  const refNo = (await first.textContent())!.trim();
  await first.click();
  await expect(page.locator("h1")).toContainText(refNo);
  await context.clearCookies(); // 세션 만료와 같은 상태
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("로그인이 만료되었어요. 다시 로그인해 주세요.")).toBeVisible();
  await expect(page.getByText("저장되었습니다.")).toHaveCount(0);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("비인가 접근: 위조 세션 쿠키·로그인 없는 관리자 API는 모두 거절된다 @preview", async ({ page, context, baseURL }) => {
  const host = new URL(baseURL!).hostname;
  await context.addCookies([{ name: "ic_admin", value: "eyJzdWIiOiJldmlsIiwicm9sZSI6ImFkbWluIn0.forged", domain: host, path: "/" }]);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/\/admin\/login$/);
  const same = { origin: baseURL!, referer: `${baseURL}/admin` };
  for (const [method, path] of [
    ["GET", "/api/admin/export"],
    ["PATCH", "/api/admin/leads/00000000-0000-0000-0000-000000000000"],
    ["POST", "/api/admin/leads/00000000-0000-0000-0000-000000000000/reveal"],
    ["POST", "/api/admin/reviews"],
  ] as const) {
    const res = await page.request.fetch(path, { method, headers: same, data: method === "GET" ? undefined : {} });
    expect(res.status(), `${method} ${path}`).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("unauthorized");
    expect(JSON.stringify(body)).not.toMatch(/stack|supabase|postgres|Error:/i); // 내부 정보 없음
  }
});

test("다른 출처에서 보낸 관리자 변경 요청은 로그인 상태여도 거절된다(CSRF) @preview", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-real-ip": "err-csrf" });
  await adminLogin(page);
  const id = (await page.locator("tbody a").first().getAttribute("href"))!.split("/").pop()!;
  const res = await page.request.patch(`/api/admin/leads/${id}`, { headers: { origin: "https://evil.example" }, data: { memo: "x" } });
  expect(res.status()).toBe(403);
  expect((await res.json()).code).toBe("bad_origin");
});
