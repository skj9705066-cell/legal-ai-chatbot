import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * 랜딩(2026-11 무료 방문 점검 개편) — 50~60대 고객용 8개 섹션.
 * 1 후킹 → 2 카드포인트·미청구 보험금 → 3 방문 점검 과정 → 4 실제 상담사 → 5 실제 후기(있을 때만) → 6 FAQ → 7 신청서 → 8 운영자 정보.
 * 압박·허위 표현 금지어, 큰 글씨·큰 버튼, 모든 CTA → 같은 신청서, 외부 조회 사이트 링크는 FAQ·푸터에만.
 */

const FORBIDDEN = [
  "모든 고객", "대상자로 선정", "금융위원회 인증", "100% 환급", "무조건", "80만 명", "방금 신청", "명이 신청", "님이 신청",
  "찾았어요", "찾았네요", "받았어요", "오늘만", "선착순", "마감 임박", "지금 바로 받으세요", "평균 환급", "404만",
];

const ORDER = ["hero", "money", "process", "counselor", "faq", "apply", "notice"];

async function ctaFreeScroll(page: Page) {
  await page.evaluate(() => {
    const ids = ["hero-cta", "process-cta", "reviews-cta", "apply"];
    const rects = ids.map((id) => document.getElementById(id)).filter(Boolean).map((el) => {
      const r = el!.getBoundingClientRect();
      return [r.top + window.scrollY, r.bottom + window.scrollY];
    });
    const h = window.innerHeight - 40;
    for (let y = 0; y < document.documentElement.scrollHeight; y += 20) {
      if (rects.every(([t, b]) => b <= y || t >= y + h)) return window.scrollTo(0, y);
    }
    throw new Error("no CTA-free scroll position");
  });
}

test("1. hero hook: exact copy, one highlight, free/no-condition/no-password trust, call option, no pressure words", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("혹시 아직찾지 못한 돈이있으신가요?");
  await expect(page.locator("#hero-title .text-forest")).toHaveText("찾지 못한 돈");
  await expect(page.locator("#hero")).toContainText("사용하지 않은 카드포인트부터 청구하지 못한 보험금까지.");
  await expect(page.locator("#hero")).toContainText("혼자 확인하기 어려우셨다면 무료로 안내해 드립니다.");
  await expect(page.locator("#hero-cta").getByRole("button", { name: "무료 방문 점검 신청하기" })).toBeVisible();
  await expect(page.locator('#hero-cta a[href="tel:01088222341"]')).toBeVisible();
  for (const t of ["점검 비용 무료", "보험 가입 조건 없음", "비밀번호를 묻지 않아요"]) await expect(page.locator("#hero").getByText(t)).toBeVisible();
  // 큰 글씨: 제목 34px 이상, 본문 18px 이상, 신청 버튼 60px 이상
  const h1 = await page.locator("#hero-title").evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(h1).toBeGreaterThanOrEqual(34);
  expect((await page.locator("#hero-cta").getByRole("button").boundingBox())!.height).toBeGreaterThanOrEqual(60);
  const text = await page.locator("body").innerText();
  for (const f of FORBIDDEN) expect(text, `forbidden phrase: ${f}`).not.toContain(f);
  await expect(page.getByText("데모 모드").first()).toBeVisible();
});

test("1. mobile first screen: headline and CTA fit above the fold", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  for (const [w, h] of [[360, 740], [390, 844], [430, 932]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/");
    const cta = await page.locator("#hero-cta").getByRole("button").boundingBox();
    expect(cta!.y + cta!.height, `CTA bottom at ${w}x${h}`).toBeLessThanOrEqual(h);
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  }
});

test("CTA copy A/B: ?cta=b swaps the main CTA label for the session; default is A", async ({ page }) => {
  await page.goto("/?cta=b");
  const hero = page.locator("#hero-cta").getByRole("button");
  await expect(hero).toHaveText("내가 놓친 돈 무료로 확인하기");
  await expect(hero).toHaveAttribute("data-cta-variant", "b");
  await page.goto("/");
  await expect(hero).toHaveText("내가 놓친 돈 무료로 확인하기");
  await page.evaluate(() => sessionStorage.clear());
  await page.goto("/");
  await expect(hero).toHaveText("무료 방문 점검 신청하기");
});

