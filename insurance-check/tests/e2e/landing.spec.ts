import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const FORBIDDEN = ["모든 고객", "대상자로 선정", "금융위원회 인증", "100% 환급", "무조건", "80만 명", "방금 신청", "명이 신청", "님이 신청", "찾았어요", "찾았네요", "받았어요"];

test("hero title is exactly 2 lines on PC (1024~1920) and never overflows its column", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop only");
  for (const width of [1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const m = await page.locator("#hero-title").evaluate((h) => {
      const lh = parseFloat(getComputedStyle(h).lineHeight);
      const col = h.parentElement!.getBoundingClientRect();
      // 줄(span)은 block이라 텍스트 실제 폭은 Range로 잰다
      const spans = Array.from(h.children).map((c) => {
        const r = document.createRange();
        r.selectNodeContents(c);
        return r.getBoundingClientRect();
      });
      return { lines: Math.round(h.getBoundingClientRect().height / lh), overflow: Math.max(...spans.map((r) => r.right)) - col.right, fontPx: parseFloat(getComputedStyle(h).fontSize) };
    });
    expect(m.lines, `lines at ${width}`).toBe(2);
    expect(m.overflow, `overflow at ${width}`).toBeLessThanOrEqual(0);
    expect(m.fontPx, `font at ${width}`).toBeGreaterThanOrEqual(36);
  }
});

