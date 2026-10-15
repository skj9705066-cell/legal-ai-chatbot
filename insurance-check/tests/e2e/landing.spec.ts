import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const FORBIDDEN = ["평균 404", "404만원", "모든 고객", "대상자로 선정", "금융위원회 인증", "100% 환급", "무조건"];

test("hero, stats with source and compliance copy", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("혹시 아직 받지 못한");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("보험금이 있으신가요?");
  await expect(page.getByText("내 보험을 한 번에 점검해 드립니다.")).toBeVisible();
  for (const badge of ["무료 점검 안내", "보험 가입 의무 없음", "필요한 경우 상담으로 확인 가능"]) {
    await expect(page.getByRole("listitem").filter({ hasText: badge }).first()).toBeVisible();
  }
  const stats = page.locator("#stats");
  await expect(stats).toContainText("10조 3,000억원");
  await expect(stats).toContainText("3조 2,470억원");
  await expect(stats).toContainText("약 80만 건");
  await expect(stats).toContainText("금융위원회");
  await expect(stats).toContainText("2026년 7월 7일");
  await expect(stats).toContainText("실시간으로 변하는 수치가 아닙니다");
  await expect(stats.locator('a[href="https://www.fsc.go.kr/po010103/87270"]')).toBeVisible();
  await expect(stats.getByText("개인별 환급 가능 여부나 환급 금액을 의미하거나 보장하지 않습니다")).toBeVisible();
  const text = await page.locator("body").innerText();
  for (const f of FORBIDDEN) expect(text, `forbidden phrase: ${f}`).not.toContain(f);
  for (const f of ["즉시 조회", "환급 대상 확인 완료"]) expect(text).not.toContain(f);
  await expect(page.getByText("데모 모드").first()).toBeVisible();
});

test("no external lookup CTA in the main flow; official link kept in FAQ and footer", async ({ page }) => {
  await page.goto("/");
  const ext = 'a[href*="cont.insure.or.kr"]';
  for (const sel of ["header", "#hero-cta", "#stats", "#services", "#process", "#apply", "#final-cta"]) {
    await expect(page.locator(`${sel} ${ext}`), `external CTA in ${sel}`).toHaveCount(0);
  }
  await expect(page.locator(`footer ${ext}`)).toBeVisible();
  await expect(page.locator(`#faq-official ${ext}`)).toHaveCount(1);
  // 헤더의 '공식 조회 안내'는 내부 FAQ로 이동하고 해당 질문을 펼친다
  await page.goto("/#faq-official");
  await expect(page.locator(`#faq-official ${ext}`)).toBeVisible();
});

test("odometer counts up once on entry and stops exactly on the official figures", async ({ page }) => {
  await page.goto("/");
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  const main = page.locator('[data-testid="stat-main"] .odo');
  await expect(main).toHaveAttribute("data-state", "idle");
  const widthBefore = await main.evaluate((e) => e.getBoundingClientRect().width);
  await page.evaluate(() => window.scrollTo(0, document.getElementById("stats")!.offsetTop + 100));
  await expect(main).toHaveAttribute("data-state", "running");
  await expect(main).toHaveAttribute("data-state", "done", { timeout: 6000 });
  const widthAfter = await main.evaluate((e) => e.getBoundingClientRect().width);
  expect(Math.abs(widthAfter - widthBefore)).toBeLessThan(1); // 레이아웃 흔들림 없음
  // 화면에 보이는 자릿수를 바퀴 위치에서 직접 읽어 최종 표기와 비교
  for (const id of ["stat-main", "stat-refund-amount", "stat-refund-count"]) {
    const odo = page.locator(`[data-testid="${id}"] .odo`);
    await expect(odo).toHaveAttribute("data-state", "done", { timeout: 6000 });
    const shown = await odo.evaluate((root) =>
      Array.from(root.children)
        .map((c) => {
          const strip = c.firstElementChild as HTMLElement | null;
          if (!c.classList.contains("odo-col") || !strip) return c.textContent === "\u00a0" ? " " : c.textContent;
          const pct = Number(/translateY\((-?[\d.]+)%\)/.exec(strip.style.transform)?.[1] ?? "0");
          return String(Math.round((-pct * 11) / 100) % 10);
        })
        .join(""),
    );
    expect(shown).toBe(await odo.getAttribute("data-final"));
  }
  // 다시 스크롤해도 반복 실행되지 않는다
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => window.scrollTo(0, document.getElementById("stats")!.offsetTop + 100));
  await expect(main).toHaveAttribute("data-state", "done");
});

