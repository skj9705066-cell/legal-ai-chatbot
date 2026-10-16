import { expect, test, type Page } from "@playwright/test";
import { adminLogin } from "./helpers";

/**
 * 신청 전체 흐름 — 실제 사용자처럼 '보이는 카드'를 누른다(숨은 라디오를 강제로 체크하지 않는다).
 * A 랜딩 → B 무료 점검 CTA → C 유형 카드 선택 → D 다음 → E 정보 입력 → F 필수 동의 → H 제출 → I 응답 → K 완료 화면
 * → G 보장 분석(별도·선택) → L CRM 조회 → M CSV. 세 유형 모두. 가상 이름·테스트 번호(010-0000-xxxx)만 사용.
 * DB(Supabase) 저장 자체는 staging-db.spec.ts가 테스트 모드 배포에서 확인한다.
 */

const TYPES = [
  { id: "unclaimed", pick: "병원비·수술비", crm: "미청구 보험금", coverage: "opt_in" },
  { id: "hidden", pick: "숨은·만기보험금", crm: "숨은·만기·휴면 보험금", coverage: "decline" },
  { id: "refund", pick: "과오납·해지환급금", crm: "과오납·해지환급금", coverage: "skip" },
] as const;

/** 신청 API 레이트리밋(IP당 10분 5건)이 테스트끼리 섞이지 않도록 테스트마다 다른 IP 키(로컬 전용 — Vercel에서는 덮어써짐) */
async function isolate(page: Page, key: string, isMobile: boolean) {
  await page.setExtraHTTPHeaders({ "x-real-ip": `flow-${key}-${isMobile ? "m" : "d"}` });
}

/** 보이는 카드(라벨)를 누른다. 모바일은 탭 */
async function pickCard(page: Page, pick: string, isMobile: boolean) {
  const card = page.locator("#apply").getByRole("radiogroup").locator("label").filter({ hasText: pick });
  if (isMobile) await card.tap();
  else await card.click();
}

async function openFormFromHero(page: Page) {
  await page.goto("/");
  await page.locator("#hero-cta").getByRole("button").first().click();
  await expect(page.locator("#apply").getByText(/1단계\s*\/\s*2/)).toBeVisible();
}

test("C·D: 세 유형 카드 모두 눌러서 선택되고, 다음·이전·유형 변경 시 입력값이 유지된다", async ({ page, isMobile }) => {
  await openFormFromHero(page);
  const next = page.locator("#apply").getByRole("button", { name: "다음", exact: true });
  for (const t of TYPES) {
    await pickCard(page, t.pick, isMobile);
    await expect(page.locator(`#apply-type-${t.id}`)).toBeChecked();
    for (const other of TYPES.filter((o) => o.id !== t.id)) await expect(page.locator(`#apply-type-${other.id}`)).not.toBeChecked();
  }
  // 마지막 선택(과오납) → 다음
  await next.click();
  await expect(page.getByTestId("apply-picked-type")).toContainText("과오납·해지환급금");
  await page.fill("#apply-name", "흐름검사");
  await page.fill("#apply-phone", "010-0000-0301");
  // 이전 → 선택이 남아 있고, 다른 유형으로 바꿔도 입력값은 그대로
  await page.locator("#apply").getByRole("button", { name: "이전", exact: true }).click();
  await expect(page.locator("#apply-type-refund")).toBeChecked();
  await pickCard(page, "숨은·만기보험금", isMobile);
  await next.click();
  await expect(page.getByTestId("apply-picked-type")).toContainText("숨은·만기보험금");
  await expect(page.locator("#apply-name")).toHaveValue("흐름검사");
  await expect(page.locator("#apply-phone")).toHaveValue("010-0000-0301");
  // '변경' 버튼으로도 유형 단계로 돌아갈 수 있다
  await page.getByTestId("apply-picked-type").getByRole("button").click();
  await expect(page.locator("#apply-type-hidden")).toBeChecked();
});

test("C: 키보드만으로 유형 선택 (화살표 이동 + 다음)", async ({ page, isMobile }) => {
  test.skip(isMobile, "키보드 시나리오는 데스크톱");
  await page.goto("/#apply");
  await page.locator("#apply-type-unclaimed").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#apply-type-hidden")).toBeChecked();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#apply-type-refund")).toBeChecked();
  await page.locator("#apply").getByRole("button", { name: "다음", exact: true }).click();
  await expect(page.getByTestId("apply-picked-type")).toContainText("과오납·해지환급금");
});

