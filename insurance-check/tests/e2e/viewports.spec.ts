import { expect, test, type Locator, type Page } from "@playwright/test";
import { adminLogin } from "./helpers";

/**
 * 화면 크기 매트릭스 — 출시 전 점검 기준 5가지 크기에서 같은 흐름을 실제 브라우저로 끝까지 확인한다.
 *   랜딩 → CTA → 유형 선택(터치/클릭 + 키보드) → 이름·전화번호 타이핑 → 동의 → 신청 → 완료 화면
 *   → 관리자 로그인 → 상담 목록 · 검색 · 필터 → 상세 → 로그아웃
 * 각 단계에서 가로 스크롤, 잘린 버튼 글자, 다른 요소에 가려진 버튼·입력칸, 너무 작은 터치 영역을 함께 본다.
 *
 * 실제 DB 대상(E2E_STAGING=1)에서는 신청을 보내지 않는다(실제 신청 저장은 staging-db.spec.ts가 1건만 보낸다).
 * 그 경우 이 파일은 '@preview'로 실제 Preview에서도 돌린다.
 */

const REAL_DB = process.env.E2E_STAGING === "1";
const SIZES = [
  { name: "390x844", width: 390, height: 844, touch: true },
  { name: "430x932", width: 430, height: 932, touch: true },
  { name: "768x1024", width: 768, height: 1024, touch: true },
  { name: "1280x800", width: 1280, height: 800, touch: false },
  { name: "1440x900", width: 1440, height: 900, touch: false },
] as const;

/** 가로 스크롤이 생기지 않는다 */
async function expectNoHorizontalScroll(page: Page, where: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `가로 스크롤 — ${where}`).toBeLessThanOrEqual(0);
}

/** 요소의 가운데를 실제로 누를 수 있다(고정 CTA·헤더 등 다른 요소에 가려지지 않음) */
async function expectNotCovered(el: Locator, what: string) {
  await el.scrollIntoViewIfNeeded();
  const ok = await el.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (hit === node || node.contains(hit) || (node instanceof HTMLInputElement && !!node.labels && Array.from(node.labels).some((l) => l.contains(hit))));
  });
  expect(ok, `가려짐 — ${what}`).toBe(true);
}

/** 터치 영역 최소 크기(버튼·입력 44px, 체크박스 24px — WCAG 2.5.8 기준 이상) */
async function expectTarget(el: Locator, min: number, what: string) {
  const box = (await el.boundingBox())!;
  expect(box.height, `터치 높이 — ${what}`).toBeGreaterThanOrEqual(min);
  expect(box.width, `터치 너비 — ${what}`).toBeGreaterThanOrEqual(min);
}

