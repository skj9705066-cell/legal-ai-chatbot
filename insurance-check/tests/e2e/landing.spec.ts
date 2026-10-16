import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const FORBIDDEN = ["모든 고객", "대상자로 선정", "금융위원회 인증", "100% 환급", "무조건", "80만 명", "방금 신청", "명이 신청", "님이 신청", "찾았어요", "찾았네요", "받았어요"];

test("hero, stats with source and compliance copy", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("혹시 확인하지 못한 보험금이 있을까요?").first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("나도 모르게 놓친 보험금,아직 있을 수 있습니다.");
  await expect(page.getByTestId("hero-subtitle")).toHaveText("보험료는 매달 내고 있는데,받을 수 있는 보장은 얼마나 알고 계신가요?");
  await expect(page.locator("#hero-cta").getByRole("button", { name: "나도 무료 점검 시작하기" })).toBeVisible();
  await expect(page.getByTestId("hero-cta-note")).toHaveText("무료 상담 신청 · 보험금 지급 여부는 보험계약 및 심사 결과에 따라 달라집니다.");
  await expect(page.locator("#stats").getByRole("heading", { level: 2 })).toHaveText("생각보다 많은 보험금이 아직 찾아가지 않은 상태입니다.");
  await expect(page.locator("#stats")).toContainText("내가 가입한 보험에도 확인하지 못한 지급 항목이 있을까요?");
  await expect(page.locator("#stats")).toContainText("약 10조 3,000억원");
  // 사회적 증거: 전국 공식 집계 · 건수(사람 수 아님) · 이 서비스 실적 아님
  const proof = page.locator("#proof");
  await expect(proof.getByRole("heading", { level: 3 })).toHaveText("2025년 한 해, 약 80만 건의 숨은보험금이 지급됐습니다.");
  await expect(page.getByTestId("proof-notes")).toContainText("사람 수 아님");
  await expect(page.getByTestId("proof-notes")).toContainText("이 서비스 실적이 아닌 전국 공식 집계");
  const stats = proof;
  await expect(stats).toContainText("약 80만 건");
  await expect(stats).toContainText("약 3조 2,470억원");
  // 근거를 확인하지 못한 평균 환급액은 노출하지 않는다
  await expect(page.locator("body")).not.toContainText("404만");
  await expect(page.getByTestId("stat-refund-average")).toHaveCount(0);
  await expect(stats).toContainText("금융위원회");
  await expect(stats).toContainText("2026년 7월 7일");
  await expect(stats).toContainText("실시간으로 변하는 수치가 아닙니다");
  // 미청구 병원비는 숨은보험금 통계에 포함되지 않음을 함께 밝힌다
  await expect(stats).toContainText("청구하지 않은 보험금은 이 통계에 포함되지 않습니다");
  await expect(stats.locator('a[href="https://www.fsc.go.kr/po010103/87270"]')).toBeVisible();
  await expect(stats.getByText("개인별 환급 가능 여부나 환급 금액을 의미하거나 보장하지 않습니다")).toBeVisible();
  await expect(page.getByTestId("proof-hook")).toHaveText("많은 보험금이 지급되고 있다는 사실,혹시 처음 알게 되셨나요?");
  await expect(page.locator("#proof-cta").getByRole("button", { name: "내 보험에서 확인할 항목 알아보기" })).toBeVisible();
  const text = await page.locator("body").innerText();
  for (const f of FORBIDDEN) expect(text, `forbidden phrase: ${f}`).not.toContain(f);
  for (const f of ["즉시 조회", "환급 대상 확인 완료", "보험금을 찾아드립니다"]) expect(text).not.toContain(f);
  await expect(page.getByText("데모 모드").first()).toBeVisible();
});