test("reduced motion shows the final figures without animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator('[data-testid="stat-main"] .odo')).toHaveAttribute("data-state", "done");
});

test("hero CTA scrolls to type selection; picked type flows into the single form", async ({ page }) => {
  await page.goto("/");
  expect(await page.locator("form").count()).toBe(1);
  await page.locator("#hero-cta").getByRole("button", { name: "내 보험금 점검 시작하기" }).click();
  await expect(page.locator("#services-title")).toBeInViewport();
  await expect(page.locator("#services-title")).toBeFocused();
  await page.locator('#services input[value="refund"]').check({ force: true });
  await expect(page.getByText("과오납 보험료·해지환급금 점검으로 신청서를 열어요")).toBeVisible();
  await page.getByRole("button", { name: "선택한 보험금 무료 점검 상담 신청하기" }).click();
  await expect(page.locator("#apply-name")).toBeFocused();
  await expect(page.locator("#apply-step-title")).toHaveText("연락받으실 분을 알려주세요");
  await page.getByRole("button", { name: "이전" }).click();
  await expect(page.locator("#apply-type-refund")).toBeChecked();
});

test("wizard: per-step validation, error focus, unchecked consents", async ({ page }) => {
  await page.goto("/#apply");
  const next = page.getByRole("button", { name: "다음" });
  await next.click();
  await expect(page.getByText("점검 유형을 선택해 주세요.")).toBeVisible();
  await expect(page.locator("#apply-type-unclaimed")).toBeFocused();
  await page.locator("#apply-type-hidden").check({ force: true });
  await next.click();
  await expect(page.getByRole("heading", { name: "연락받으실 분을 알려주세요" })).toBeFocused();
  await page.fill("#apply-name", "데모");
  await page.fill("#apply-phone", "0101234");
  await next.click();
  await expect(page.getByText("휴대전화번호 형식을 확인해 주세요")).toBeVisible();
  await expect(page.locator("#apply-phone")).toBeFocused();
  await page.fill("#apply-phone", "010-0000-0000");
  await next.click();
  await next.click();
  await expect(page.getByText("상담 희망 시간을 선택해 주세요.")).toBeVisible();
  await page.locator("#apply-time-anytime").check({ force: true });
  await next.click();
  await expect(page.getByRole("heading", { name: "마지막으로 확인해 주세요" })).toBeVisible();
  await expect(page.locator("#apply-privacy")).not.toBeChecked();
  await expect(page.locator("#apply-marketing")).not.toBeChecked();
  await page.getByRole("button", { name: "무료 점검 신청하기" }).click();
  await expect(page.getByText("개인정보 수집·이용에 동의해야 신청할 수 있습니다.")).toBeVisible();
  await page.locator("#apply-privacy").locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]").getByRole("button", { name: "내용 보기" }).click();
  await expect(page.getByText("수집 목적").first()).toBeVisible();
  await expect(page.getByText("거부 권리").first()).toBeVisible();
});

test("accessibility: landing has no serious axe violations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); // 진입 애니메이션 중간 투명도에서 측정하지 않도록
  await page.goto("/");
  await page.waitForTimeout(300);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
});

test("responsive: no horizontal overflow", async ({ page }) => {
  for (const width of [360, 375, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 860 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `overflow at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test("mobile sticky CTA hides at hero, the form and the final CTA", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/");
  const sticky = page.getByTestId("mobile-sticky-cta");
  await expect(sticky).toHaveAttribute("data-hidden", "true");
  await page.locator("#process").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-hidden", "false");
  await page.locator("#apply-step-title").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-hidden", "true");
  await page.locator("#final-cta").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-hidden", "true");
});