test("hero hook and official stats with source and compliance copy", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("보험료는 꼬박꼬박 내는데,보험금은 모두 확인하셨나요?");
  // 로열블루 강조는 '보험금' 한 단어만
  await expect(page.locator("#hero-title .text-blue")).toHaveText("보험금");
  await expect(page.getByTestId("hero-sub")).toHaveText("예전에 다녀온 병원부터 오래전에 가입한 보험까지.");
  await expect(page.getByTestId("hero-subtitle")).toHaveText("내 보험에서 무엇을 확인해야 할지 무료로 안내받아 보세요.");
  await expect(page.locator("#hero-cta").getByRole("button", { name: "나도 무료 점검 시작하기" })).toBeVisible();
  await expect(page.getByTestId("hero-cta-note")).toHaveText("무료 상담 신청 · 보험금 지급 여부는 계약 및 심사 결과에 따라 달라집니다.");
  // 공식 통계: 숫자 3개(남은 숨은보험금 + 2025년 지급 건수·지급액)
  const stats = page.locator("#stats");
  await expect(stats.getByRole("heading", { level: 2 })).toHaveText("아직 찾아가지 않은 숨은보험금");
  await expect(stats).toContainText("2025년 말 기준");
  await expect(stats).toContainText("약 10조 3,000억원");
  await expect(page.getByTestId("stat-refund-count")).toBeVisible();
  await expect(page.getByTestId("stat-refund-amount")).toBeVisible();
  await expect(stats).toContainText("약 80만 건");
  await expect(stats).toContainText("약 3조 2,470억원");
  await expect(stats.getByText("사람 수 아닌 건수")).toBeVisible();
  await expect(page.getByTestId("proof-notes")).toContainText("이 서비스 실적 아님");
  await expect(page.getByTestId("proof-notes")).toContainText("미청구 병원비·수술비와는 별개 통계");
  await expect(stats.locator('a[href="https://www.fsc.go.kr/po010103/87270"]')).toBeVisible();
  await expect(stats.getByText("2026년 7월 7일 발표", { exact: false })).toBeVisible();
  await expect(stats.getByText("개인별 환급을 뜻하지 않아요", { exact: false })).toBeVisible();
  await stats.getByRole("button", { name: "통계 자세히 보기" }).click();
  await expect(stats.getByText("개인별 환급 가능 여부나 환급 금액을 의미하거나 보장하지 않습니다", { exact: false })).toBeVisible();
  await expect(stats).toContainText("청구하지 않은 보험금은 이 통계에 포함되지 않습니다");
  await expect(stats).toContainText("실시간으로 변하는 수치가 아닙니다");
  // 통계 아래 후킹 + CTA
  await expect(page.getByTestId("proof-hook")).toHaveText("그렇다면 내 보험은 어떨까요?한번 확인해 볼 이유가 있습니다.");
  await expect(page.locator("#proof-cta").getByRole("button", { name: "내 보험도 확인해 보기" })).toBeVisible();
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

test("CTA copy A/B: ?cta=b swaps the main CTA label and persists in the session; default is A", async ({ page }) => {
  await page.goto("/?cta=b");
  const hero = page.locator("#hero-cta").getByRole("button");
  await expect(hero).toHaveText("혹시 놓친 보험금 확인하기");
  await expect(hero).toHaveAttribute("data-cta-variant", "b");
  await expect(page.locator("#final-cta").getByRole("button")).toHaveText("혹시 놓친 보험금 확인하기");
  await page.goto("/");
  await expect(hero).toHaveText("혹시 놓친 보험금 확인하기");
  await page.goto("/?cta=zzz");
  await expect(hero).toHaveText("혹시 놓친 보험금 확인하기");
  await page.evaluate(() => sessionStorage.clear());
  await page.goto("/");
  await expect(hero).toHaveText("나도 무료 점검 시작하기");
  await expect(page.locator("#final-cta").getByRole("button")).toHaveText("나도 무료 점검 시작하기");
});

test("no external lookup CTA in the main flow; official link kept in FAQ and footer", async ({ page }) => {
  await page.goto("/");
  const ext = 'a[href*="cont.insure.or.kr"]';
  for (const sel of ["header", "#hero-cta", "#services", "#stats", "#proof", "#claim-cases", "#reviews", "#process", "#apply", "#final-cta"]) {
    await expect(page.locator(`${sel} ${ext}`), `external CTA in ${sel}`).toHaveCount(0);
  }
  await expect(page.locator(`footer ${ext}`)).toBeVisible();
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

test("page order: hero → story cards → stats → process → apply; no fabricated chats", async ({ page }) => {
  await page.goto("/");
  const ids = ["hero-cta", "services", "stats", "claim-cases", "process", "apply", "faq", "final-cta"];
  const order = await page.evaluate((list) => list.map((id) => document.getElementById(id)!.getBoundingClientRect().top + window.scrollY), ids);
  expect([...order].sort((x, y) => x - y)).toEqual(order);
  // 중복 섹션 제거: 별도 공감 장면·행동 장면·신뢰 4칸 섹션·점검 유형 섹션 없음
  for (const id of ["empathy", "action", "trust", "cases"]) await expect(page.locator(`#${id}`)).toHaveCount(0);

  // 스토리 카드 3개: 그림 + 질문 + 한 문장. 성공담·금액·사진 없음
  const stories = page.locator("#services");
  await expect(stories.getByRole("heading", { level: 2 })).toHaveText("혹시 이런 경험 있으신가요?");
  for (const [t, body] of [
    ["예전에 병원 다녀오신 적 있으시죠?", "실손보험만 청구하고 다른 보장은 확인하지 않았을 수도 있어요."],
    ["오래전에 가입한 보험, 기억나시나요?", "만기 여부나 지급받지 않은 보험금이 있는지 확인해 볼 수 있습니다."],
    ["보험은 여러 개, 보장은 잘 모르겠다면?", "가입한 보험에서 어떤 항목을 확인해야 하는지 안내받아 보세요."],
  ]) {
    await expect(stories.getByRole("button").filter({ hasText: t }).filter({ hasText: body })).toHaveCount(1);
  }
  await expect(stories.locator("button svg[viewBox='0 0 240 150']")).toHaveCount(3);
  await expect(page.getByTestId("stories-footnote")).toContainText("보험금 지급을 뜻하지는 않으며");
  await expect(stories.locator("img")).toHaveCount(0);
  expect(await stories.innerText()).not.toMatch(/\d[\d,]*\s*(만\s*)?원/);

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

test("every CTA goes to the same form; a picked type is kept and never asked twice", async ({ page }) => {
  await page.goto("/");
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  const step = page.locator("#apply-step-title");
  // 메인 CTA → 신청 폼 1단계(점검 유형)
  await page.locator("#hero-cta").getByRole("button", { name: "나도 무료 점검 시작하기" }).click();
  await expect(step).toBeInViewport();
  await expect(step).toBeFocused();
  await expect(step).toHaveText("점검 유형을 선택해 주세요");
  // 스토리 카드 → 그 유형으로 연락처 단계(유형 단계 반복 없음)
  await page.getByTestId("story-hospital").click();
  await expect(page.locator("#apply-name")).toBeFocused();
  await expect(step).toHaveText("연락받으실 분을 알려주세요");
  await expect(page.getByTestId("apply-picked-type")).toContainText("병원비·수술비");
  // 통계 CTA도 고른 유형을 유지한 채 연락처 단계로
  await page.locator("#proof-cta").getByRole("button", { name: "내 보험도 확인해 보기" }).click();
  await expect(page.locator("#apply-name")).toBeFocused();
  await expect(page.getByTestId("apply-picked-type")).toContainText("병원비·수술비");
  // 다른 유형을 원할 때만 '변경'
  await page.getByRole("button", { name: "점검 유형 변경" }).click();
  await expect(page.locator("#apply-type-unclaimed")).toBeChecked();
  await page.locator("#apply-type-refund").check({ force: true });
  await expect(page.getByTestId("apply-type-desc")).toContainText("해지하면 보장이 사라집니다");
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await expect(page.getByTestId("apply-picked-type")).toContainText("과오납·해지환급금");
  // 하단 CTA도 같은 폼, 같은 유형
  await page.locator("#final-cta").getByRole("button").click();
  await expect(page.getByTestId("apply-picked-type")).toContainText("과오납·해지환급금");
  // 유형이 애매한 카드·'나에게 해당되는 항목 확인하기'는 유형 단계에서 고르게 한다
  await page.getByTestId("story-many").click();
  await expect(step).toHaveText("점검 유형을 선택해 주세요");
  await page.locator("#cases-cta").getByRole("button", { name: "나에게 해당되는 항목 확인하기" }).click();
  await expect(step).toHaveText("점검 유형을 선택해 주세요");
  expect(await page.locator("form").count()).toBe(1);
  expect(page.url()).not.toContain("cont.insure.or.kr");
});

test("claim cases: 5 situational examples (not real cases), 3 first, process strip, compliance notes, CTAs into the form", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.addStyleTag({ content: "html{scroll-behavior:auto!important}" });
  const sec = page.locator("#claim-cases");
  await expect(sec.getByRole("heading", { level: 2 })).toHaveText("이런 보험금도 확인해 보셨나요?");
  await expect(sec).toContainText("놓치기 쉬운 상황과 확인 과정을 살펴보세요.");
  const cards = sec.getByTestId("claim-case");
  await expect(cards).toHaveCount(5);
  // 공감도 높은 병원비 → 수술비 특약 → 만기보험금이 먼저 (빈도 순위 표기 없음)
  const quotes = await cards.locator("h3").allInnerTexts();
  expect(quotes.map((q) => q.replace(/[“”"]/g, ""))).toEqual([
    "금액이 작아서 병원비 청구를 그냥 넘겼어요",
    "수술 후 실손보험만 청구했어요",
    "만기가 지난 보험이 있었던 것 같아요",
    "진단을 받았는데 진단비는 생각 못 했어요",
    "중간에 받을 돈이 있는 줄 몰랐어요",
  ]);
  for (const k of ["실손의료비(통원·약제비)", "수술비 특약(수술보험금)", "만기보험금", "진단비 특약(진단보험금)", "중도·휴면보험금"]) await expect(sec.getByText(k, { exact: true })).toHaveCount(1);
  await expect(cards.filter({ hasText: "상황별 모범 절차 예시" })).toHaveCount(5);
  await expect(cards.filter({ hasText: "확인할 것" })).toHaveCount(5);
  for (const st of ["확인", "청구·신청", "보험사 심사·지급"]) await expect(sec.getByText(st, { exact: true })).toHaveCount(5);
  // 지급 금액·순위·후기·보장 표현 없음
  const text = await sec.innerText();
  expect(text).not.toMatch(/\d[\d,]*\s*(만\s*)?원/);
  for (const f of ["1위", "순위", "가장 많이", "받았어요", "찾았어요", "보장합니다", "지급됩니다"]) expect(text).not.toContain(f);
  const notes = page.getByTestId("claim-cases-notes");
  await expect(notes).toContainText("실제 고객 사례가 아닌 상황별 예시");
  await expect(notes).toContainText("약관과 보험사 심사");
  await expect(notes).toContainText("소멸시효");
  await expect(notes).toContainText("만기·중도·휴면보험금에 관한 것으로, 청구하지 않은 병원비·수술비·진단비와는 별개");
  // 첫 화면: 데스크톱 3장 / 모바일 1장(다음 카드가 살짝 보임). 나머지는 넘겨서 확인
  const track = page.locator("#claim-cases-track");
  await track.scrollIntoViewIfNeeded();
  const fully = () =>
    track.evaluate((t) => {
      const r0 = t.getBoundingClientRect();
      return Array.from(t.children)
        .map((c, i) => {
          const r = c.getBoundingClientRect();
          return r.left >= r0.left - 1 && r.right <= r0.right + 1 ? i : -1;
        })
        .filter((i) => i >= 0);
    });
  await expect.poll(fully).toEqual(isMobile ? [0] : [0, 1, 2]);
  const next = sec.getByRole("button", { name: "사례 카드 오른쪽으로 넘기기" });
  for (let i = 0; i < (isMobile ? 4 : 2); i++) {
    await next.click();
    await page.waitForTimeout(700);
  }
  await expect.poll(fully).toEqual(isMobile ? [4] : [2, 3, 4]);
  await expect(next).toBeDisabled();
  // 카드 CTA → 해당 점검 유형으로 신청 폼 연락처 단계
  await page.getByTestId("claim-case-cta-dormant").click();
  await expect(page.locator("#apply-name")).toBeFocused();
  await expect(page.getByTestId("apply-picked-type")).toContainText("숨은·만기보험금");
  // 하단 CTA → 같은 폼(고른 유형 유지)
  await page.locator("#claim-cases-cta").getByRole("button", { name: "혹시 나도 해당될까요? 무료 점검 시작하기" }).click();
  await expect(page.locator("#apply")).toBeInViewport();
  await expect(page.getByTestId("apply-picked-type")).toContainText("숨은·만기보험금");
});

test("trust right before the form: what you get, no-guarantee note, operator info; FAQ 4 + more", async ({ page }) => {
  await page.goto("/");
  const help = page.getByTestId("apply-help");
  await expect(help).toContainText("어떤 도움을 받을 수 있나요?");
  for (const t of ["가입한 보험에서 확인할 항목 안내", "보험금 청구 및 공식 조회 방법 안내", "고객이 동의한 범위 내에서만 상담 진행"]) {
    await expect(help.getByRole("listitem").filter({ hasText: t })).toHaveCount(1);
  }
  const trust = page.getByTestId("apply-trust");
  await expect(trust).toContainText("보험금 지급은 보장하지 않으며, 실제 지급 여부는 보험계약과 보험사 심사 결과에 따라 달라집니다.");
  await expect(trust).toContainText("공식 숨은보험금 조회 서비스는 별도로 무료 이용할 수 있습니다.");
  // 운영 주체 정보: 설정되지 않은 값은 지어내지 않고 '[설정 필요]'로 표시
  const op = page.getByTestId("apply-operator");
  for (const l of ["운영 주체", "소속 보험대리점", "담당 설계사", "연락처"]) await expect(op.getByText(l, { exact: true })).toBeVisible();
  await expect(op).toContainText("[설정 필요: 운영 주체]");
  await expect(page.locator("#apply").getByRole("heading", { level: 2 })).toHaveText("이제 내 보험도 확인해 볼까요?");
  await expect(page.locator("#apply")).toContainText("확인하고 싶은 항목을 선택하고 무료 상담을 신청하세요.");

  const faq = page.locator("#faq");
  for (const q of ["점검 안내는 정말 무료인가요?", "상담을 받으면 보험금을 받을 수 있나요?", "보험사 정보를 직접 조회하나요?", "개인정보는 어떻게 처리하나요?"]) {
    await expect(faq.getByRole("button", { name: q })).toHaveAttribute("aria-expanded", "false");
  }
  await faq.getByRole("button", { name: /질문 \d+개 더 보기/ }).click();
  for (const q of ["어떤 서비스를 제공하나요?", "신청하면 전화가 오나요?", "동의를 철회하거나 정보 삭제를 요청하려면요?"]) {
    await expect(faq.getByRole("button", { name: q })).toHaveCount(1);
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
  // 다른 CTA가 하나도 보이지 않는 스크롤 위치로 이동(그곳에서만 고정 CTA가 나타난다)
  await page.evaluate(() => {
    const ids = ["hero-cta", "cases-cta", "proof-cta", "claim-cases-cta", "reviews-cta", "apply", "final-cta"];
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
  await expect(sticky).toHaveAttribute("data-hidden", "false");
  await expect(sticky.getByRole("button")).toHaveText("나도 무료 점검 시작하기");
  await page.locator("#apply-step-title").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-hidden", "true");
  await page.locator("#final-cta").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("data-hidden", "true");
  // 입력창에 포커스가 있으면(키보드가 열린 상태) 숨긴다
  // 다른 CTA가 하나도 보이지 않는 스크롤 위치로 이동(그곳에서만 고정 CTA가 나타난다)
  await page.evaluate(() => {
    const ids = ["hero-cta", "cases-cta", "proof-cta", "reviews-cta", "apply", "final-cta"];
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
