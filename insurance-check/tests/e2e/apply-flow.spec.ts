import { expect, test, type Page } from "@playwright/test";
import { adminLogin, waitFormReady } from "./helpers";

/**
 * 신청 전체 흐름(2026-11 방문 점검 신청서) — 실제 사용자처럼 '보이는 버튼'을 누른다(숨은 입력을 강제로 체크하지 않는다).
 * A 랜딩 → B CTA → C 성함·휴대전화 입력 → D 지역·연락 희망 시간·관심 서비스 선택 → E 필수 동의 → F 제출 → G 응답 → H 완료 화면
 * → I 보장 분석(별도·선택) → J CRM 조회(지역·관심 서비스) → K CSV. 가상 이름·테스트 번호(010-0000-xxxx)만 사용.
 * DB(Supabase) 저장 자체는 staging-db.spec.ts가 테스트 모드 배포에서 확인한다.
 * '@preview' 표시 테스트는 신청을 보내지 않아 실제 Preview에서도 그대로 돌린다(.github/workflows/insurance-check-preview-e2e.yml).
 */

const FLOWS = [
  { key: "card", interests: ["card_points"], region: "seoul", time: "weekday_morning", crm: "카드포인트", regionLabel: "서울", type: "card_points", coverage: "opt_in" },
  { key: "multi", interests: ["unclaimed", "hidden"], region: "gyeonggi", time: "weekday_afternoon", crm: "미청구 보험금, 숨은·만기 보험금", regionLabel: "경기", type: "general", coverage: "decline" },
  { key: "unsure", interests: ["not_sure"], region: "incheon", time: "anytime", crm: "전체 안내", regionLabel: "인천", type: "general", coverage: "skip" },
] as const;

/** 신청 API 레이트리밋(IP당 10분 5건)이 테스트끼리 섞이지 않도록 테스트마다 다른 IP 키(로컬 전용 — Vercel에서는 덮어써짐) */
async function isolate(page: Page, key: string, isMobile: boolean) {
  await page.setExtraHTTPHeaders({ "x-real-ip": `flow-${key}-${isMobile ? "m" : "d"}` });
}

/** 보이는 선택 버튼(라벨)을 누른다. 모바일은 탭 */
async function pick(page: Page, inputId: string, isMobile: boolean) {
  const label = page.locator(`label:has(#${inputId})`);
  if (isMobile) await label.tap();
  else await label.click();
}

const submitButton = (page: Page) => page.locator("#apply form").getByRole("button", { name: "무료 점검 신청하기", exact: true });

/** 신청 접수 잠김(운영 정보·승인 미완료) 화면인지 */
const isLocked = async (page: Page) => (await page.getByText("현재 신청 접수를 준비하고 있어요").count()) > 0;

/** 사용자처럼 칸을 누르고(모바일은 탭) 포커스가 갔는지 확인한 뒤 키보드로 입력한다(fill로 값을 밀어 넣지 않는다) */
async function typeInto(page: Page, selector: string, text: string, isMobile: boolean) {
  const el = page.locator(selector);
  if (isMobile) await el.tap();
  else await el.click();
  await expect(el).toBeFocused();
  await page.keyboard.type(text);
}

/** 동의 체크: 보이는 문구(라벨)를 누른다 */
async function tapConsent(page: Page, id: string, isMobile: boolean) {
  const label = page.locator(`label[for="${id}"]`);
  if (isMobile) await label.tap();
  else await label.click();
}

/** 신청서 채우기(안내 카드에서 이미 고른 관심 서비스는 그대로 둔다) */
async function fillForm(
  page: Page,
  o: { name?: string; phone: string; region?: string; time?: string; interests?: readonly string[] },
  isMobile: boolean,
) {
  await waitFormReady(page);
  await page.fill("#apply-name", o.name ?? "흐름검사");
  await page.fill("#apply-phone", o.phone);
  await pick(page, `apply-region-${o.region ?? "seoul"}`, isMobile);
  await pick(page, `apply-time-${o.time ?? "anytime"}`, isMobile);
  for (const i of o.interests ?? []) if (!(await page.locator(`#apply-interest-${i}`).isChecked())) await pick(page, `apply-interest-${i}`, isMobile);
  await tapConsent(page, "apply-privacy", isMobile);
}

