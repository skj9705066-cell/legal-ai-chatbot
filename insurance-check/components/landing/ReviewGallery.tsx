"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight, Info, MessageSquareHeart } from "lucide-react";
import { REVIEW_CATEGORY_LABEL, type OperatingMetrics, type PublicReview } from "@/lib/types";
import { REVIEW_GALLERY as G } from "@/lib/content";
import { toBubbles } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";
import { ApplyCta } from "./ApplyCta";

/** 카드마다 대화창 톤·여백을 조금씩 달리해 정형화된 반복을 피한다 */
const THEMES = [
  { chat: "bg-[#C9D8E7]", avatar: "bg-[#9DB1C7]", offset: "" },
  { chat: "bg-[#D5E0EC]", avatar: "bg-[#A9B9CB]", offset: "lg:mt-10" },
  { chat: "bg-[#CDD9E4]", avatar: "bg-[#95A9BF]", offset: "lg:mt-4" },
];

function MaskedProfile({ name, tone }: { name: string; tone: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* 프로필 사진 자리: 실제 사진 대신 가림 처리된 실루엣 */}
      <span className={cn("relative flex h-10 w-10 shrink-0 items-end justify-center overflow-hidden rounded-[14px]", tone)} aria-hidden="true">
        <span className="absolute top-[7px] h-[13px] w-[13px] rounded-full bg-white/70" />
        <span className="h-[14px] w-[24px] rounded-t-full bg-white/70" />
      </span>
      <span className="text-[14px] font-semibold text-navy-700">{name}</span>
    </div>
  );
}

