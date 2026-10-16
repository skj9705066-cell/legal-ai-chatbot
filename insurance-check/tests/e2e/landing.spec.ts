import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const FORBIDDEN = ["모든 고객", "대상자로 선정", "금융위원회 인증", "100% 환급", "무조건", "80만 명", "방금 신청", "명이 신청", "님이 신청", "찾았어요", "찾았네요", "받았어요"];

test("story scene 1 (memory question) and scene 3 (official stat) with source and compliance copy", async ({ page }) => {
  await page.goto("/");
  // 장면 1: 성공 사례가 아니라 기억을 떠올리게 하는 질문
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("예전에 병원 다녀오셨죠?");
  await expect(page.getByTestId("hero-question")).toHaveText("그때 보험금은 모두 확인하셨나요?");
  await expect(page.getByTestId("hero-subtitle")).toHaveText("실손보험만 청구했거나, 가입한 다른 보장을 확인하지 않았을 수도 있어요.");
  await expect(page.locator("#hero-cta").getByRole("button", { name: "내 보험도 한번 확인하기" })).toBeVisible();
  await expect(page.getByTestId("hero-cta-note")).toHaveText("무료 점검 상담 · 보험금 지급 여부는 개별 확인 필요");
  // 장면 3: 숨은보험금 공식 통계 하나 + 미청구 병원비와 별개임을 표시
  const stats = page.locator("#stats");
  await expect(stats.getByRole("heading", { level: 2 })).toHaveText("오래전에 가입한 보험도 확인해 보세요.");
  await expect(page.getByTestId("fact-desc")).toHaveText("만기·중도·휴면보험금처럼 지급 시기가 지났지만 찾아가지 않은 보험금이 있을 수 있습니다.");
  await expect(stats).toContainText("2025년 말 기준");
  await expect(stats.getByRole("heading", { name: "숨은보험금", exact: true })).toBeVisible();
  await expect(stats).toContainText("약 10조 3,000억원");
  await expect(page.getByTestId("proof-notes")).toContainText("이 서비스 실적 아님");
  await expect(page.getByTestId("proof-notes")).toContainText("미청구 병원비·수술비와는 별개 통계");
  await expect(stats.locator('a[href="https://www.fsc.go.kr/po010103/87270"]')).toBeVisible();
  await expect(stats.getByText("2026년 7월 7일 발표", { exact: false })).toBeVisible();
  await expect(stats.getByText("개인별 환급을 뜻하지 않아요", { exact: false })).toBeVisible();
  // 지급 건수·지급액·정의·유의사항 전문은 '통계 자세히 보기'에
  await expect(page.getByTestId("stat-refund-count")).not.toBeVisible();
  await stats.getByRole("button", { name: "통계 자세히 보기" }).click();
  await expect(page.getByTestId("stat-refund-count")).toBeVisible();
  await expect(page.getByTestId("stat-refund-amount")).toBeVisible();
  await expect(stats.getByRole("heading", { name: "2025년 약 80만 건 지급" })).toHaveCount(1);
  await expect(stats).toContainText("약 3조 2,470억원");
  await expect(stats.getByText("사람 수가 아닙니다", { exact: false })).toBeVisible();
  await expect(stats.getByText("개인별 환급 가능 여부나 환급 금액을 의미하거나 보장하지 않습니다", { exact: false })).toBeVisible();
  await expect(stats).toContainText("청구하지 않은 보험금은 이 통계에 포함되지 않습니다");
  await expect(stats).toContainText("실시간으로 변하는 수치가 아닙니다");
  // 근거를 확인하지 못한 평균 환급액은 노출하지 않는다
  await expect(page.locator("body")).not.toContainText("404만");
  const text = await page.locator("body").innerText();
  for (const f of FORBIDDEN) expect(text, `forbidden phrase: ${f}`).not.toContain(f);
  for (const f of ["즉시 조회", "환급 대상 확인 완료", "보험금을 찾아드립니다"]) expect(text).not.toContain(f);
  await expect(page.getByText("데모 모드").first()).toBeVisible();
});