test("입력: 칸을 누르면 포커스·타이핑·수정이 되고, 선택 버튼과 필수·선택 동의는 서로 독립적이다 @preview", async ({ page, isMobile }) => {
  const posts: string[] = [];
  page.on("request", (r) => r.url().endsWith("/api/leads") && r.method() === "POST" && posts.push(r.url()));
  await page.goto("/");
  await waitFormReady(page);
  await page.locator("#hero-cta").getByRole("button").first().click();
  await expect(page.locator("#apply-name")).toBeFocused();
  for (const id of ["#apply-name", "#apply-phone", "#apply-privacy", "#apply-marketing"]) await expect(page.locator(id)).toBeEnabled();
  await typeInto(page, "#apply-name", "흐름검사", isMobile);
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("확인");
  await expect(page.locator("#apply-name")).toHaveValue("흐름확인");
  await typeInto(page, "#apply-phone", "01000000392", isMobile);
  await expect(page.locator("#apply-phone")).toHaveValue("010-0000-0392");
  // 지역·시간은 하나만, 관심 서비스는 여러 개
  await pick(page, "apply-region-seoul", isMobile);
  await pick(page, "apply-region-incheon", isMobile);
  await expect(page.locator("#apply-region-incheon")).toBeChecked();
  await expect(page.locator("#apply-region-seoul")).not.toBeChecked();
  await pick(page, "apply-time-weekday_evening", isMobile);
  await expect(page.locator("#apply-time-weekday_evening")).toBeChecked();
  await pick(page, "apply-interest-card_points", isMobile);
  await pick(page, "apply-interest-unclaimed", isMobile);
  await expect(page.locator("#apply-interest-card_points")).toBeChecked();
  await expect(page.locator("#apply-interest-unclaimed")).toBeChecked();
  await pick(page, "apply-interest-card_points", isMobile);
  await expect(page.locator("#apply-interest-card_points")).not.toBeChecked();
  // 선택 표시: 딥그린 채움
  await expect(page.locator("label:has(#apply-region-incheon)")).toHaveClass(/bg-forest/);
  await tapConsent(page, "apply-privacy", isMobile);
  await expect(page.locator("#apply-privacy")).toBeChecked();
  await expect(page.locator("#apply-marketing")).not.toBeChecked();
  await tapConsent(page, "apply-marketing", isMobile);
  await tapConsent(page, "apply-privacy", isMobile);
  await expect(page.locator("#apply-privacy")).not.toBeChecked();
  await expect(page.locator("#apply-marketing")).toBeChecked();
  expect(posts).toHaveLength(0);
});

test("잠김: 접수가 잠겨 있어도 입력·선택·동의는 모두 되고, 신청 버튼은 전송 없이 접수 불가 안내만 띄운다 @preview", async ({ page, isMobile }) => {
  const posts: string[] = [];
  page.on("request", (r) => r.url().endsWith("/api/leads") && r.method() === "POST" && posts.push(r.url()));
  await page.goto("/#apply");
  await waitFormReady(page);
  test.skip(!(await isLocked(page)), "접수가 열린 화면 — 잠김 상태 전용 테스트");
  const submit = submitButton(page);
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText("성함을 입력해 주세요.")).toBeVisible();
  await expect(page.getByTestId("apply-locked-notice")).toHaveCount(0);
  await fillForm(page, { phone: "010-0000-0394", interests: ["hidden"] }, isMobile);
  await submit.click();
  await expect(page.getByTestId("apply-locked-notice")).toContainText("지금은 신청을 접수할 수 없어요");
  await page.waitForTimeout(500);
  expect(posts).toHaveLength(0);
  await expect(page).not.toHaveURL(/\/apply\/complete/);
  await expect(page.locator("#apply-name")).toHaveValue("흐름검사");
  await expect(page.locator("#apply-interest-hidden")).toBeChecked();
});

test("키보드만으로: 화살표로 지역 이동, 스페이스로 관심 서비스 체크 @preview", async ({ page, isMobile }) => {
  test.skip(isMobile, "키보드 시나리오는 데스크톱");
  await page.goto("/#apply");
  await waitFormReady(page);
  await page.locator("#apply-region-seoul").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#apply-region-seoul")).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#apply-region-gyeonggi")).toBeChecked();
  await page.locator("#apply-interest-hidden").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#apply-interest-hidden")).toBeChecked();
});