test("section order follows the requested journey and there is no fabricated social proof", async ({ page }) => {
  await page.goto("/");
  const tops = await page.evaluate((ids) => ids.map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? NaN), ORDER);
  for (let i = 1; i < tops.length; i++) expect(tops[i], `${ORDER[i]} after ${ORDER[i - 1]}`).toBeGreaterThan(tops[i - 1]);
  // 승인된 후기가 없으면 후기 섹션 자체가 없다. 운영 지표·가짜 카운터·실시간 알림 없음
  await expect(page.locator("#reviews")).toHaveCount(0);
  await expect(page.getByTestId("operating-metrics")).toHaveCount(0);
});

test("2. money cards: card points / unclaimed / hidden with notes; official stat with source; card CTA pre-checks the item", async ({ page }) => {
  await page.goto("/");
  const money = page.locator("#money");
  await expect(money.getByRole("heading", { level: 2 })).toHaveText("이런 돈, 확인해 보셨나요?");
  for (const t of ["쓰지 않고 잠든 카드포인트", "청구하지 않은 병원비·수술비", "잊고 지낸 만기·휴면 보험금"]) await expect(money.getByRole("heading", { name: t })).toBeVisible();
  await expect(money).toContainText("현금화 가능 여부와 조건은 카드사마다 달라요.");
  await expect(money).toContainText("3년 안에 청구하지 않으면");
  const stat = page.getByTestId("hidden-stat");
  await expect(stat).toContainText("약 10조 3,000억원");
  await expect(stat).toContainText("2025년 말 기준");
  await expect(stat.locator('a[href="https://www.fsc.go.kr/po010103/87270"]')).toBeVisible();
  await expect(stat).toContainText("개인별 환급 가능 여부나 환급 금액을 의미하거나 보장하지 않습니다");
  await expect(money).toContainText("지급을 뜻하지 않으며");
  // 카드에서 신청 → 그 항목이 관심 서비스에 체크되고 성함 칸으로
  await page.getByTestId("money-card_points").getByRole("button", { name: "이 항목 확인 신청하기" }).click();
  await expect(page.locator("#apply-name")).toBeFocused();
  await expect(page.locator("#apply-interest-card_points")).toBeChecked();
  await page.getByTestId("money-unclaimed").getByRole("button").click();
  await expect(page.locator("#apply-interest-unclaimed")).toBeChecked();
  await expect(page.locator("#apply-interest-card_points")).toBeChecked(); // 앞에서 고른 항목은 그대로
});

test("3. visit process: 4 steps, optional coverage only with separate consent, safety promises", async ({ page }) => {
  await page.goto("/");
  const p = page.locator("#process");
  const steps = p.getByRole("listitem").filter({ has: page.getByRole("heading", { level: 3 }) });
  await expect(steps.getByRole("heading", { level: 3 })).toHaveText(["1단계: 신청하기", "2단계: 전화 연락", "3단계: 방문 예약", "4단계: 함께 확인"]);
  await expect(page.getByTestId("process-optional")).toContainText("따로 동의를 받은 뒤");
  await expect(page.getByTestId("process-safety")).toContainText("비밀번호·인증번호·카드번호는 절대 여쭙지 않아요.");
  await expect(page.getByTestId("process-safety")).toContainText("보험금 지급 여부와 금액은 보험사가 결정해요.");
  await page.locator("#process-cta").getByRole("button").click();
  await expect(page.locator("#apply")).toBeInViewport();
});

test("4. counselor: real configured name and agency only, registration lookup link, no unverifiable claims", async ({ page }) => {
  await page.goto("/");
  const c = page.locator("#counselor");
  await expect(page.getByTestId("counselor-name")).toContainText("손국주");
  await expect(page.getByTestId("counselor-name")).toContainText("보험설계사");
  await expect(page.getByTestId("counselor-agency")).toHaveText("어센틱금융그룹 소속");
  await expect(c.locator('a[href="https://www.e-cleanins.or.kr"]')).toBeVisible();
  const text = await c.innerText();
  for (const f of ["경력", "년차", "수상", "전문가 인증", "1위", "명 상담"]) expect(text, `unverifiable claim: ${f}`).not.toContain(f);
  // 사진·인사말 설정이 없으면 지어내지 않는다(이니셜 아이콘, 인용문 없음)
  await expect(c.locator("img")).toHaveCount(0);
  await expect(c.locator("blockquote")).toHaveCount(0);
});

