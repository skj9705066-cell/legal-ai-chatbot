import { expect, test, type Page } from "@playwright/test";
import { adminLogin } from "./helpers";

/**
 * 관리자 CRM 회귀 점검 — 모든 메뉴, 화면 이동 중 중복 렌더링 없음, 편집 저장·유지, 테스트 신청 구분, 로그아웃.
 * 권한별 제한(상담사·열람)은 admin.spec.ts에서 확인한다.
 */

/** 실제 DB(테스트 배포) 대상 실행 — 기존 신청을 고치는 테스트는 건너뛰고 읽기 전용 점검만 한다 */
const REAL_DB = process.env.E2E_STAGING === "1";

async function login(page: Page, key: string) {
  // 관리자 로그인 레이트리밋(IP당 15분 10회)이 다른 테스트와 섞이지 않게(로컬 전용 — Vercel에서는 덮어써짐)
  await page.setExtraHTTPHeaders({ "x-real-ip": `crm-${key}` });
  await adminLogin(page);
}

/** 상담 목록 화면의 필터·목록이 정확히 하나씩인지 */
async function expectSingleListView(page: Page) {
  await expect(page.locator('form[aria-label="상세 필터"]')).toHaveCount(1);
  await expect(page.locator('nav[aria-label="진행 상태 필터"]')).toHaveCount(1);
  await expect(page.locator("table")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
}

test("모든 메뉴가 열리고, 화면 이동·뒤로가기 중 필터·목록이 중복되지 않는다", async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Vercel이 Preview 배포에만 끼워 넣는 의견 도구 스크립트(vercel.live)는 우리 CSP가 막는다. 앱 오류가 아니고 운영 배포에는 없으므로 이것만 제외
  const vercelToolbar = (t: string) => t.includes("https://vercel.live/") && t.includes("Content Security Policy");
  page.on("console", (m) => m.type() === "error" && !vercelToolbar(m.text()) && errors.push(m.text()));
  await login(page, `menus-${isMobile ? "m" : "d"}`);
  const menu = page.getByRole("navigation", { name: "관리자 메뉴" });
  const pages: [string, RegExp, string][] = [
    ["방문 일정", /\/admin\/visits$/, "방문 일정"],
    ["보장 분석 영업 대상", /view=sales/, "보장 분석 영업 대상"],
    ["광고 성과", /\/admin\/performance$/, "광고 성과"],
    ["후기·지급 사례", /\/admin\/reviews$/, "후기"],
    ["철회·삭제 요청", /\/admin\/privacy$/, "철회"],
    ["감사로그", /\/admin\/audit$/, "감사로그"],
    ["환경설정·배포 체크", /\/admin\/settings$/, "환경설정"],
    ["상담 DB", /\/admin$/, "상담 DB"],
  ];
  await expectSingleListView(page);
  for (const [label, url, heading] of pages) {
    await menu.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(url);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText(heading);
    // 현재 메뉴만 활성 표시
    await expect(menu.locator('[aria-current="page"]')).toHaveCount(1);
  }
  await expectSingleListView(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/admin\/settings$/);
  await page.goBack();
  await page.goBack();
  await page.goForward();
  await page.goto("/admin?view=sales");
  await expectSingleListView(page);
  await page.goto("/admin?claim=new&sort=oldest");
  await expectSingleListView(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);

  // 로그아웃 → 다시 들어가면 로그인 화면
  await page.getByRole("button", { name: "로그아웃" }).first().click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("상태·다음 연락 일정·담당자·메모 저장 → 새로고침해도 유지, 감사로그 기록", async ({ page, isMobile }) => {
  test.skip(isMobile, "편집은 데스크톱에서 1회");
  test.skip(REAL_DB, "실제 DB에서는 기존 신청을 수정하지 않는다");
  await login(page, "edit");
  await page.goto("/admin?claim=new");
  const firstLink = page.locator("tbody a").first();
  const refNo = (await firstLink.textContent())!.trim();
  await firstLink.click();
  await expect(page.locator("h1")).toContainText(refNo);
  const editor = page.locator("form").filter({ has: page.getByRole("button", { name: "저장" }) });
  await editor.getByLabel("진행 상태").selectOption("contacting");
  await editor.getByLabel("다음 연락 일정").fill("2026-12-01T10:30");
  await editor.getByLabel("담당자").fill("테스트담당");
  await editor.getByLabel("처리 메모").fill("E2E 저장 확인 메모");
  await editor.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("저장되었습니다.")).toBeVisible();
  await page.reload();
  await expect(editor.getByLabel("진행 상태")).toHaveValue("contacting");
  await expect(editor.getByLabel("다음 연락 일정")).toHaveValue("2026-12-01T10:30");
  await expect(editor.getByLabel("담당자")).toHaveValue("테스트담당");
  await expect(editor.getByLabel("처리 메모")).toHaveValue("E2E 저장 확인 메모");
  // 목록에도 반영, 정렬(다음 연락 일정순)에서 조회 가능
  await page.goto(`/admin?q=${encodeURIComponent(refNo)}&sort=next_contact`);
  await expect(page.getByRole("row").filter({ hasText: refNo })).toContainText("연락 중");
  await page.goto("/admin/audit");
  await expect(page.getByText("lead.update").first()).toBeVisible();
});

test("테스트 신청: 배지·필터로 구분되고, 영업 대상 목록에는 기본으로 섞이지 않는다", async ({ page, isMobile }) => {
  test.skip(isMobile, "데스크톱에서 1회");
  test.skip(REAL_DB, "실제 DB에서는 기존 신청을 수정하지 않는다");
  await login(page, "tests");
  await page.goto("/admin?view=sales&test=include");
  const firstLink = page.locator("tbody a").first();
  const refNo = (await firstLink.textContent())!.trim();
  await firstLink.click();
  const editor = page.locator("form").filter({ has: page.getByRole("button", { name: "저장" }) });
  await editor.getByLabel("내부 테스트 신청 (실제 운영 지표에서 제외)").check();
  await editor.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("저장되었습니다.")).toBeVisible();

  const rowOf = (url: string) => page.goto(url).then(() => page.getByRole("row").filter({ hasText: refNo }));
  await expect(await rowOf("/admin?view=sales")).toHaveCount(0); // 기본: 테스트 제외
  await expect(page.locator('select[name="test"]')).toHaveValue("exclude");
  await expect(await rowOf("/admin?view=sales&test=include")).toHaveCount(1);
  const only = await rowOf(`/admin?test=only&q=${encodeURIComponent(refNo)}`);
  await expect(only).toHaveCount(1);
  await expect(only).toContainText("테스트");
  await expect(await rowOf(`/admin?test=exclude&q=${encodeURIComponent(refNo)}`)).toHaveCount(0);
  // CSV에도 테스트 표시
  const csv = await (await page.request.get(`/api/admin/export?q=${encodeURIComponent(refNo)}`)).text();
  expect(csv).toContain("테스트(지표 제외)");
});

