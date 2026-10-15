"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Info, SendHorizontal } from "lucide-react";
import { REVIEW_CATEGORY_LABEL, type OperatingMetrics, type PublicReview } from "@/lib/types";
import { CHAT_GALLERY as G } from "@/lib/content";
import { buildGallery } from "@/lib/chat-gallery";
import { toBubbles } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";
import { LogoMark } from "@/components/site/Logo";
import { ApplyCta } from "./ApplyCta";
import { Carousel } from "./Carousel";

type Scenario = (typeof G.scenarios)[number];

/** 카드마다 대화창 톤·세로 위치를 조금씩 달리해 반복감을 줄인다 */
const THEMES = [
  { chat: "bg-[linear-gradient(180deg,#EEF3FA_0%,#E2EAF5_100%)]", offset: "" },
  { chat: "bg-[linear-gradient(180deg,#F2F5FB_0%,#E7EDF6_100%)]", offset: "lg:mt-9" },
  { chat: "bg-[linear-gradient(180deg,#ECF2F9_0%,#DEE7F3_100%)]", offset: "lg:mt-3" },
];

/** 카드가 화면(가로 스크롤 포함)에 들어오면 말풍선이 차례로 나타난다. JS·움직임 줄이기 환경에서는 처음부터 보인다 */
function useEntrance() {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"static" | "pending" | "in">("static");
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setState("pending");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("in");
          io.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, state };
}

function CustomerBubble({ text, i }: { text: string; i: number }) {
  return (
    <li className="chat-msg flex justify-end" style={{ ["--d" as string]: `${i * 260}ms` }}>
      <p className="max-w-[82%] break-keep rounded-[18px] rounded-br-[6px] bg-blue px-3.5 py-2.5 text-[15.5px] leading-[1.6] text-white shadow-[0_2px_6px_-2px_rgba(8,102,245,0.45)]">
        <span className="sr-only">고객: </span>
        {text}
      </p>
    </li>
  );
}

function CounselorBubble({ text, i }: { text: string; i: number }) {
  return (
    <li className="chat-msg flex items-start gap-2" style={{ ["--d" as string]: `${i * 260}ms` }}>
      <LogoMark className="mt-0.5 h-8 w-8 shrink-0 rounded-[11px]" />
      <div className="min-w-0 max-w-[80%]">
        <p className="mb-1 text-[12.5px] font-semibold text-navy-600">{G.counselorName}</p>
        <p className="break-keep rounded-[18px] rounded-tl-[6px] bg-white px-3.5 py-2.5 text-[15.5px] leading-[1.6] text-ink ring-1 ring-navy-100">
          <span className="sr-only">상담: </span>
          {text}
        </p>
      </div>
    </li>
  );
}

function ChatFrame({
  topic,
  sub,
  chip,
  pill,
  theme,
  children,
  footer,
  testId,
}: {
  topic: string;
  sub?: string;
  chip: React.ReactNode;
  pill: string;
  theme: (typeof THEMES)[number];
  children: React.ReactNode;
  footer: string;
  testId: string;
}) {
  const { ref, state } = useEntrance();
  return (
    <article
      ref={ref}
      data-anim={state}
      data-testid={testId}
      aria-label={topic}
      className="chat-card flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-card ring-1 ring-navy-100 transition-shadow duration-300 hover:shadow-lift lg:h-auto"
    >
      {/* 자체 메신저 상단 바 */}
      <div className="flex items-center justify-between gap-3 border-b border-navy-100 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[15.5px] font-bold text-navy">{topic}</p>
          {sub && <p className="truncate text-[13px] text-navy-500">{sub}</p>}
        </div>
        {chip}
      </div>
      <div className={cn("flex flex-1 flex-col px-3.5 pb-4 pt-4", theme.chat)}>
        <p className="mx-auto rounded-full bg-white/75 px-3 py-1 text-[12.5px] font-semibold text-navy-600">{pill}</p>
        <ul className="mt-4 space-y-3">{children}</ul>
        {/* 입력창 모양(동작하지 않는 장식) */}
        <div aria-hidden="true" className="mt-auto flex items-center gap-2 pt-5">
          <span className="flex h-10 flex-1 items-center rounded-full bg-white/85 px-4 text-[13px] text-navy-400 ring-1 ring-navy-100">{footer}</span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-200 text-white">
            <SendHorizontal className="h-[18px] w-[18px]" />
          </span>
        </div>
      </div>
    </article>
  );
}

function ExampleCard({ s, index }: { s: Scenario; index: number }) {
  return (
    <ChatFrame
      topic={s.topic}
      sub={REVIEW_CATEGORY_LABEL[s.category]}
      chip={<span className="shrink-0 rounded-full bg-navy-100 px-2.5 py-1 text-[12.5px] font-bold text-navy-600">{G.exampleChip}</span>}
      pill="가상 상황 재구성"
      theme={THEMES[index % THEMES.length]}
      footer="예시 화면입니다"
      testId="chat-example"
    >
      {s.messages.map((m, i) => (m.from === "customer" ? <CustomerBubble key={i} text={m.text} i={i} /> : <CounselorBubble key={i} text={m.text} i={i} />))}
    </ChatFrame>
  );
}