/** 영역 안 버튼·링크 글자가 잘리지 않는다 */
async function expectNoClippedText(scope: Locator, what: string) {
  const clipped = await scope.evaluate((root) =>
    Array.from(root.querySelectorAll<HTMLElement>("button, a, label, h1, h2, h3"))
      // 화면 읽기 전용(sr-only, 1px로 숨김)은 보이는 글자가 아니므로 제외
      .filter((el) => el.offsetParent !== null && el.clientWidth > 1 && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible")
      .map((el) => (el.textContent ?? "").trim().slice(0, 30)),
  );
  expect(clipped, `잘린 글자 — ${what}`).toEqual([]);
}

async function press(el: Locator, touch: boolean) {
  if (touch) await el.tap();
  else await el.click();
}

for (const size of SIZES) {
  test.describe(`화면 ${size.name} @preview`, () => {
    test.use({ viewport: { width: size.width, height: size.height }, hasTouch: size.touch, isMobile: size.width < 768 });

    test(`랜딩 → 유형 선택 → 입력 → 동의 → 신청 → 완료 → CRM (${size.name})`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop", "크기를 직접 지정하므로 한 프로젝트에서만 실행");
      // 로컬 레이트리밋 분리(Vercel에서는 덮어써짐)
      await page.setExtraHTTPHeaders({ "x-real-ip": `vp-${size.name}` });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const posts: number[] = [];
      page.on("response", (r) => r.url().endsWith("/api/leads") && r.request().method() === "POST" && posts.push(r.status()));

      // ── 랜딩
      await page.goto("/");
      await expect(page.locator("#hero-title")).toBeVisible();
      await expectNoHorizontalScroll(page, "랜딩");
      await expectNoClippedText(page.locator("main"), "랜딩");
      const heroCta = page.locator("#hero-cta").getByRole("button").first();
      await expectTarget(heroCta, 44, "히어로 CTA");
      await press(heroCta, size.touch);
      const form = page.locator("#apply");
      await expect(form.getByText(/1단계\s*\/\s*2/)).toBeVisible();

      // ── 유형 선택: 세 유형 모두 눌러 보고, 선택 표시(파란 테두리·체크)가 옮겨 가는지
      for (const pick of ["병원비·수술비", "숨은·만기보험금", "과오납·해지환급금"]) {
        const card = form.getByRole("radiogroup").locator("label").filter({ hasText: pick });
        await expectTarget(card, 44, `유형 카드 ${pick}`);
        await expectNotCovered(card, `유형 카드 ${pick}`);
        await press(card, size.touch);
        await expect(card).toHaveClass(/border-blue/);
      }
      if (!size.touch) {
        // 키보드: 화살표로 유형 이동
        await page.locator("#apply-type-refund").focus();
        await page.keyboard.press("ArrowUp");
        await expect(page.locator("#apply-type-hidden")).toBeChecked();
      }
      await expectNoClippedText(form, "유형 단계");
      const next = form.getByRole("button", { name: "다음", exact: true });
      await expectNotCovered(next, "다음 버튼");
      await press(next, size.touch);
      await expect(form.getByText(/2단계\s*\/\s*2/)).toBeVisible();
      const picked = size.touch ? "과오납·해지환급금" : "숨은·만기보험금";
      await expect(page.getByTestId("apply-picked-type")).toContainText(picked);

      // ── 입력: 칸을 눌러 포커스 → 키보드 입력 → 수정
      for (const [id, text, want] of [
        ["#apply-name", "화면검사", "화면검사"],
        ["#apply-phone", "01000000" + String(SIZES.indexOf(size) + 470), `010-0000-0${SIZES.indexOf(size) + 470}`],
      ] as const) {
        const input = page.locator(id);
        await expectTarget(input, 44, id);
        await expectNotCovered(input, id);
        await press(input, size.touch);
        await expect(input).toBeFocused();
        await page.keyboard.type(text);
        await expect(input).toHaveValue(want);
        // 입력 중 칸이 화면 밖으로 밀려나지 않는다
        await expect(input).toBeInViewport();
      }
      await page.keyboard.press("Backspace");
      await page.keyboard.type(String(SIZES.indexOf(size)));
      const phone = await page.locator("#apply-phone").inputValue();
      expect(phone).toMatch(/^010-0000-0\d{3}$/);

      // ── 동의: 선택 동의는 기본 해제, 필수만 체크
      await expect(page.locator("#apply-marketing")).not.toBeChecked();
      await expectTarget(page.locator("#apply-privacy"), 24, "필수 동의 체크박스");
      await press(page.locator('label[for="apply-privacy"]'), size.touch);
      await expect(page.locator("#apply-privacy")).toBeChecked();
      await expect(page.locator("#apply-marketing")).not.toBeChecked();
      await expectNoClippedText(form, "연락처 단계");
      await expectNoHorizontalScroll(page, "신청서");

      const submit = page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true });
      await expectTarget(submit, 44, "신청 버튼");
      await expectNotCovered(submit, "신청 버튼");

      let refNo = "";
      if (!REAL_DB) {
        await page.waitForTimeout(2100); // 봇 차단(최소 작성 시간)
        await press(submit, size.touch);
        await expect(page).toHaveURL(/\/apply\/complete$/);
        refNo = (await page.locator("strong.font-mono").first().textContent())!.trim();
        expect(refNo).toMatch(/^IC-\d{6}-[A-Z0-9]{5}$/);
        expect(posts).toEqual([200]);
        await expectNoHorizontalScroll(page, "완료 화면");
        await expectNoClippedText(page.locator("main"), "완료 화면");
      }

      // ── 관리자: 로그인 → 목록 → 검색 → 필터 → 상세 → 로그아웃
      await page.setExtraHTTPHeaders({ "x-real-ip": `vp-admin-${size.name}` });
      await page.goto("/admin/login");
      await expectNoHorizontalScroll(page, "관리자 로그인");
      await adminLogin(page);
      await expect(page.locator("h1")).toContainText("상담 DB");
      await expectNoHorizontalScroll(page, "CRM 목록");
      if (!refNo) refNo = (await page.locator("tbody a").first().textContent())!.trim();

      const filters = page.locator('form[aria-label="상세 필터"]');
      await filters.locator('input[name="q"]').fill(refNo);
      await filters.locator('select[name="sort"]').selectOption("oldest");
      await press(filters.getByRole("button", { name: "적용" }), size.touch);
      await expect(page).toHaveURL(new RegExp(`q=${refNo}`));
      const row = page.getByRole("row").filter({ hasText: refNo });
      await expect(row).toHaveCount(1);
      if (!REAL_DB) {
        // CRM 표시가 신청 내용과 일치: 유형 · 마스킹된 번호
        await expect(row).toContainText(size.touch ? "과오납·해지환급금" : "숨은·만기·휴면 보험금");
        await expect(row).toContainText(phone.replace(/^010-0000-/, "010-****-"));
      }
      // 유형 필터: 맞는 유형이면 남고, 다른 유형이면 사라진다
      const typeValue = size.touch ? "refund" : "hidden";
      if (!REAL_DB) {
        await page.goto(`/admin?q=${refNo}&type=${typeValue}`);
        await expect(page.getByRole("row").filter({ hasText: refNo })).toHaveCount(1);
        await page.goto(`/admin?q=${refNo}&type=unclaimed`);
        await expect(page.getByRole("row").filter({ hasText: refNo })).toHaveCount(0);
        await page.goto(`/admin?q=${refNo}`);
      }
      await press(page.getByRole("row").filter({ hasText: refNo }).getByRole("link", { name: refNo }), size.touch);
      await expect(page.locator("h1")).toContainText(refNo);
      await expectNoHorizontalScroll(page, "CRM 상세");
      await expectNoClippedText(page.locator("main"), "CRM 상세");
      const save = page.getByRole("button", { name: "저장" });
      await expectNotCovered(save, "CRM 저장 버튼");

      await press(page.getByRole("button", { name: "로그아웃" }).first(), size.touch);
      await expect(page).toHaveURL(/\/admin\/login$/);
      expect(errors, "브라우저 오류").toEqual([]);
    });
  });
}
