import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PASSWORD = process.env.DEMO_ADMIN_PASSWORD || "demo-admin-local";

async function login(page: Page, role: "admin" | "counselor" | "viewer") {
  // 관리자 로그인 레이트리밋(IP당 15분 10회)이 테스트끼리 섞이지 않게 테스트마다 다른 IP 키(로컬 전용 — Vercel에서는 덮어써짐)
  await page.setExtraHTTPHeaders({ "x-real-ip": `admin-${test.info().testId}` });
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
    // 저장 검증: 랜딩에서 실제로 신청 → 완료 화면의 신청번호가 CRM에 유입 경로(UTM)와 함께 기록되어 있다
    await page.goto("/?utm_source=e2e_crm&utm_medium=cpc&utm_campaign=save_check");
    await page.getByTestId("story-hospital").click();
    await page.fill("#apply-name", "저장확인");
    await page.fill("#apply-phone", "010-9000-0077");
    await page.locator("#apply-privacy").check();
    await page.waitForTimeout(2100);
    await page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true }).click();
    await expect(page).toHaveURL(/\/apply\/complete$/);
    const refNo = (await page.locator("strong.font-mono").first().textContent())!.trim();

    await login(page, "admin");
    await page.goto(`/admin?q=${encodeURIComponent(refNo)}`);
    const saved = page.getByRole("row").filter({ hasText: refNo });
    await expect(saved).toHaveCount(1);
    await expect(saved).toContainText("e2e_crm");
    await expect(saved).toContainText("save_check");
    await expect(saved).toContainText("010-****-0077"); // 목록에서도 연락처 마스킹
    await expect(saved).toContainText("미청구 보험금"); // 고른 점검 유형이 그대로 저장
    // 상세: 필수·선택 동의가 구분되어 기록된다(선택 동의는 하지 않음)
    await saved.getByRole("link", { name: refNo }).click();
    await expect(page.getByText("개인정보(필수)")).toBeVisible();
    await expect(page.locator("dd").filter({ hasText: /^동의 · claim-/ })).toHaveCount(1);
    await expect(page.locator("div").filter({ has: page.getByText("광고성 정보(선택)", { exact: true }) }).last()).toContainText("미동의/철회");
    await expect(page.locator("div").filter({ has: page.getByText("제3자 제공", { exact: true }) }).last()).toContainText("해당 없음/미동의");
    await page.goto("/admin");
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

  test("list view does not create phantom 'viewed' audit entries via link prefetch", async ({ page }) => {
    await login(page, "admin");
    await page.waitForTimeout(2500); // 프리페치가 일어날 시간
    await page.goto("/admin/audit");
    const firstAction = page.locator("tbody tr").first().locator("td").nth(3);
    await expect(firstAction).toHaveText("lead.list");
    await expect(page.locator("tbody tr").nth(1).locator("td").nth(3)).toHaveText("auth.login");
  });

  test("detail panel and status chips work right after login", async ({ page }) => {
    await login(page, "counselor");
    await page.locator("tbody a[aria-label$='상세 패널 열기']").first().click();
    await expect(page.locator("#lead-panel-title")).toBeVisible();
    await expect(page).toHaveURL(/lead=/);
    await page.getByRole("navigation", { name: "보험금 점검 상태 필터" }).getByRole("link", { name: "신규 접수" }).click();
    await expect(page).toHaveURL(/claim=new/);
  });

  test("counselor: no CSV export, no audit/settings menu", async ({ page }) => {
    await login(page, "counselor");
    await expect(page.getByRole("link", { name: "CSV 내보내기" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "감사로그" })).toHaveCount(0);
    expect((await page.request.get("/api/admin/export")).status()).toBe(403);
  });

  test("reviews: consent + admin approval required; masked capture image; amount only when verified; delete", async ({ page }) => {
    await login(page, "admin");
    await page.goto("/admin/reviews");
    await expect(page.getByRole("heading", { name: "후기 · 지급 사례" })).toBeVisible();
    // 데모 데이터는 실제 운영 지표에서 제외 → 0, 랜딩 비공개
    for (const k of ["applications", "completedConsultations", "approvedReviews", "verifiedPayoutCases"]) {
      await expect(page.getByTestId(`metric-${k}`)).toHaveText("0");
    }
    await expect(page.getByTestId("metrics-public-state")).toHaveText("랜딩 비공개");

    const form = page.getByRole("form", { name: "후기 등록" });
    const tag = Math.random().toString(36).slice(2, 8).replace(/\d/g, "x");
    const content = `E2E 후기 ${tag} 부모님 보험까지 확인하는 계기가 됐어요.`;
    await form.getByLabel(/후기 유형/).selectOption("history_lookup");
    // 실명 그대로는 거절
    await form.getByLabel("고객 표시명 (익명)").fill("홍길동");
    await form.getByLabel(/고객 메시지 원문/).fill(content);
    await form.getByRole("button", { name: "승인 대기로 등록" }).click();
    await expect(form.getByText("표시명은 익명 처리해 주세요")).toBeVisible();
    await expect(form.getByPlaceholder("지급 확인 시에만 금액 입력 가능")).toBeDisabled();

    // 동의 없이 등록 → 승인 버튼 비활성, 서버도 거절
    await form.getByLabel("고객 표시명 (익명)").fill("40대 직장인");
    await form.getByRole("button", { name: "승인 대기로 등록" }).click();
    await expect(form.getByText("승인 대기로 등록했습니다")).toBeVisible();
    const row = page.getByTestId("review-row").filter({ hasText: content });
    await expect(row).toContainText("승인 대기");
    await expect(row).toContainText("과거 보험 가입 내역 확인");
    await expect(row.getByRole("button", { name: "공개 승인" })).toBeDisabled();
    const id = await row.getAttribute("data-review-id");
    const forced = await page.request.patch(`/api/admin/reviews/${id}`, { data: { status: "approved" }, headers: { Origin: new URL(page.url()).origin } });
    expect(forced.status()).toBe(409);

    // 캡처 이미지: 개인정보 가림 도구 → 가림 확인 체크 → 동의 → 승인 → 랜딩 공개
    await form.getByLabel(/후기 유형/).selectOption("medical_claim");
    await form.getByLabel("고객 표시명 (익명)").fill("김○○ 고객");
    await form.getByLabel(/고객 메시지 원문/).fill("");
    await form.getByTestId("review-image-input").setInputFiles("tests/e2e/fixtures/review-capture.png");
    const canvas = form.getByTestId("review-image-canvas");
    await expect(canvas).toBeVisible();
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.14, { steps: 4 });
    await page.mouse.up();
    await expect(form.getByTestId("mask-count")).toHaveText("가린 영역 1곳");
    // 가림 확인 없이 등록하면 거절
    await form.getByLabel(/게시 동의를 받았습니다/).check();
    await form.getByRole("button", { name: "승인 대기로 등록" }).click();
    await expect(form.getByText(/실명을 가렸는지 확인해 주세요/)).toBeVisible();
    await form.getByLabel(/개인정보를 모두 가렸음을 확인했습니다/).check();
    await form.getByLabel("실제 지급 확인됨").check();
    await form.getByPlaceholder("검증된 지급 금액(원, 선택)").fill("1230000");
    await form.getByRole("button", { name: "승인 대기로 등록" }).click();
    await expect(form.getByText("승인 대기로 등록했습니다")).toBeVisible();
    const imgRow = page.getByTestId("review-row").filter({ hasText: "김○○ 고객" }).first();
    await expect(imgRow).toContainText("개인정보 가림 확인");
    await expect(imgRow).toContainText("1,230,000원");
    const imgId = await imgRow.getAttribute("data-review-id");
    // 승인 전에는 공개 이미지 경로가 404
    expect((await page.request.get(`/review-images/${imgId}`)).status()).toBe(404);
    await imgRow.getByRole("button", { name: "공개 승인" }).click();
    await expect(imgRow).toContainText("랜딩 표시 중");
    const pub = await page.request.get(`/review-images/${imgId}`);
    expect(pub.status()).toBe(200);
    expect(pub.headers()["content-type"]).toBe("image/jpeg"); // 캔버스로 다시 저장(EXIF 제거)

    await page.goto("/");
    const card = page.getByTestId("real-review").filter({ has: page.locator(`img[src="/review-images/${imgId}"]`) });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("병원비·수술비 청구");
    await expect(card).toContainText("데모 데이터 · 실제 후기 아님");
    await expect(card).toContainText("확인된 지급액 1,230,000원");
    await expect(page.getByTestId("real-review").filter({ hasText: content })).toHaveCount(0); // 미동의 후기는 미공개

    // 삭제 → 이미지·후기 모두 사라짐
    page.on("dialog", (d) => d.accept());
    await page.goto("/admin/reviews");
    await page.locator(`[data-review-id="${imgId}"]`).getByRole("button", { name: "삭제" }).click();
    await expect(page.locator(`[data-review-id="${imgId}"]`)).toHaveCount(0);
    expect((await page.request.get(`/review-images/${imgId}`)).status()).toBe(404);
    await page.locator(`[data-review-id="${id}"]`).getByRole("button", { name: "삭제" }).click();
    await expect(page.locator(`[data-review-id="${id}"]`)).toHaveCount(0);
    await page.goto("/");
    await expect(page.getByTestId("real-review").filter({ has: page.locator(`img[src="/review-images/${imgId}"]`) })).toHaveCount(0);
  });

  test("counselor can register reviews but cannot approve them", async ({ page }) => {
    await login(page, "counselor");
    await page.goto("/admin/reviews");
    await expect(page.getByRole("form", { name: "후기 등록" })).toBeVisible();
    const res = await page.request.patch("/api/admin/reviews/00000000-0000-0000-0000-000000000000", {
      data: { status: "approved" },
      headers: { Origin: new URL(page.url()).origin },
    });
    expect([403, 404]).toContain(res.status());
  });

  test("viewer: read only", async ({ page }) => {
    await login(page, "viewer");
    await expect(page.locator("tbody select")).toHaveCount(0);
  });
});
