import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const FORBIDDEN = ["모든 고객", "대상자로 선정", "금융위원회 인증", "100% 환급", "무조건", "80만 명", "방금 신청", "명이 신청", "님이 신청"];

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
  await expect(proof.getByRole("heading", { level: 2 })).toHaveText("2025년 한 해, 약 80만 건의 숨은보험금이 지급됐습니다.");
  await expect(page.getByTestId("proof-notes")).toContainText("사람 수가 아닙니다");
  await expect(page.getByTestId("proof-notes")).toContainText("이 서비스의 상담·지급 실적이 아닌");
  await expect(page.getByTestId("proof-closing")).toHaveText("보험금 확인, 특별한 사람들만 하는 일이 아닙니다.");
  await expect(proof).toContainText("혹시 놓친 보험금이 있는지 나도 확인해 보세요.");
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

test("persuasion flow: stats → proof → cases → real review gallery → types; examples clearly labeled", async ({ page }) => {
  await page.goto("/");
  const ids = ["stats", "proof", "cases", "reviews", "services", "process", "apply", "faq"];
  const order = await page.evaluate((list) => list.map((id) => document.getElementById(id)!.getBoundingClientRect().top + window.scrollY), ids);
  expect([...order].sort((x, y) => x - y)).toEqual(order);

  const cases = page.locator("#cases");
  await expect(cases.getByRole("heading", { level: 2 })).toHaveText("이런 경우라면, 나도 확인이 필요할 수 있어요.");
  for (const t of ["예전에 수술을 받은 직장인", "오래전 가입한 보험을 잊은 고객", "부모님 보험을 확인하는 자녀", "보험을 여러 개 가입한 고객"]) {
    await expect(cases.getByRole("heading", { level: 3, name: t })).toBeVisible();
  }
  await expect(cases.getByText("상황 예시", { exact: true })).toHaveCount(4);
  await expect(page.getByTestId("cases-footnote")).toContainText("실제 지급 성공 사례가 아닌 일반적인 상황 예시");
  await expect(page.getByTestId("cases-footnote")).toContainText("숨은보험금 통계와 별개");
  // 인물은 일러스트뿐 — 사진·이름·금액 없음
  await expect(cases.locator("img")).toHaveCount(0);
  expect(await cases.innerText()).not.toMatch(/\d[\d,]*\s*(만\s*)?원/);

  // 대화 갤러리: 실제 후기가 없으면 '가상 상황을 재구성한 대화 예시' 5개 — 빈 '준비 중' 영역 없음
  const reviews = page.locator("#reviews");
  await expect(reviews.getByRole("heading", { level: 2 })).toHaveText("나도 놓치고 있었을지 모르는 보험금");
  await expect(page.getByTestId("reviews-empty")).toHaveCount(0);
  await expect(page.getByTestId("example-label")).toContainText("가상 상황을 재구성한 대화 예시");
  const examples = page.getByTestId("chat-example");
  if ((await page.getByTestId("real-review").count()) === 0) {
    await expect(page.getByTestId("reviews-subtitle")).toHaveText("보험금 점검 과정에서 생길 수 있는 다양한 상황을 대화 형식으로 재구성했습니다.");
    await expect(examples).toHaveCount(5);
    for (const t of ["수술비 특약 확인", "오래전 가입한 보험", "부모님 보험", "만기보험금", "병원비 청구"]) {
      await expect(examples.filter({ hasText: t })).toHaveCount(1);
    }
    await expect(examples.filter({ hasText: "보험 약관과 청구권 소멸시효 등을 확인해야 합니다." })).toHaveCount(1);
  }
  // 예시 카드: 재구성 표시, 가짜 프로필 사진·금액 없음
  for (const card of await examples.all()) {
    await expect(card).toContainText("재구성 예시");
    await expect(card.locator("img")).toHaveCount(0);
    expect(await card.innerText()).not.toMatch(/\d[\d,]*\s*(만\s*)?원/);
  }
  await expect(page.getByTestId("real-review").filter({ hasNotText: "데모 데이터 · 실제 후기 아님" })).toHaveCount(0);
  await expect(page.getByTestId("operating-metrics")).toHaveCount(0);
  await expect(page.locator("#gallery-cta")).toContainText("혹시 나도 놓친 보험금이 있을까요?");
  await page.locator("#gallery-cta").getByRole("button", { name: "나도 무료 점검 시작하기" }).click();
  await expect(page.locator("#services-title")).toBeInViewport();
  await page.goto("/");

  // 사회적 증거 아래 CTA → 사이트 안의 유형 선택
  await page.locator("#proof-cta").getByRole("button", { name: "나도 무료 점검 시작하기" }).click();
  await expect(page.locator("#services-title")).toBeInViewport();
  await expect(page.locator("#services-title")).toBeFocused();
});

