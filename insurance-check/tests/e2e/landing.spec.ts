import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const FORBIDDEN = ["모든 고객", "대상자로 선정", "금융위원회 인증", "100% 환급", "무조건", "80만 명", "방금 신청", "명이 신청", "님이 신청", "찾았어요", "찾았네요", "받았어요"];

test("hero, stats with source and compliance copy", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("나도 몰랐던 보험금,아직 남아 있을 수 있습니다.");
  await expect(page.getByTestId("hero-subtitle")).toHaveText("다른 사람들은 이미 확인하고 있는 보험금,혹시 나도 놓치고 있지는 않을까요?");
  await expect(page.getByText("지금 내 보험에서 확인할 사항을 알아보세요.")).toBeVisible();
  for (const badge of ["무료 점검 안내", "보험 가입 의무 없음", "필요한 경우 상담으로 확인 가능"]) {
    await expect(page.getByRole("listitem").filter({ hasText: badge }).first()).toBeVisible();
  }
  await expect(page.locator("#stats").getByRole("heading", { level: 2 })).toHaveText("생각보다 많은 보험금이 아직 찾아가지 않은 상태입니다.");
  await expect(page.locator("#stats")).toContainText("약 10조 3,000억원");
  // 사회적 증거: 전국 공식 집계 · 건수(사람 수 아님) · 이 서비스 실적 아님
  const proof = page.locator("#proof");
  await expect(proof.getByRole("heading", { level: 3 })).toHaveText("2025년 한 해, 약 80만 건의 숨은보험금이 지급됐습니다.");
  await expect(page.getByTestId("proof-notes")).toContainText("사람 수 아님");
  await expect(page.getByTestId("proof-notes")).toContainText("이 서비스 실적이 아닌 전국 공식 집계");
  const stats = proof;
  await expect(stats).toContainText("약 80만 건");
  await expect(stats).toContainText("약 3조 2,470억원");
  await expect(stats).toContainText("약 404만원");
  // 평균 환급액은 숫자 바로 아래에 '개인별 예상액 아님'을 함께 표시한다
  const avg = page.locator('[data-testid="stat-refund-average"]');
  const note = page.locator('[data-testid="stat-average-note"]');
  await expect(note).toContainText("개인별 예상 환급액 아님");
  await expect(note).toContainText("실제로 지급된 청구 건의 평균값");
  const [a, n] = await Promise.all([avg.boundingBox(), note.boundingBox()]);
  expect(n!.y - (a!.y + a!.height)).toBeLessThan(24);
  // 강조된 평균 숫자에 비해 고지 문구가 너무 작아지지 않게
  const badgePx = await note.locator("p").first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(badgePx).toBeGreaterThanOrEqual(16);
  await expect(stats).toContainText("사람마다 다르며, 지급 여부는 보험사가 결정합니다");
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
  for (const sel of ["header", "#hero-cta", "#stats", "#proof", "#cases", "#reviews", "#services", "#process", "#apply", "#final-cta"]) {
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
  await page.evaluate(() => window.scrollTo(0, document.getElementById("stats")!.getBoundingClientRect().top + window.scrollY + 100));
  await expect(main).toHaveAttribute("data-state", "running");
  await expect(main).toHaveAttribute("data-state", "done", { timeout: 6000 });
  const widthAfter = await main.evaluate((e) => e.getBoundingClientRect().width);
  expect(Math.abs(widthAfter - widthBefore)).toBeLessThan(1); // 레이아웃 흔들림 없음
  // 화면에 보이는 자릿수를 바퀴 위치에서 직접 읽어 최종 표기와 비교
  for (const id of ["stat-main", "stat-refund-count", "stat-refund-amount", "stat-refund-average"]) {
    const odo = page.locator(`[data-testid="${id}"] .odo`);
    await odo.scrollIntoViewIfNeeded(); // 모바일에서는 카드가 세로로 쌓여 각자 화면에 들어올 때 시작한다
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
  await page.evaluate(() => window.scrollTo(0, document.getElementById("stats")!.getBoundingClientRect().top + window.scrollY + 100));
  await expect(main).toHaveAttribute("data-state", "done");
});

test("reduced motion shows the final figures without animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator('[data-testid="stat-main"] .odo')).toHaveAttribute("data-state", "done");
});

test("compressed flow: stats → type selection → empathy cases → process → apply; no fabricated chats", async ({ page }) => {
  await page.goto("/");
  const ids = ["stats", "services", "cases", "process", "apply", "faq"];
  const order = await page.evaluate((list) => list.map((id) => document.getElementById(id)!.getBoundingClientRect().top + window.scrollY), ids);
  expect([...order].sort((x, y) => x - y)).toEqual(order);

  // 공감 섹션: 상황 예시 4개 = 인물 일러스트 + 질문 + 확인 포인트. 성공담·금액·사진 없음
  const cases = page.locator("#cases");
  await expect(cases.getByRole("heading", { level: 2 })).toHaveText("혹시 이런 경우에 해당하시나요?");
  for (const t of ["수술 후 실손보험만 청구했어요", "오래전 가입한 보험이 있어요", "부모님 보험이 여러 개예요", "지난 병원비를 청구하지 않았어요"]) {
    await expect(cases.getByRole("heading", { level: 3, name: t })).toHaveCount(1);
  }
  await expect(cases.getByText("상황 예시", { exact: true })).toHaveCount(4);
  await expect(page.getByTestId("cases-footnote")).toContainText("실제 고객 사례가 아닙니다");
  await expect(cases.locator("img")).toHaveCount(0);
  expect(await cases.innerText()).not.toMatch(/\d[\d,]*\s*(만\s*)?원/);

  // 가상 대화 갤러리는 없다. 실제 후기 영역은 동의·승인된 후기가 있을 때만(데모 표시 필수)
  await expect(page.getByTestId("chat-example")).toHaveCount(0);
  await expect(page.getByTestId("reviews-empty")).toHaveCount(0);
  if ((await page.getByTestId("real-review").count()) === 0) await expect(page.locator("#reviews")).toHaveCount(0);
  await expect(page.getByTestId("real-review").filter({ hasNotText: "데모 데이터 · 실제 후기 아님" })).toHaveCount(0);
  await expect(page.getByTestId("operating-metrics")).toHaveCount(0);
});