test("mobile first screen: headline, illustration and CTA all fit above the fold", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  for (const [w, h] of [[360, 740], [390, 844], [430, 932]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    const cta = await page.locator("#hero-cta").getByRole("button").boundingBox();
    expect(cta!.y + cta!.height, `CTA bottom at ${w}x${h}`).toBeLessThanOrEqual(h);
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  }
});

test("CTA copy A/B: ?cta=b swaps the main CTA labels and persists in the session; default is the story copy", async ({ page }) => {
  await page.goto("/?cta=b");
  const hero = page.locator("#hero-cta").getByRole("button");
  await expect(hero).toHaveText("혹시 놓친 보험금 확인하기");
  await expect(hero).toHaveAttribute("data-cta-variant", "b");
  await expect(page.locator("#action-cta").getByRole("button")).toHaveText("혹시 놓친 보험금 확인하기");
  await page.goto("/");
  await expect(hero).toHaveText("혹시 놓친 보험금 확인하기");
  await page.goto("/?cta=zzz");
  await expect(hero).toHaveText("혹시 놓친 보험금 확인하기");
  await page.evaluate(() => sessionStorage.clear());
  await page.goto("/");
  await expect(hero).toHaveText("내 보험도 한번 확인하기");
  await expect(page.locator("#action-cta").getByRole("button")).toHaveText("나도 무료 점검 시작하기");
});

test("no external lookup CTA in the main flow; official link kept in trust note, FAQ and footer", async ({ page }) => {
  await page.goto("/");
  const ext = 'a[href*="cont.insure.or.kr"]';
  for (const sel of ["header", "#hero-cta", "#empathy", "#stats", "#proof", "#services", "#action", "#reviews", "#process", "#apply", "#final-cta"]) {
    await expect(page.locator(`${sel} ${ext}`), `external CTA in ${sel}`).toHaveCount(0);
  }
  await expect(page.locator(`footer ${ext}`)).toBeVisible();
  await expect(page.locator(`#trust ${ext}`)).toBeVisible();
  // 헤더의 '공식 조회 안내'(#faq-official)는 '더 보기' 안의 해당 질문을 펼친다
  await page.goto("/#faq-official");
  await expect(page.locator(`#faq-official ${ext}`)).toBeVisible();
});

test("odometer counts up once on entry and stops exactly on the official figures", async ({ page }) => {
  // 통계가 첫 화면 아래에서 시작하도록 낮은 화면으로 연다(진입 전 idle 상태 확인용)
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 560 });
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
  // 화면에 보이는 자릿수를 바퀴 위치에서 직접 읽어 최종 표기와 비교 (지급액은 '자세히 보기' 안)
  await page.locator("#stats").getByRole("button", { name: "통계 자세히 보기" }).click();
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