test("chat gallery: approved real reviews take the place of same-type examples; desktop 3-up / mobile 1-up", async ({ page, isMobile }) => {
  const origin = { Origin: "http://localhost:3100" };
  const login = await page.request.post("/api/admin/login", {
    data: { role: "admin", password: process.env.DEMO_ADMIN_PASSWORD || "demo-admin-local" },
    headers: origin,
  });
  expect(login.ok()).toBeTruthy();
  const tag = Math.random().toString(36).slice(2, 7).replace(/\d/g, "q");
  const lines = ["잊고 있던 보험이 있는 줄 몰랐어요.", "알려주신 순서대로 확인해 볼게요!\n정말 감사합니다", "부모님 보험도 같이 봐야겠어요.", "청구 서류를 미리 알려주셔서 편했어요.\n친절하게 설명해 주셔서 감사해요.\n다음에 또 문의드릴게요.", "만기된 줄 몰랐던 보험을 찾았어요."];
  const categories = ["history_lookup", "claim_guidance", "maturity_dormant", "medical_claim", "maturity_dormant"];
  const ids: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const res = await page.request.post("/api/admin/reviews", {
      data: { kind: "review", category: categories[i], displayName: `${i + 3}0대 고객`, content: `${lines[i]} ${tag}`, useConsent: true },
      headers: origin,
    });
    const { id } = await res.json();
    ids.push(id);
    expect((await page.request.patch(`/api/admin/reviews/${id}`, { data: { status: "approved" }, headers: origin })).ok()).toBeTruthy();
  }
  // 동의 없는 후기는 섞여 있어도 공개되지 않는다
  const hiddenRes = await page.request.post("/api/admin/reviews", {
    data: { kind: "review", category: "coverage_consult", displayName: "60대 고객", content: `동의 없는 후기입니다 ${tag}`, useConsent: false },
    headers: origin,
  });
  ids.push((await hiddenRes.json()).id);

  try {
    await page.goto("/");
    await page.locator("#reviews").scrollIntoViewIfNeeded();
    const mine = page.getByTestId("real-review").filter({ hasText: tag });
    await expect(mine).toHaveCount(5);
    // 같은 유형 예시 4장이 실제 후기로 바뀌고(만기 1건은 앞에 추가), 해당 유형이 없는 '부모님 보험' 예시만 남는다
    await expect(page.getByTestId("chat-example")).toHaveCount(1);
    await expect(page.getByTestId("chat-example")).toContainText("부모님 보험");
    await expect(page.getByTestId("example-label")).toContainText("'실제 후기' 표시가 있는 카드만");
    // 여러 줄 원문 = 말풍선 여러 개
    await expect(mine.filter({ hasText: "청구 서류를" }).locator("li")).toHaveCount(3);

    const fullyVisible = () =>
      page.getByTestId("chat-track").evaluate((track) => {
        const t = track.getBoundingClientRect();
        return Array.from(track.children).filter((c) => {
          const r = c.getBoundingClientRect();
          return r.left >= t.left - 1 && r.right <= t.right + 1;
        }).length;
      });
    await expect.poll(fullyVisible).toBe(isMobile ? 1 : 3);
    const before = await page.getByTestId("chat-track").evaluate((t) => t.scrollLeft);
    await page.getByRole("button", { name: "대화 카드 오른쪽으로 넘기기" }).click();
    await expect.poll(() => page.getByTestId("chat-track").evaluate((t) => t.scrollLeft)).toBeGreaterThan(before + 50);
    await expect.poll(fullyVisible).toBe(isMobile ? 1 : 3); // 스크롤 스냅이 끝난 뒤에도 한 화면에 1장/3장
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  } finally {
    for (const id of ids) await page.request.delete(`/api/admin/reviews/${id}`, { headers: origin });
  }
  await page.goto("/");
  await expect(page.getByTestId("real-review").filter({ hasText: tag })).toHaveCount(0);
});

test("chat gallery auto-slides only when motion is allowed, and can be paused", async ({ page }) => {
  await page.goto("/");
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  const track = page.getByTestId("chat-track");
  await track.scrollIntoViewIfNeeded();
  await expect(track).toHaveAttribute("data-autoplay", "running");
  await page.mouse.move(2, 2); // 마우스가 카드 위에 있으면 멈추므로 비켜 둔다
  await expect.poll(() => track.evaluate((t) => t.scrollLeft), { timeout: 9000 }).toBeGreaterThan(50);
  await page.getByRole("button", { name: "자동 넘김 멈추기" }).click();
  await expect(track).toHaveAttribute("data-autoplay", "stopped");
  await expect(page.getByRole("button", { name: "자동 넘김 다시 시작" })).toBeVisible();
});

test("chat gallery does not auto-slide with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const track = page.getByTestId("chat-track");
  await track.scrollIntoViewIfNeeded();
  await expect(track).toHaveAttribute("data-autoplay", "stopped");
  const start = await track.evaluate((t) => t.scrollLeft);
  await page.waitForTimeout(5800);
  expect(await track.evaluate((t) => t.scrollLeft)).toBe(start);
  await expect(page.getByRole("button", { name: "자동 넘김 멈추기" })).toHaveCount(0);
});

test("final CTA copy and it stays inside the site", async ({ page }) => {
  await page.goto("/");
  const final = page.locator("#final-cta");
  await expect(final.getByRole("heading", { level: 2 })).toHaveText("혹시 나도 놓치고 있는 보험금이 있을까요?");
  await expect(final).toContainText("가입한 보험을 모두 기억하지 못하더라도, 확인할 수 있는 방법은 있습니다.");
  await final.getByRole("button", { name: "나도 무료 보험금 점검 시작하기" }).click();
  await expect(page.locator("#services-title")).toBeInViewport();
  expect(new URL(page.url()).host).toBe(new URL(page.url()).host);
  expect(page.url()).not.toContain("cont.insure.or.kr");
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