test("every main CTA leads into the same application flow", async ({ page }) => {
  await page.goto("/");
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  const services = page.locator("#services-title");
  // 히어로 · 통계 하단 · 하단 CTA → 점검 유형 선택
  for (const [where, name] of [
    ["#hero-cta", "나도 무료 점검 시작하기"],
    ["#proof-cta", "나도 무료 점검 시작하기"],
    ["#final-cta", "나도 무료 보험금 점검 시작하기"],
  ] as const) {
    await page.locator(where).getByRole("button", { name }).click();
    await expect(services, `${where} → 유형 선택`).toBeInViewport();
    await expect(services).toBeFocused();
  }
  // 유형 선택 CTA · 공감 섹션 CTA · 절차 CTA → 같은 신청 폼(선택한 유형 유지)
  await page.locator('#services input[value="hidden"]').check({ force: true });
  await page.locator("#type-cta").getByRole("button", { name: "선택한 보험금 무료 점검 상담 신청하기" }).click();
  await expect(page.locator("#apply-name")).toBeFocused();
  await page.getByRole("button", { name: "이전", exact: true }).click();
  await expect(page.locator("#apply-type-hidden")).toBeChecked();
  await page.locator("#cases").getByRole("button", { name: "해당하면 바로 신청서 작성하기" }).click();
  await expect(page.locator("#apply")).toBeInViewport();
  expect(await page.locator("form").count()).toBe(1);
  expect(page.url()).not.toContain("cont.insure.or.kr");
});

async function seedReviews(page: import("@playwright/test").Page, n: number) {
  const origin = { Origin: "http://localhost:3100" };
  const login = await page.request.post("/api/admin/login", {
    data: { role: "admin", password: process.env.DEMO_ADMIN_PASSWORD || "demo-admin-local" },
    headers: origin,
  });
  expect(login.ok()).toBeTruthy();
  const tag = Math.random().toString(36).slice(2, 7).replace(/\d/g, "q");
  const cats = ["history_lookup", "claim_guidance", "maturity_dormant", "medical_claim", "coverage_consult"];
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const res = await page.request.post("/api/admin/reviews", {
      data: { kind: "review", category: cats[i % cats.length], displayName: `${i + 3}0대 고객`, content: `덕분에 확인 순서를 알게 됐어요 ${tag}\n감사합니다`, useConsent: true },
      headers: origin,
    });
    const { id } = await res.json();
    ids.push(id);
    await page.request.patch(`/api/admin/reviews/${id}`, { data: { status: "approved" }, headers: origin });
  }
  return {
    tag,
    cleanup: async () => {
      for (const id of ids) await page.request.delete(`/api/admin/reviews/${id}`, { headers: origin });
    },
  };
}

test("real reviews appear only when approved; desktop 3-up / mobile 1-up; auto-slide + pause", async ({ page, isMobile }) => {
  const { tag, cleanup } = await seedReviews(page, 5);
  try {
    await page.goto("/");
    await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
    await expect(page.locator("#reviews").getByRole("heading", { level: 2 })).toHaveText("고객님들이 직접 전해주신 이야기");
    const mine = page.getByTestId("real-review").filter({ hasText: tag });
    await expect(mine).toHaveCount(5);
    await expect(mine.first()).toContainText("데모 데이터 · 실제 후기 아님");
    const track = page.getByTestId("chat-track");
    await track.scrollIntoViewIfNeeded();
    const fullyVisible = () =>
      track.evaluate((t) => {
        const r0 = t.getBoundingClientRect();
        return Array.from(t.children).filter((c) => {
          const r = c.getBoundingClientRect();
          return r.left >= r0.left - 1 && r.right <= r0.right + 1;
        }).length;
      });
    await expect.poll(fullyVisible).toBe(isMobile ? 1 : 3);
    await page.mouse.move(2, 2);
    await expect(track).toHaveAttribute("data-autoplay", "running");
    await expect.poll(() => track.evaluate((t) => t.scrollLeft), { timeout: 9000 }).toBeGreaterThan(50);
    await page.getByRole("button", { name: "자동 넘김 멈추기" }).click();
    await expect(track).toHaveAttribute("data-autoplay", "stopped");
  } finally {
    await cleanup();
  }
  await page.goto("/");
  await expect(page.locator("#reviews")).toHaveCount(0);
});

test("hero CTA scrolls to type selection; picked type flows into the single form", async ({ page }) => {
  await page.goto("/");
  expect(await page.locator("form").count()).toBe(1);
  await page.locator("#hero-cta").getByRole("button", { name: "나도 무료 점검 시작하기" }).click();
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