test("official lookup sites appear only in the FAQ and footer, never as a main-flow CTA", async ({ page }) => {
  await page.goto("/");
  const ext = 'a[href*="cont.insure.or.kr"], a[href*="cardpoint.or.kr"], a[href*="payinfo.or.kr"]';
  for (const sel of ["header", "#hero", "#money", "#process", "#counselor", "#apply", "#notice"]) {
    await expect(page.locator(sel).locator(ext), `external CTA in ${sel}`).toHaveCount(0);
  }
  await expect(page.locator("footer").locator('a[href*="cont.insure.or.kr"]')).toBeVisible();
  await page.goto("/#faq-official");
  await expect(page.locator('#faq-official a[href*="cont.insure.or.kr"]')).toBeVisible();
});

test("6. FAQ: 5 key questions first (free, no sign-up, where, passwords, when), rest behind '더 보기', card point links", async ({ page }) => {
  await page.goto("/");
  const faq = page.locator("#faq");
  for (const q of ["정말 무료인가요?", "보험에 가입해야 하나요?", "어디로 방문하나요?", "비밀번호나 인증번호를 물어보나요?", "신청하면 언제 연락이 오나요?"]) {
    await expect(faq.getByRole("button", { name: q })).toHaveAttribute("aria-expanded", "false");
  }
  await expect(faq.getByRole("button", { name: "카드포인트는 어떻게 찾나요?" })).toHaveCount(0);
  await faq.getByRole("button", { name: /질문 \d+개 더 보기/ }).click();
  await faq.getByRole("button", { name: "카드포인트는 어떻게 찾나요?" }).click();
  await expect(faq.locator('a[href="https://www.cardpoint.or.kr"]')).toBeVisible();
  await expect(faq.locator('a[href="https://www.payinfo.or.kr"]')).toBeVisible();
  await faq.getByRole("button", { name: "비밀번호나 인증번호를 물어보나요?" }).click();
  await expect(faq).toContainText("절대 여쭙지 않습니다");
});

test("7. form: six simple fields, big targets, validation in screen order, optional consent unchecked, hidden honeypot", async ({ page }) => {
  await page.goto("/#apply");
  const form = page.locator("#apply form");
  // 입력 순서: 성함 → 휴대전화 → 지역 → 연락 희망 시간 → 관심 서비스 → 동의
  await expect(form.getByLabel("성함")).toBeVisible();
  await expect(page.locator("#apply-phone")).toHaveAttribute("inputmode", "numeric");
  for (const r of ["서울", "경기", "인천", "그 외 지역"]) await expect(page.getByTestId("apply-region").getByText(r, { exact: true })).toBeVisible();
  await expect(page.getByTestId("apply-time").locator("input[type=radio]")).toHaveCount(4);
  await expect(page.getByTestId("apply-interests").locator("input[type=checkbox]")).toHaveCount(4);
  // 보험 상담은 신청서에서 받지 않는다(신청 후 별도 동의) — 관심 서비스에 보장분석 없음
  await expect(page.getByTestId("apply-interests")).not.toContainText("보장분석");
  await expect(page.getByTestId("apply-insurance-note")).toHaveText(/보험 가입은 무료 점검의 조건이 아니에요/);
  await expect(page.locator("#apply-privacy")).not.toBeChecked();
  await expect(page.locator("#apply-marketing")).not.toBeChecked();
  await expect(page.locator("#apply-third-party")).toHaveCount(0);
  const honeypot = page.locator("#apply-website");
  await expect(honeypot).toHaveAttribute("tabindex", "-1");
  expect(await honeypot.evaluate((el) => !!el.closest("[aria-hidden='true']") && el.getBoundingClientRect().right < 0)).toBe(true);
  // 큰 버튼: 신청 64px 이상, 선택 버튼 56px 이상
  const submit = form.getByRole("button", { name: "무료 점검 신청하기", exact: true });
  expect((await submit.boundingBox())!.height).toBeGreaterThanOrEqual(64);
  expect((await page.locator("label:has(#apply-region-seoul)").boundingBox())!.height).toBeGreaterThanOrEqual(56);
  expect((await page.locator("label:has(#apply-interest-hidden)").boundingBox())!.height).toBeGreaterThanOrEqual(56);
  // 빈 채로 누르면 첫 칸(성함)으로, 각 칸에 쉬운 안내
  await submit.click();
  await expect(page.locator("#apply-name")).toBeFocused();
  for (const t of ["성함을 입력해 주세요.", "휴대전화번호를 입력해 주세요.", "사시는 지역을 골라 주세요.", "연락받기 편한 시간을 골라 주세요.", "궁금하신 내용을 하나 이상 골라 주세요.", "개인정보 수집·이용에 동의해 주셔야 신청할 수 있어요."]) {
    await expect(form.getByText(t)).toBeVisible();
  }
  await page.fill("#apply-name", "데모");
  await page.fill("#apply-phone", "0101234");
  await submit.click();
  await expect(page.locator("#apply-phone")).toBeFocused();
  await expect(form.getByText("휴대전화번호를 다시 확인해 주세요")).toBeVisible();
  // 그 외 지역은 전화 안내, '잘 모르겠어요'는 다른 항목과 함께 고르지 않는다
  await page.locator("label:has(#apply-region-other)").click();
  await expect(page.getByTestId("apply-region")).toContainText("방문 대신 전화로");
  await page.locator("label:has(#apply-interest-hidden)").click();
  await page.locator("label:has(#apply-interest-not_sure)").click();
  await expect(page.locator("#apply-interest-hidden")).not.toBeChecked();
  await expect(page.locator("#apply-interest-not_sure")).toBeChecked();
  await page.locator("label:has(#apply-interest-unclaimed)").click();
  await expect(page.locator("#apply-interest-not_sure")).not.toBeChecked();
  // 동의 내용은 펼쳐 볼 수 있고, 새 수집 항목(지역·시간·관심 서비스)이 적혀 있다
  await page.locator("#apply-privacy").locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]").getByRole("button", { name: "내용 보기" }).click();
  await expect(form.getByText("성함, 휴대전화번호, 지역, 연락 희망 시간, 관심 서비스", { exact: false })).toBeVisible();
});