function RealCard({ r, index }: { r: PublicReview; index: number }) {
  const bubbles = toBubbles(r.content);
  return (
    <ChatFrame
      topic={REVIEW_CATEGORY_LABEL[r.category]}
      sub={`${r.displayName} · ${r.monthLabel}`}
      chip={
        r.isDemo ? (
          <span className="shrink-0 rounded-full bg-caution-50 px-2.5 py-1 text-[12.5px] font-bold text-caution">데모 데이터 · 실제 후기 아님</span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-mint-50 px-2.5 py-1 text-[12.5px] font-bold text-mint-700">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            {G.realChip}
          </span>
        )
      }
      pill={r.imageUrl ? "고객 동의 캡처 · 개인정보 가림" : "고객 메시지 원문"}
      theme={THEMES[index % THEMES.length]}
      footer="고객 동의를 받아 게시한 후기"
      testId="real-review"
    >
      {r.imageUrl && (
        <li className="chat-msg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.imageUrl} alt={`${r.displayName}의 후기 캡처 (개인정보 가림)`} loading="lazy" className="max-h-[420px] w-full rounded-[16px] bg-white object-contain" />
        </li>
      )}
      {bubbles.map((b, i) => (
        <CustomerBubble key={i} text={b} i={i} />
      ))}
      {r.verifiedAmount != null && (
        <li className="chat-msg">
          <p className="rounded-xl bg-white px-3.5 py-2.5 text-[14px] font-semibold text-blue-700 ring-1 ring-blue-100">
            확인된 지급액 {r.verifiedAmount.toLocaleString("ko-KR")}원
            <span className="block text-[13px] font-medium text-navy-600">개별 사례이며 금액은 사람마다 다릅니다.</span>
          </p>
        </li>
      )}
    </ChatFrame>
  );
}

/**
 * 보험금 점검 대화 갤러리. 기본은 '가상 상황을 재구성한 대화 예시' 5개이고,
 * 고객 동의 + 공개 승인된 실제 후기가 생기면 같은 유형의 예시 카드 자리를 대신한다.
 */
export function ChatGallery({ reviews, metrics }: { reviews: PublicReview[]; metrics: Partial<OperatingMetrics> | null }) {
  const slots = buildGallery(G.scenarios, reviews);
  const exampleCount = slots.filter((s) => s.kind === "example").length;
  const realCount = slots.length - exampleCount;
  const metricKeys = metrics ? (Object.keys(G.metricLabel) as (keyof OperatingMetrics)[]).filter((k) => metrics[k]) : [];

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="bg-navy-50 py-20 sm:py-24 lg:py-32">
      <div className="container">
        <Reveal>
          <p className="text-[15px] font-bold text-blue-700">{G.eyebrow}</p>
          <h2 id="reviews-title" className="mt-2.5 text-balance text-[28px] font-extrabold leading-[1.32] tracking-[-0.03em] text-navy sm:text-[34px] lg:text-[40px]">
            {G.title}
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-[17px] leading-[1.7] text-navy-600 lg:text-[18px]" data-testid="reviews-subtitle">
            {exampleCount ? G.subtitle : G.allRealSubtitle}
          </p>
        </Reveal>

        {metricKeys.length > 0 && (
          <div className="mt-8 rounded-[24px] bg-white p-6 ring-1 ring-navy-100 sm:p-8" data-testid="operating-metrics">
            <h3 className="text-[17px] font-bold text-navy">{G.metricsTitle}</h3>
            <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {metricKeys.map((k) => (
                <div key={k}>
                  <dt className="text-[14px] font-medium text-navy-600">{G.metricLabel[k]}</dt>
                  <dd className="num-display mt-1 text-[28px] font-extrabold text-navy">{metrics![k]!.toLocaleString("ko-KR")}건</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[14px] text-navy-600">{G.metricsNote}</p>
          </div>
        )}

        {/* 갤러리 상단 표시: 예시 카드가 하나라도 있으면 항상 */}
        {exampleCount > 0 && (
          <p className="mt-9 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[14.5px] ring-1 ring-navy-100" data-testid="example-label">
            <Info className="h-[18px] w-[18px] shrink-0 text-blue" aria-hidden="true" />
            <strong className="font-bold text-navy">{G.exampleLabel}</strong>
            <span aria-hidden="true" className="hidden text-navy-300 sm:inline">·</span>
            <span className="text-navy-600">{realCount ? G.mixedLabelNote : G.exampleLabelNote}</span>
          </p>
        )}

        <div className={exampleCount > 0 ? "mt-5" : "mt-10"}>
          <Carousel
            id="chat-track"
            label="보험금 점검 대화 카드 (좌우로 넘겨 보세요)"
            autoplayMs={5000}
            slideClassName={(i) => THEMES[i % THEMES.length].offset}
            slides={slots.map((slot, i) =>
              slot.kind === "example"
                ? { key: `ex-${slot.scenario.id}`, label: `${slot.scenario.topic} (재구성 예시)`, node: <ExampleCard s={slot.scenario} index={i} /> }
                : { key: `rv-${slot.review.id}`, label: `${REVIEW_CATEGORY_LABEL[slot.review.category]} (실제 후기)`, node: <RealCard r={slot.review} index={i} /> },
            )}
          />
        </div>

        {realCount > 0 && (
          <p className="mt-5 flex gap-2 text-[15px] leading-relaxed text-navy-600">
            <Info className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            {G.realNote}
          </p>
        )}

        <div id="gallery-cta" className="mt-14 text-center lg:mt-16">
          <p className="text-balance text-[22px] font-extrabold leading-[1.4] tracking-[-0.03em] text-navy sm:text-[26px] lg:text-[30px]">{G.ctaTitle}</p>
          <div className="mt-6">
            <ApplyCta source="stats" target="types" size="xl" className="h-[62px] w-full text-[18px] sm:w-auto sm:min-w-[320px]">
              {G.ctaButton}
            </ApplyCta>
          </div>
        </div>
      </div>
    </section>
  );
}