for (const [i, f] of FLOWS.entries()) {
  test(`전체 흐름 · ${f.crm}: 신청 → 완료 → 보장 분석(${f.coverage}) → CRM → CSV`, async ({ page, isMobile }) => {
    await isolate(page, f.key, isMobile);
    const phoneTail = `${isMobile ? 5 : 4}${i}${String(Date.now() % 100).padStart(2, "0")}`;
    const posts: { status: number; body: string }[] = [];
    page.on("response", async (r) => {
      if (r.url().endsWith("/api/leads") && r.request().method() === "POST") posts.push({ status: r.status(), body: r.request().postData() ?? "" });
    });

    await page.goto("/"); // A
    await waitFormReady(page);
    await page.locator("#hero-cta").getByRole("button").first().click(); // B
    await fillForm(page, { phone: `010-0000-${phoneTail}`, region: f.region, time: f.time, interests: f.interests }, isMobile); // C·D·E
    await expect(page.locator("#apply-marketing")).not.toBeChecked();
    await page.waitForTimeout(2100);
    await submitButton(page).click(); // F
    await expect(page).toHaveURL(/\/apply\/complete$/); // H
    expect(posts).toHaveLength(1); // G
    expect(posts[0].status).toBe(200);
    expect(JSON.parse(posts[0].body)).toMatchObject({ interests: [...f.interests], region: f.region, preferredTime: f.time, privacyConsent: true, marketingConsent: false });
    const refNo = (await page.locator("strong.font-mono").first().textContent())!.trim();

    // I: 보장 분석은 별도 화면의 선택 항목, 기본 해제
    if (f.coverage === "opt_in") {
      await page.getByRole("link", { name: "무료 보장 분석 상담 신청" }).click();
      await expect(page.locator("#cov-consent")).not.toBeChecked();
      await page.locator("#cov-method-phone").check({ force: true });
      await page.locator("#cov-time-weekday_morning").check({ force: true });
      await page.locator("#cov-consent").check();
      await page.getByRole("button", { name: "동의하고 보장 분석 신청" }).click();
      await expect(page).toHaveURL(/\/apply\/coverage\/complete$/);
    } else if (f.coverage === "decline") {
      await page.getByRole("button", { name: "보험금 점검만 이용할게요" }).click();
      await expect(page).toHaveURL(/\/apply\/done$/);
    }

    // J·K: CRM 조회(관심 서비스·지역·연락 희망 시간) + CSV
    await adminLogin(page);
    await page.goto(`/admin?q=${encodeURIComponent(refNo)}`);
    const row = page.getByRole("row").filter({ hasText: refNo });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(f.crm);
    await expect(row).toContainText(f.regionLabel);
    await expect(row).toContainText(`010-****-${phoneTail}`);
    await expect(row).toContainText(f.coverage === "opt_in" ? "상담 대기" : "별도 동의 없음");
    const csv = await (await page.request.get(`/api/admin/export?q=${encodeURIComponent(refNo)}`)).text();
    expect(csv).toContain(refNo);
    expect(csv).toContain(`"${f.regionLabel}"`);
    expect(csv).toContain(`010-****-${phoneTail}`);
    expect(csv).not.toContain(`0100000${phoneTail}`); // CSV에 원문 번호 없음
  });
}

test("오류: 필수 입력 누락 · 잘못된 연락처 · 동의 누락은 제출되지 않는다 @preview", async ({ page, isMobile }) => {
  await isolate(page, "invalid", isMobile);
  const posts: string[] = [];
  page.on("request", (r) => r.url().endsWith("/api/leads") && r.method() === "POST" && posts.push(r.url()));
  await page.goto("/#apply");
  await waitFormReady(page);
  const submit = submitButton(page);
  await submit.click();
  await expect(page.getByText("성함을 입력해 주세요.")).toBeVisible();
  await expect(page.getByText("궁금하신 내용을 하나 이상 골라 주세요.")).toBeVisible();
  await page.fill("#apply-name", "흐름검사");
  await page.fill("#apply-phone", "02-123-4567");
  await pick(page, "apply-region-seoul", isMobile);
  await pick(page, "apply-time-anytime", isMobile);
  await pick(page, "apply-interest-unclaimed", isMobile);
  await submit.click();
  await expect(page.getByText("휴대전화번호를 다시 확인해 주세요")).toBeVisible();
  await page.fill("#apply-phone", "010-0000-0399");
  await submit.click();
  await expect(page.getByText("개인정보 수집·이용에 동의해 주셔야 신청할 수 있어요.")).toBeVisible();
  // 고친 칸의 오류 문구는 바로 사라진다
  await expect(page.getByText("성함을 입력해 주세요.")).toHaveCount(0);
  expect(posts).toHaveLength(0);
});

test("중복 제출: 신청 버튼을 연달아 눌러도 요청은 한 번", async ({ page, isMobile }) => {
  await isolate(page, "double", isMobile);
  const posts: string[] = [];
  page.on("request", (r) => r.url().endsWith("/api/leads") && r.method() === "POST" && posts.push(r.postData() ?? ""));
  await page.goto("/");
  await waitFormReady(page);
  await page.getByTestId("money-unclaimed").getByRole("button").click();
  await fillForm(page, { phone: "010-0000-0311" }, isMobile);
  await page.waitForTimeout(2100);
  // 사람의 연타보다 빠른 조건: 같은 순간에 세 번 클릭(렌더링 사이 틈이 없음)
  await submitButton(page).evaluate((b) => {
    for (let i = 0; i < 3; i++) (b as HTMLButtonElement).click();
  });
  await expect(page).toHaveURL(/\/apply\/complete$/);
  expect(posts).toHaveLength(1);
});