test("CTA copy A/B: ?cta=b swaps the main CTA label and persists in the session; default is A", async ({ page }) => {
  await page.goto("/?cta=b");
  const hero = page.locator("#hero-cta").getByRole("button");
  await expect(hero).toHaveText("혹시 놓친 보험금 확인하기");
  await expect(hero).toHaveAttribute("data-cta-variant", "b");
  await page.goto("/");
  await expect(hero).toHaveText("혹시 놓친 보험금 확인하기");
  await page.goto("/?cta=zzz");
  await expect(hero).toHaveText("혹시 놓친 보험금 확인하기");
  await page.evaluate(() => sessionStorage.clear());
  await page.goto("/");
  await expect(hero).toHaveText("나도 무료 점검 시작하기");
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
  for (const id of ["stat-main", "stat-refund-count", "stat-refund-amount"]) {
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

test("page order: hero → stats → empathy cards → types → apply; no fabricated chats", async ({ page }) => {
  await page.goto("/");
  const ids = ["hero-cta", "stats", "cases", "services", "process", "apply", "faq", "final-cta"];
  const order = await page.evaluate((list) => list.map((id) => document.getElementById(id)!.getBoundingClientRect().top + window.scrollY), ids);
  expect([...order].sort((x, y) => x - y)).toEqual(order);

  // 공감 섹션: 질문형 카드 4개. 성공담·금액·사진 없음
  const cases = page.locator("#cases");
  await expect(cases.getByRole("heading", { level: 2 })).toHaveText("혹시 이런 경험, 한 번쯤 있으신가요?");
  await expect(cases).toContainText("하나라도 해당된다면 가입한 보험을 다시 확인해 볼 이유가 있습니다.");
  for (const t of ["예전에 수술받은 적 있으신가요?", "10년 전 가입한 보험, 기억나시나요?", "병원비 청구를 미뤄두신 적 있나요?", "보험은 여러 개, 보장 내용은 헷갈리시나요?"]) {
    await expect(cases.getByRole("button").filter({ hasText: t })).toHaveCount(1);
  }
  await expect(page.getByTestId("cases-footnote")).toContainText("보험금 지급을 뜻하지 않으며");
  await expect(cases.locator("img")).toHaveCount(0);
  expect(await cases.innerText()).not.toMatch(/\d[\d,]*\s*(만\s*)?원/);

  // 점검 유형: 해지환급금이 '받을 돈'처럼 보이지 않게 해지 시 보장 소멸·해지 비권유를 함께 표시
  const types = page.locator("#services");
  await expect(types.getByRole("heading", { level: 2 })).toHaveText("어떤 보험금이 궁금하신가요?");
  await expect(page.getByTestId("type-refund")).toContainText("해지하면 보장이 사라집니다");
  await expect(page.getByTestId("type-refund")).toContainText("해지를 권유하지 않습니다");

  // 가상 대화 갤러리는 없다. 실제 후기 영역은 동의·승인된 후기가 있을 때만(데모 표시 필수)
  await expect(page.getByTestId("chat-example")).toHaveCount(0);
  await expect(page.getByTestId("reviews-empty")).toHaveCount(0);
  if ((await page.getByTestId("real-review").count()) === 0) await expect(page.locator("#reviews")).toHaveCount(0);
  await expect(page.getByTestId("real-review").filter({ hasNotText: "데모 데이터 · 실제 후기 아님" })).toHaveCount(0);
  await expect(page.getByTestId("operating-metrics")).toHaveCount(0);
});

test("every CTA leads into the same application flow; cards go straight to the form with their type", async ({ page }) => {
  await page.goto("/");
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  const services = page.locator("#services-title");
  // 히어로 · 통계 하단 · 하단 CTA → 점검 유형 선택
  for (const [where, name] of [
    ["#hero-cta", "나도 무료 점검 시작하기"],
    ["#proof-cta", "내 보험에서 확인할 항목 알아보기"],
    ["#final-cta", "나도 무료 보험금 점검 시작하기"],
  ] as const) {
    await page.locator(where).getByRole("button", { name }).click();
    await expect(services, `${where} → 유형 선택`).toBeInViewport();
    await expect(services).toBeFocused();
  }
  // 유형 카드 → 중간 화면 없이 연락처 입력
  await page.getByTestId("type-refund").click();
  await expect(page.locator("#apply-name")).toBeFocused();
  await expect(page.locator("#apply-step-title")).toHaveText("연락받으실 분을 알려주세요");
  await page.getByRole("button", { name: "이전", exact: true }).click();
  await expect(page.locator("#apply-type-refund")).toBeChecked();
  // 공감 카드 → 해당 유형으로 바로 신청
  await page.getByTestId("case-old-policy").click();
  await expect(page.locator("#apply-name")).toBeFocused();
  await page.getByRole("button", { name: "이전", exact: true }).click();
  await expect(page.locator("#apply-type-hidden")).toBeChecked();
  // 유형이 정해지지 않은 카드는 고른 유형을 지우지 않는다
  await page.getByTestId("case-multiple").click();
  await expect(page.locator("#apply")).toBeInViewport();
  await expect(page.locator("#apply-type-hidden")).toBeChecked();
  // 유형을 모를 때의 보조 버튼과 공감 섹션 하단 CTA도 같은 폼
  await page.locator("#type-cta").getByRole("button").click();
  await expect(page.locator("#apply")).toBeInViewport();
  await page.locator("#cases-cta").getByRole("button", { name: "나도 무료 점검 시작하기" }).click();
  await expect(page.locator("#apply")).toBeInViewport();
  expect(await page.locator("form").count()).toBe(1);
  expect(page.url()).not.toContain("cont.insure.or.kr");
});

test("trust copy, FAQ answers and the official lookup note", async ({ page }) => {
  await page.goto("/");
  for (const t of ["무료 점검 상담", "지급은 보험사가 결정", "동의한 상담만", "공식 조회도 가능"]) {
    await expect(page.getByRole("heading", { name: t, exact: true })).toBeVisible();
  }
  const note = page.getByTestId("official-lookup-note");
  await expect(note.locator('a[href="https://cont.insure.or.kr"]')).toBeVisible();
  await expect(note).toContainText("개인정보를 제출할 필요가 없습니다");
  for (const q of ["어떤 서비스를 제공하나요?", "보험사 정보를 직접 조회하나요?", "신청하면 전화가 오나요?", "개인정보는 어떻게 처리하나요?"]) {
    await expect(page.locator("#faq").getByRole("button", { name: q })).toHaveCount(1);
  }
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
    // 후기 아래 CTA도 같은 신청 폼으로
    await page.locator("#reviews-cta").getByRole("button", { name: "나도 무료 점검 신청하기" }).click();
    await expect(page.locator("#apply")).toBeInViewport();
    await expect(track).toHaveAttribute("data-autoplay", "stopped");
  } finally {
    await cleanup();
  }
  await page.goto("/");
  await expect(page.locator("#reviews")).toHaveCount(0);
});

test("wizard: 3 steps (type → name/phone → consent), per-step validation, optional consents unchecked", async ({ page }) => {
  await page.goto("/#apply");
  const next = page.getByRole("button", { name: "다음", exact: true });
  await next.click();
  await expect(page.getByText("점검 유형을 선택해 주세요.")).toBeVisible();
  await expect(page.locator("#apply-type-unclaimed")).toBeFocused();
  await page.locator("#apply-type-hidden").check({ force: true });
  await next.click();
  await expect(page.getByRole("heading", { name: "연락받으실 분을 알려주세요" })).toBeFocused();
  await expect(page.locator("#apply-phone")).toHaveAttribute("inputmode", "numeric");
  await page.fill("#apply-name", "데모");
  await page.fill("#apply-phone", "0101234");
  await next.click();
  await expect(page.getByText("휴대전화번호 형식을 확인해 주세요")).toBeVisible();
  await expect(page.locator("#apply-phone")).toBeFocused();
  await page.fill("#apply-phone", "010-0000-0000");
  await next.click();
  // 희망 시간·메모 단계 없이 바로 동의
  await expect(page.getByRole("heading", { name: "마지막으로 확인해 주세요" })).toBeVisible();
  await expect(page.locator("#apply-time-anytime")).toHaveCount(0);
  await expect(page.locator("#apply-memo")).toHaveCount(0);
  await expect(page.locator("#apply-privacy")).not.toBeChecked();
  await expect(page.locator("#apply-marketing")).not.toBeChecked();
  // 데모(제3자 제공 없음)에서는 제3자 제공 동의를 받지 않는다
  await expect(page.locator("#apply-third-party")).toHaveCount(0);
  // 마지막 단계의 긴 신청 버튼이 좁은 화면에서 가로 넘침을 만들지 않는다
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await page.getByRole("button", { name: "무료 점검 상담 신청하기", exact: true }).click();
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

test("mobile sticky CTA hides at hero, the form, the final CTA and while typing", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/");
  const sticky = page.getByTestId("mobile-sticky-cta");
  await expect(sticky).toHaveAttribute("data-hidden", "true");
  await page.locator("#process").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-hidden", "false");
  await expect(sticky.getByRole("button")).toHaveText("나도 무료 점검 시작하기");
  await page.locator("#apply-step-title").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-hidden", "true");
  await page.locator("#final-cta").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-hidden", "true");
  // 입력창에 포커스가 있으면(키보드가 열린 상태) 숨긴다
  await page.locator("#process").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-hidden", "false");
  await page.evaluate(() => {
    const i = document.createElement("input");
    i.id = "probe";
    document.body.appendChild(i);
    i.focus({ preventScroll: true });
  });
  await expect(sticky).toHaveAttribute("data-hidden", "true");
  await page.evaluate(() => (document.activeElement as HTMLElement).blur());
  await expect(sticky).toHaveAttribute("data-hidden", "false");
});