test("방문 예약: 일시·장소 저장 → '방문 예약' 상태·방문 일정 화면 → 상담 이력 → 방문 안내 문자(데모는 발송 안 함)", async ({ page, isMobile }) => {
  test.skip(isMobile, "데스크톱에서 1회");
  test.skip(REAL_DB, "실제 DB에서는 기존 신청을 수정하지 않는다");
  await login(page, "visit");
  await page.goto("/admin?claim=new");
  const firstLink = page.locator("tbody a").first();
  const refNo = (await firstLink.textContent())!.trim();
  await firstLink.click();
  const editor = page.locator("form").filter({ has: page.getByRole("button", { name: "저장" }) });
  // 방문 일시는 한국 시간 기준(관리자 PC 시간대와 무관)
  await editor.getByLabel("방문 일시 (한국 시간)").fill("2030-03-05T14:00");
  await editor.getByLabel("방문 장소").fill("○○역 2번 출구 카페");
  await editor.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("저장되었습니다.")).toBeVisible();
  await page.reload();
  await expect(editor.getByLabel("진행 상태")).toHaveValue("visit_booked"); // 처음 잡은 방문은 상태 자동 전환
  await expect(editor.getByLabel("방문 일시 (한국 시간)")).toHaveValue("2030-03-05T14:00");
  const log = page.getByTestId("activity-list");
  await expect(log).toContainText("방문 예약: 3월 5일(화) 오후 2:00 · ○○역 2번 출구 카페");

  // 상담 이력 추가(수정 없음, 문자 종류는 손으로 만들 수 없음)
  await page.getByRole("form", { name: "상담 이력 추가" }).getByLabel("종류").selectOption("call");
  await expect(page.getByRole("form", { name: "상담 이력 추가" }).locator('option[value="sms"]')).toHaveCount(0);
  await page.getByLabel("상담 내용").fill("E2E 통화 — 방문 전날 다시 연락");
  await page.getByRole("button", { name: "기록 추가" }).click();
  await expect(log).toContainText("E2E 통화 — 방문 전날 다시 연락");

  // 방문 안내 문자: 문구 확인 후 보내기, 데모에서는 실제 발송하지 않고 이력만
  const sms = page.getByTestId("visit-sms");
  await expect(sms).toContainText("실제 발송 안 함");
  await sms.getByRole("button", { name: "문구 확인 후 보내기" }).click();
  await expect(sms.locator("pre")).toContainText("비밀번호·인증번호는 절대 여쭙지 않습니다.");
  await expect(sms.locator("pre")).toContainText("소속 보험설계사");
  await sms.getByRole("button", { name: "이대로 보내기" }).click();
  await expect(sms).toContainText("기록만 남겼습니다");
  await expect(log).toContainText("방문 안내 문자 (발송 안 함)");

  // 방문 일정 화면·목록에 보인다
  await page.goto("/admin/visits");
  await expect(page.getByRole("link").filter({ hasText: "○○역 2번 출구 카페" })).toHaveCount(1);
  await page.goto(`/admin?q=${encodeURIComponent(refNo)}`);
  await expect(page.getByRole("row").filter({ hasText: refNo })).toContainText("3월 5일(화) 오후 2:00");
  await page.goto("/admin/audit");
  await expect(page.getByText("notify.visit_sms_skipped").first()).toBeVisible();
});