test("네트워크 오류 → 완료 화면 없이 안내 → 다시 누르면 같은 제출 키로 1건만 저장", async ({ page, isMobile }) => {
  await isolate(page, "network", isMobile);
  const bodies: string[] = [];
  let fail = true;
  await page.route("**/api/leads", async (route) => {
    bodies.push(route.request().postData() ?? "");
    if (fail) return route.abort("internetdisconnected");
    return route.continue();
  });
  await page.goto("/");
  await waitFormReady(page);
  await page.getByTestId("money-hidden").getByRole("button").click();
  await fillForm(page, { phone: "010-0000-0321" }, isMobile);
  await page.waitForTimeout(2100);
  const submit = submitButton(page);
  await submit.click();
  await expect(page.getByRole("alert").first()).toBeVisible();
  await expect(page).not.toHaveURL(/\/apply\/complete/);
  fail = false;
  await submit.click();
  await expect(page).toHaveURL(/\/apply\/complete$/);
  expect(bodies).toHaveLength(2);
  const [k1, k2] = bodies.map((b) => JSON.parse(b).idempotencyKey);
  expect(k1).toBeTruthy();
  expect(k2).toBe(k1); // 재시도는 같은 제출 키 → 서버·DB가 한 건으로 묶는다
});

test("새로고침·뒤로가기: 완료 화면은 새로고침해도 유지되고, 뒤로 가도 다시 제출되지 않는다", async ({ page, isMobile }) => {
  await isolate(page, "nav", isMobile);
  const posts: string[] = [];
  page.on("request", (r) => r.url().endsWith("/api/leads") && r.method() === "POST" && posts.push(r.url()));
  await page.goto("/");
  await waitFormReady(page);
  await page.getByTestId("money-card_points").getByRole("button").click();
  await fillForm(page, { phone: "010-0000-0331" }, isMobile);
  await page.waitForTimeout(2100);
  await submitButton(page).click();
  await expect(page).toHaveURL(/\/apply\/complete$/);
  const refNo = (await page.locator("strong.font-mono").first().textContent())!.trim();
  await page.reload();
  await expect(page.locator("strong.font-mono").first()).toHaveText(refNo);
  await page.goBack();
  await expect(page).not.toHaveURL(/\/apply\/complete/);
  await page.waitForTimeout(500);
  expect(posts).toHaveLength(1);
});

test("중복 제출: 보장 분석 동의·철회 요청도 연타 시 요청은 한 번", async ({ page, isMobile }) => {
  await isolate(page, "double2", isMobile);
  const posts: string[] = [];
  page.on("request", (r) => r.method() === "POST" && /\/api\/(leads\/coverage|privacy-requests)$/.test(r.url()) && posts.push(new URL(r.url()).pathname));
  // 보장 분석 별도 동의
  await page.goto("/");
  await waitFormReady(page);
  await page.getByTestId("money-hidden").getByRole("button").click();
  await fillForm(page, { phone: "010-0000-0341" }, isMobile);
  await page.waitForTimeout(2100);
  await submitButton(page).click();
  await expect(page).toHaveURL(/\/apply\/complete$/);
  await page.getByRole("link", { name: "무료 보장 분석 상담 신청" }).click();
  await page.locator("#cov-method-phone").check({ force: true });
  await page.locator("#cov-time-weekday_morning").check({ force: true });
  await page.locator("#cov-consent").check();
  await page.getByRole("button", { name: "동의하고 보장 분석 신청" }).evaluate((b) => {
    for (let i = 0; i < 3; i++) (b as HTMLButtonElement).click();
  });
  await expect(page).toHaveURL(/\/apply\/coverage\/complete$/);
  // 철회 요청
  await page.goto("/privacy/withdraw");
  await page.locator("#wd-type-withdraw_marketing").check();
  await page.fill("#wd-name", "흐름검사");
  await page.fill("#wd-phone", "010-0000-0341");
  await page.getByRole("button", { name: "요청 접수" }).evaluate((b) => {
    for (let i = 0; i < 3; i++) (b as HTMLButtonElement).click();
  });
  await expect(page.getByText("요청이 접수되었습니다")).toBeVisible();
  await page.waitForTimeout(400);
  expect(posts).toEqual(["/api/leads/coverage", "/api/privacy-requests"]);
});