for (const [i, t] of TYPES.entries()) {
  test(`전체 흐름 · ${t.pick}: 신청 → 완료 → 보장 분석(${t.coverage}) → CRM → CSV`, async ({ page, isMobile }) => {
    await isolate(page, t.id, isMobile);
    const phoneTail = `${isMobile ? 5 : 4}${i}${String(Date.now() % 100).padStart(2, "0")}`;
    const posts: { status: number; body: string }[] = [];
    page.on("response", async (r) => {
      if (r.url().endsWith("/api/leads") && r.request().method() === "POST") posts.push({ status: r.status(), body: r.request().postData() ?? "" });
    });

    await openFormFromHero(page); // A·B
    await pickCard(page, t.pick, isMobile); // C
    await page.locator("#apply").getByRole("button", { name: "다음", exact: true }).click(); // D
    await expect(page.getByTestId("apply-picked-type")).toContainText(t.pick);
    await page.fill("#apply-name", "흐름검사"); // E
    await page.fill("#apply-phone", `010-0000-${phoneTail}`);
    await expect(page.locator("#apply-marketing")).not.toBeChecked();
    await page.locator("#apply-privacy").check(); // F
    await page.waitForTimeout(2100);
    await page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true }).click(); // H
    await expect(page).toHaveURL(/\/apply\/complete$/); // K
    expect(posts).toHaveLength(1); // I
    expect(posts[0].status).toBe(200);
    expect(JSON.parse(posts[0].body)).toMatchObject({ serviceType: t.id, privacyConsent: true, marketingConsent: false });
    const refNo = (await page.locator("strong.font-mono").first().textContent())!.trim();

    // G: 보장 분석은 별도 화면의 선택 항목, 기본 해제
    if (t.coverage === "opt_in") {
      await page.getByRole("link", { name: "무료 보장 분석 상담 신청" }).click();
      await expect(page.locator("#cov-consent")).not.toBeChecked();
      await page.locator("#cov-method-phone").check({ force: true });
      await page.locator("#cov-time-weekday_morning").check({ force: true });
      await page.locator("#cov-consent").check();
      await page.getByRole("button", { name: "동의하고 보장 분석 신청" }).click();
      await expect(page).toHaveURL(/\/apply\/coverage\/complete$/);
    } else if (t.coverage === "decline") {
      await page.getByRole("button", { name: "보험금 점검만 이용할게요" }).click();
      await expect(page).toHaveURL(/\/apply\/done$/);
    }

    // L·M: CRM 조회 + CSV (관리자 화면은 데스크톱 컨텍스트에서도 열 수 있지만 같은 세션으로 확인)
    await adminLogin(page);
    await page.goto(`/admin?q=${encodeURIComponent(refNo)}`);
    const row = page.getByRole("row").filter({ hasText: refNo });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(t.crm);
    await expect(row).toContainText(`010-****-${phoneTail}`);
    await expect(row).toContainText(t.coverage === "opt_in" ? "상담 대기" : "별도 동의 없음");
    const csv = await (await page.request.get(`/api/admin/export?q=${encodeURIComponent(refNo)}`)).text();
    expect(csv).toContain(refNo);
    expect(csv).toContain(`010-****-${phoneTail}`);
    expect(csv).not.toContain(`0100000${phoneTail}`); // CSV에 원문 번호 없음
  });
}

test("오류: 필수 입력 누락 · 잘못된 연락처 · 동의 누락은 제출되지 않는다", async ({ page, isMobile }) => {
  await isolate(page, "invalid", isMobile);
  const posts: string[] = [];
  page.on("request", (r) => r.url().endsWith("/api/leads") && r.method() === "POST" && posts.push(r.url()));
  await page.goto("/#apply");
  const next = page.locator("#apply").getByRole("button", { name: "다음", exact: true });
  await next.click();
  await expect(page.getByText("점검 유형을 선택해 주세요.")).toBeVisible();
  await pickCard(page, "병원비·수술비", isMobile);
  await next.click();
  const submit = page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true });
  await submit.click();
  await expect(page.getByText("이름을 입력해 주세요.")).toBeVisible();
  await page.fill("#apply-name", "흐름검사");
  await page.fill("#apply-phone", "02-123-4567");
  await submit.click();
  await expect(page.getByText("휴대전화번호 형식을 확인해 주세요")).toBeVisible();
  await page.fill("#apply-phone", "010-0000-0399");
  await submit.click();
  await expect(page.getByText("개인정보 수집·이용에 동의해야 신청할 수 있습니다.")).toBeVisible();
  expect(posts).toHaveLength(0);
});

test("중복 제출: 신청 버튼을 연달아 눌러도 요청은 한 번", async ({ page, isMobile }) => {
  await isolate(page, "double", isMobile);
  const posts: string[] = [];
  page.on("request", (r) => r.url().endsWith("/api/leads") && r.method() === "POST" && posts.push(r.postData() ?? ""));
  await page.goto("/");
  await page.getByTestId("claim-case-cta-small-bills").click();
  await page.fill("#apply-name", "흐름검사");
  await page.fill("#apply-phone", "010-0000-0311");
  await page.locator("#apply-privacy").check();
  await page.waitForTimeout(2100);
  const submit = page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true });
  // 사람의 연타보다 빠른 조건: 같은 순간에 세 번 클릭(렌더링 사이 틈이 없음)
  await submit.evaluate((b) => {
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
  await page.getByTestId("claim-case-cta-maturity").click();
  await page.fill("#apply-name", "흐름검사");
  await page.fill("#apply-phone", "010-0000-0321");
  await page.locator("#apply-privacy").check();
  await page.waitForTimeout(2100);
  const submit = page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true });
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
  await page.getByTestId("claim-case-cta-surgery-rider").click();
  await page.fill("#apply-name", "흐름검사");
  await page.fill("#apply-phone", "010-0000-0331");
  await page.locator("#apply-privacy").check();
  await page.waitForTimeout(2100);
  await page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true }).click();
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
  await page.locator("#claim-cases").getByRole("button", { name: /다른 사례 보기/ }).click();
  await page.getByTestId("claim-case-cta-diagnosis").click(); // 접힌 사례(진단비)도 펼친 뒤 선택 가능
  await page.fill("#apply-name", "흐름검사");
  await page.fill("#apply-phone", "010-0000-0341");
  await page.locator("#apply-privacy").check();
  await page.waitForTimeout(2100);
  await page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true }).click();
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