test("8. operator notice: planner affiliation, free and no insurance condition, not a public agency, privacy links", async ({ page }) => {
  await page.goto("/");
  const n = page.getByTestId("operator-notice");
  for (const t of ["보험대리점 소속 보험설계사가 운영", "보험 가입은 조건이 아니에요", "따로 동의하신 경우에만", "공공기관·금융당국이 운영하거나 맡긴 서비스가 아니에요"]) await expect(n).toContainText(t);
  const op = page.getByTestId("apply-operator");
  await expect(op).toContainText("어센틱금융그룹");
  await expect(op).toContainText("손국주");
  await expect(op.getByRole("link", { name: "개인정보 처리방침" })).toHaveAttribute("href", "/privacy");
  await expect(op.getByRole("link", { name: "동의 철회·삭제 요청" })).toHaveAttribute("href", "/privacy/withdraw");
});

test("5. real reviews appear only when approved; max 5; desktop 3-up / mobile 1-up; auto-slide + pause", async ({ page, isMobile }) => {
  const { tag, cleanup } = await seedReviews(page, 5);
  try {
    await page.goto("/");
    await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
    await expect(page.locator("#reviews").getByRole("heading", { level: 2 })).toHaveText("고객님들이 직접 전해주신 이야기");
    // 최근 승인된 후기 최대 5개
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
    // 자동 넘김 + 멈춤 (모바일 1장씩)
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

test("accessibility: landing has no serious axe violations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
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

test("mobile sticky CTA hides at the hero, the form and while typing", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/");
  const sticky = page.getByTestId("mobile-sticky-cta");
  await expect(sticky).toHaveAttribute("data-hidden", "true");
  await ctaFreeScroll(page);
  await expect(sticky).toHaveAttribute("data-hidden", "false");
  await expect(sticky.getByRole("button")).toHaveText("무료 방문 점검 신청하기");
  expect((await sticky.getByRole("button").boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await page.locator("#apply-form-title").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-hidden", "true");
  await ctaFreeScroll(page);
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

async function seedReviews(page: import("@playwright/test").Page, n: number) {
  // 관리자 로그인 레이트리밋이 다른 테스트와 섞이지 않게(로컬 전용 — Vercel에서는 덮어써짐)
  await page.setExtraHTTPHeaders({ "x-real-ip": `reviews-${test.info().testId}` });
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

test("real reviews appear only when approved; max 5; desktop 3-up / mobile 1-up; auto-slide + pause", async ({ page, isMobile }) => {
  const { tag, cleanup } = await seedReviews(page, 5);
  try {
    await page.goto("/");
    await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
    await expect(page.locator("#reviews").getByRole("heading", { level: 2 })).toHaveText("고객님들이 직접 전해주신 이야기");
    // 최근 승인된 후기 최대 5개
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
    // 자동 넘김 + 멈춤 (모바일 1장씩)
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