test("story order: memory → empathy → official fact → 'is it me?' → action → process → apply; no fabricated chats", async ({ page }) => {
  await page.goto("/");
  const ids = ["hero-cta", "empathy", "stats", "services", "action", "process", "apply", "trust", "faq", "final-cta"];
  const order = await page.evaluate((list) => list.map((id) => document.getElementById(id)!.getBoundingClientRect().top + window.scrollY), ids);
  expect([...order].sort((x, y) => x - y)).toEqual(order);

  // 장면 2: 공감 — 보험증권·병원 영수증·달력이 하나씩 등장
  const empathy = page.locator("#empathy");
  await expect(empathy.getByRole("heading", { level: 2 })).toHaveText("보험료는 매달 내는데…");
  await expect(empathy).toContainText("내가 받을 수 있는 보장은 얼마나 알고 계신가요?");
  await expect(page.getByTestId("empathy-desc")).toHaveText("병원비, 수술비, 오래된 보험까지 확인할 항목은 생각보다 다양할 수 있어요.");
  await expect(empathy.locator(".stagger-item svg")).toHaveCount(3);

  // 장면 4: 선택형 카드 3개. 성공담·금액·사진 없음
  const pick = page.locator("#services");
  await expect(pick.getByRole("heading", { level: 2 })).toHaveText("혹시 나도 해당될까요?");
  for (const t of ["병원비·수술비를 청구하지 않았어요", "오래전에 가입한 보험이 있어요", "어떤 보장을 받는지 잘 모르겠어요"]) {
    await expect(pick.getByRole("button", { name: t })).toHaveAttribute("aria-pressed", "false");
  }
  await expect(page.getByTestId("pick-footnote")).toContainText("보험금 지급을 뜻하지는 않아요");
  await expect(pick.locator("img")).toHaveCount(0);
  expect(await pick.innerText()).not.toMatch(/\d[\d,]*\s*(만\s*)?원/);

  // 장면 5: 행동
  const action = page.locator("#action");
  await expect(action.getByRole("heading", { level: 2 })).toHaveText("그렇다면 이번 기회에 확인해 보세요.");
  await expect(action).toContainText("가입한 보험에서 무엇을 확인해야 할지 무료로 안내받아 보세요.");
  await expect(action.getByRole("button", { name: "나도 무료 점검 시작하기" })).toBeVisible();

  // 절차: 3단계 그림 + 핵심 고지, 상세는 접기
  await expect(page.getByTestId("process-key-notice")).toHaveText("보험금 지급 여부와 금액은 보험사가 결정합니다.");
  await expect(page.locator("#process-panel")).not.toBeVisible();
  await page.getByRole("button", { name: "유형별 절차·필요 서류 자세히 보기" }).click();
  await expect(page.locator("#process-panel")).toBeVisible();

  // 가상 대화 갤러리는 없다. 실제 후기 영역은 동의·승인된 후기가 있을 때만(데모 표시 필수)
  await expect(page.getByTestId("chat-example")).toHaveCount(0);
  if ((await page.getByTestId("real-review").count()) === 0) await expect(page.locator("#reviews")).toHaveCount(0);
  await expect(page.getByTestId("real-review").filter({ hasNotText: "데모 데이터 · 실제 후기 아님" })).toHaveCount(0);
  await expect(page.getByTestId("operating-metrics")).toHaveCount(0);
});

test("every CTA leads into the same application flow; the picked card carries its type into the form", async ({ page }) => {
  await page.goto("/");
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  const pickTitle = page.locator("#services-title");
  // 히어로 · 하단 CTA → "혹시 나도 해당될까요?"
  for (const [where, name] of [
    ["#hero-cta", "내 보험도 한번 확인하기"],
    ["#final-cta", "나도 무료 보험금 점검 시작하기"],
  ] as const) {
    await page.locator(where).getByRole("button", { name }).click();
    await expect(pickTitle, `${where} → 해당 여부 선택`).toBeInViewport();
    await expect(pickTitle).toBeFocused();
  }
  // 카드를 고르면 선택 상태 + 안내, 화면은 강제로 이동하지 않는다
  const y0 = await page.evaluate(() => window.scrollY);
  await page.getByTestId("pick-unclaimed").click();
  await expect(page.getByTestId("pick-unclaimed")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("pick-hint")).toHaveText("선택한 내용이 신청서에 반영돼요");
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - y0)).toBeLessThan(40);
  await expect(page.getByTestId("action-picked")).toHaveText("병원비·수술비 점검");
  // 행동 장면 CTA → 중간 화면 없이 연락처 단계, 고른 유형 표시
  await page.locator("#action-cta").getByRole("button").click();
  await expect(page.locator("#apply-name")).toBeFocused();
  await expect(page.getByTestId("apply-picked-type")).toContainText("병원비·수술비");
  await page.getByRole("button", { name: "점검 유형 변경" }).click();
  await expect(page.locator("#apply-type-unclaimed")).toBeChecked();
  // 폼에서 바꾼 유형은 위 선택 카드에도 반영된다. 해지환급금은 선택 시 고지
  await page.locator("#apply-type-hidden").check({ force: true });
  await expect(page.getByTestId("pick-old-policy")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#apply-type-refund").check({ force: true });
  await expect(page.getByTestId("apply-type-desc")).toContainText("해지하면 보장이 사라집니다");
  // '잘 모르겠어요'는 유형을 정하지 않고 폼에서 고르게 한다
  await page.getByTestId("pick-unsure").click();
  await expect(page.getByTestId("pick-unsure")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("action-picked")).toHaveCount(0);
  await page.locator("#action-cta").getByRole("button").click();
  await expect(page.locator("#apply")).toBeInViewport();
  expect(await page.locator("form").count()).toBe(1);
  expect(page.url()).not.toContain("cont.insure.or.kr");
});