function ReviewCard({ r, index }: { r: PublicReview; index: number }) {
  const t = THEMES[index % THEMES.length];
  const bubbles = toBubbles(r.content);
  return (
    <article className="flex h-full flex-col rounded-[26px] bg-white p-4 shadow-card ring-1 ring-navy-100 sm:p-5 lg:h-auto" data-testid="real-review" aria-label={`${REVIEW_CATEGORY_LABEL[r.category]} 후기`}>
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[13px] font-bold text-blue-700">{REVIEW_CATEGORY_LABEL[r.category]}</span>
        <span className="text-[13px] text-navy-500">{r.monthLabel}</span>
      </div>

      {/* 대화 캡처 형태 */}
      <div className={cn("mt-3 flex-1 rounded-[20px] px-3.5 pb-4 pt-3.5 lg:flex-none", t.chat)}>
        <MaskedProfile name={r.displayName} tone={t.avatar} />
        {r.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.imageUrl} alt={`${r.displayName}의 후기 캡처 (개인정보 가림)`} loading="lazy" className="mt-3 max-h-[440px] w-full rounded-[14px] bg-white object-contain shadow-sm" />
        )}
        {bubbles.length > 0 && (
          <ul className="mt-2.5 space-y-1.5 pl-[50px]">
            {bubbles.map((b, i) => (
              <li key={i}>
                <p
                  className={cn(
                    "inline-block max-w-full whitespace-pre-line break-keep bg-white px-3.5 py-2.5 text-[15.5px] leading-[1.6] text-ink shadow-[0_1px_1px_rgba(16,43,78,0.06)]",
                    i === 0 ? "rounded-[18px] rounded-tl-[6px]" : "rounded-[18px]",
                  )}
                >
                  {b}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {r.verifiedAmount != null && (
        <p className="mt-3 rounded-xl bg-blue-50 px-3.5 py-2.5 text-[14px] font-semibold text-blue-700">
          확인된 지급액 {r.verifiedAmount.toLocaleString("ko-KR")}원
          <span className="block text-[13px] font-medium text-navy-600">개별 사례이며 금액은 사람마다 다릅니다.</span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 px-1 text-[13px]">
        {r.isDemo ? (
          <span className="rounded-full bg-caution-50 px-2.5 py-1 font-bold text-caution">데모 데이터 · 실제 후기 아님</span>
        ) : (
          <span className="inline-flex items-center gap-1 font-bold text-mint-700">
            <BadgeCheck className="h-4 w-4" aria-hidden="true" />
            {G.verifiedBadge}
          </span>
        )}
        <span className="text-navy-500">· {r.imageUrl ? G.imageCaption : G.textCaption}</span>
      </div>
    </article>
  );
}

function Carousel({ reviews }: { reviews: PublicReview[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });

  const step = useCallback(() => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return 1;
    const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 0;
    return first.getBoundingClientRect().width + gap;
  }, []);

  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / step()));
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, [step]);

  useEffect(() => {
    sync();
    const el = track.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  const go = (i: number) => track.current?.scrollTo({ left: i * step(), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  const scrollable = !(edges.start && edges.end);

  return (
    <div className="relative">
      <div
        ref={track}
        id="review-track"
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="고객 후기 목록 (좌우로 넘겨 보세요)"
        className="-mx-1 flex snap-x snap-mandatory items-stretch gap-4 lg:items-start overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/20 lg:gap-5 [&::-webkit-scrollbar]:hidden"
        data-testid="review-track"
      >
        {reviews.map((r, i) => (
          <div
            key={r.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${reviews.length}`}
            className={cn("w-full shrink-0 snap-start sm:w-[calc((100%-16px)/2)] lg:w-[calc((100%-40px)/3)]", THEMES[i % THEMES.length].offset)}
            data-testid="review-slide"
          >
            <ReviewCard r={r} index={i} />
          </div>
        ))}
      </div>

      {scrollable && (
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex gap-1.5" aria-hidden="true">
            {reviews.map((r, i) => (
              <span key={r.id} className={cn("h-2 rounded-full transition-all duration-300", i === index ? "w-6 bg-blue" : "w-2 bg-navy-300")} />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-controls="review-track"
              aria-label="이전 후기"
              disabled={edges.start}
              onClick={() => go(Math.max(0, index - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy shadow-card ring-1 ring-navy-100 transition hover:bg-navy-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-controls="review-track"
              aria-label="다음 후기"
              disabled={edges.end}
              onClick={() => go(index + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy shadow-card ring-1 ring-navy-100 transition hover:bg-navy-50 disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {reviews.length}개 중 {Math.min(index + 1, reviews.length)}번째 후기
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-white p-8 text-center shadow-card ring-1 ring-navy-100 sm:p-12" data-testid="reviews-empty">
      {/* 레이아웃 자리표시 — 내용 없는 빈 틀(가짜 후기 아님) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-6 hidden gap-5 opacity-60 lg:flex">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn("h-40 flex-1 rounded-[22px] border-2 border-dashed border-navy-200", i === 1 && "mt-8")} />
        ))}
      </div>
      <div className="relative lg:pt-52">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue" aria-hidden="true">
          <MessageSquareHeart className="h-7 w-7" />
        </span>
        <p className="mt-4 text-[20px] font-bold text-navy">{G.emptyTitle}</p>
        <p className="mx-auto mt-2 max-w-md text-pretty text-[16px] leading-[1.7] text-navy-600">{G.emptyText}</p>
      </div>
    </div>
  );
}

/**
 * 고객 후기 갤러리 (실제 후기만). 데스크톱 3장 가로 캐러셀 / 모바일 1장씩 슬라이더.
 * 후기가 없으면 '실제 후기 준비 중'. 아래에 점검 CTA.
 */
export function ReviewGallery({ reviews, metrics }: { reviews: PublicReview[]; metrics: Partial<OperatingMetrics> | null }) {
  const metricKeys = metrics ? (Object.keys(G.metricLabel) as (keyof OperatingMetrics)[]).filter((k) => metrics[k]) : [];
  const hasReviews = reviews.length > 0;
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="bg-navy-50 py-20 sm:py-24 lg:py-32">
      <div className="container">
        <Reveal>
          <p className="text-[15px] font-bold text-blue-700">{G.eyebrow}</p>
          <h2 id="reviews-title" className="mt-2.5 text-balance text-[28px] font-extrabold leading-[1.32] tracking-[-0.03em] text-navy sm:text-[34px] lg:text-[40px]">
            {G.title}
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-[17px] leading-[1.7] text-navy-600 lg:text-[18px]" data-testid="reviews-subtitle">
            {hasReviews ? G.subtitle : G.emptySubtitle}
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

        <div className="mt-10 lg:mt-12">{hasReviews ? <Carousel reviews={reviews} /> : <EmptyState />}</div>

        {hasReviews && (
          <p className="mt-5 flex gap-2 text-[15px] leading-relaxed text-navy-600">
            <Info className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            {G.note}
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