test("trust copy, FAQ (4 first, rest behind 더 보기) and the official lookup note", async ({ page }) => {
  await page.goto("/");
  for (const t of ["무료 점검 상담", "지급은 보험사가 결정", "동의한 상담만", "공식 조회도 가능"]) {
    await expect(page.getByRole("heading", { name: t, exact: true })).toBeVisible();
  }
  const note = page.getByTestId("official-lookup-note");
  await expect(note.locator('a[href="https://cont.insure.or.kr"]')).toBeVisible();
  await expect(note).toContainText("개인정보를 제출할 필요가 없습니다");
  const faq = page.locator("#faq");
  for (const q of ["점검 안내는 정말 무료인가요?", "상담을 받으면 보험금을 받을 수 있나요?", "보험사 정보를 직접 조회하나요?", "개인정보는 어떻게 처리하나요?"]) {
    await expect(faq.getByRole("button", { name: q })).toHaveAttribute("aria-expanded", "false");
  }
  await expect(faq.getByRole("button", { name: "신청하면 전화가 오나요?" })).toHaveCount(0);
  await faq.getByRole("button", { name: /질문 \d+개 더 보기/ }).click();
  for (const q of ["어떤 서비스를 제공하나요?", "신청하면 전화가 오나요?", "동의를 철회하거나 정보 삭제를 요청하려면요?"]) {
    await expect(faq.getByRole("button", { name: q })).toHaveCount(1);
  }
  await faq.getByRole("button", { name: "상담을 받으면 보험금을 받을 수 있나요?" }).click();
  await expect(faq.getByText("보장하지 않습니다.", { exact: false })).toBeVisible();
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

test("real reviews appear only when approved; max 3; desktop 3-up / mobile 1-up; auto-slide + pause", async ({ page, isMobile }) => {
  const { tag, cleanup } = await seedReviews(page, 5);
  try {
    await page.goto("/");
    await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
    await expect(page.locator("#reviews").getByRole("heading", { level: 2 })).toHaveText("고객님들이 직접 전해주신 이야기");
    // 최근 승인된 후기 3개만 노출
    const mine = page.getByTestId("real-review").filter({ hasText: tag });
    await expect(mine).toHaveCount(3);
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
    // 3장은 데스크톱 한 화면에 모두 보여 자동 넘김이 없다. 모바일은 1장씩 자동 넘김 + 멈춤
    if (isMobile) {
      await page.mouse.move(2, 2);
      await expect(track).toHaveAttribute("data-autoplay", "running");
      await expect.poll(() => track.evaluate((t) => t.scrollLeft), { timeout: 9000 }).toBeGreaterThan(50);
      await page.getByRole("button", { name: "자동 넘김 멈추기" }).click();
      await expect(track).toHaveAttribute("data-autoplay", "stopped");
    }
    // 후기 아래 CTA도 같은 신청 폼으로
    await page.locator("#reviews-cta").getByRole("button", { name: "나도 무료 점검 신청하기" }).click();
    await expect(page.locator("#apply")).toBeInViewport();
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
  await expect(page.getByTestId("apply-type-desc")).toContainText("공식 조회 안내");
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
  for (const width of [360, 375, 390, 430, 768, 1024, 1440]) {
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
  await page.evaluate(() => window.scrollTo(0, document.getElementById("stats")!.getBoundingClientRect().top + window.scrollY));
  await expect(sticky).toHaveAttribute("data-hidden", "false");
  await expect(sticky.getByRole("button")).toHaveText("나도 무료 점검 시작하기");
  await page.locator("#apply-step-title").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-hidden", "true");
  await page.locator("#final-cta").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-hidden", "true");
  // 입력창에 포커스가 있으면(키보드가 열린 상태) 숨긴다
  await page.evaluate(() => window.scrollTo(0, document.getElementById("stats")!.getBoundingClientRect().top + window.scrollY));
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
