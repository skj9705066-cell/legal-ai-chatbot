"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Info } from "lucide-react";
import type { ServiceType } from "@/lib/types";
import { CLAIM_CASES } from "@/lib/content";
import { cn } from "@/lib/utils";
import { CaseArt, type CaseArtKind } from "@/components/illustrations/Art";
import { Reveal } from "@/components/motion/Reveal";
import { useApply } from "./ApplyContext";
import { ApplyCta } from "./ApplyCta";
import { Carousel } from "./Carousel";

type Item = (typeof CLAIM_CASES.items)[number];

function CaseCard({ c }: { c: Item }) {
  const { startApply } = useApply();
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-navy-100" data-testid="claim-case">
      <div className="relative">
        <CaseArt kind={c.art as CaseArtKind} idPrefix="claim" className="block aspect-[240/150] w-full" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-semibold text-navy-600 ring-1 ring-navy-100 backdrop-blur">
          {CLAIM_CASES.badge}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[17px] font-bold leading-[1.4] tracking-[-0.025em] text-navy [word-break:keep-all] sm:text-[18px]">&ldquo;{c.quote}&rdquo;</h3>
        <p className="mt-2.5">
          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[13px] font-semibold text-blue-700">{c.kind}</span>
        </p>
        {/* 확인 과정 3단계 */}
        <ol className="mt-3.5 space-y-1.5" aria-label="확인 과정">
          {c.steps.map((st, i) => (
            <li key={st} className="flex items-center gap-2 text-[14px] leading-snug text-navy-700">
              <span aria-hidden="true" className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold", i === 2 ? "bg-blue text-white" : "bg-navy-100 text-navy-700")}>
                {i + 1}
              </span>
              {st}
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => startApply("claim_case", c.type as ServiceType)}
          className="group mt-auto flex min-h-[48px] items-center gap-1 pt-4 text-[15px] font-bold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          data-testid={`claim-case-cta-${c.id}`}
        >
          {CLAIM_CASES.cardCta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

/**
 * "실손보험만 받고 끝인 줄 아셨나요?" — 놓치기 쉬운 보험금 상황별 확인 절차 예시(실제 지급 후기·고객 사례 아님).
 * 공감도 높은 3개를 먼저, 진단비·중도/휴면은 '다른 사례 보기'로 펼친다.
 * 모바일: 그림 중심 가로 캐러셀(다음 카드가 살짝 보임). 데스크톱: 3열 격자.
 * 카드 CTA는 해당 점검 유형이 선택된 상태로 신청 폼 연락처 단계로 간다.
 */
export function ClaimCases() {
  const [more, setMore] = useState(false);
  const firstExtra = useRef(false);
  const items = more ? CLAIM_CASES.items : CLAIM_CASES.items.slice(0, CLAIM_CASES.primaryCount);

  // 펼치면 모바일 캐러셀을 새로 나타난 첫 카드로 옮긴다(데스크톱 격자에서는 이동 없음)
  useEffect(() => {
    if (!more || !firstExtra.current) return;
    firstExtra.current = false;
    const t = document.getElementById("claim-cases-track");
    const card = t?.children[CLAIM_CASES.primaryCount] as HTMLElement | undefined;
    if (t && card && t.scrollWidth > t.clientWidth) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      t.scrollTo({ left: card.offsetLeft - t.offsetLeft - 4, behavior: reduce ? "auto" : "smooth" });
    }
  }, [more]);

  return (
    <section id="claim-cases" aria-labelledby="claim-cases-title" className="bg-navy-50 py-12 sm:py-20 lg:py-24">
      <div className="container">
        <Reveal>
          <h2 id="claim-cases-title" className="text-balance text-[26px] font-extrabold leading-[1.3] tracking-[-0.03em] text-navy sm:text-[32px] lg:text-[38px]">
            {CLAIM_CASES.title}
          </h2>
          <p className="mt-2 text-pretty text-[16px] leading-[1.6] text-navy-600 sm:text-[17px]">{CLAIM_CASES.subtitle}</p>
        </Reveal>
        <div className="mt-6 lg:mt-9">
          <Carousel
            id="claim-cases-track"
            label="놓치기 쉬운 보험금 상황별 확인 절차 예시 (좌우로 넘겨 보세요)"
            itemLabel="사례 카드"
            desktopGrid
            slideClassName={() => "w-[86%] sm:w-[calc((100%-16px)/2)]"}
            slides={items.map((c) => ({ key: c.id, label: c.kind, node: <CaseCard c={c} /> }))}
          />
        </div>
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            aria-expanded={more}
            aria-controls="claim-cases-track"
            onClick={() => {
              firstExtra.current = !more;
              setMore((m) => !m);
            }}
            className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl px-4 text-[15.5px] font-semibold text-navy-700 ring-1 ring-inset ring-navy-200 transition-colors hover:bg-white"
          >
            {more ? CLAIM_CASES.lessLabel : `${CLAIM_CASES.moreLabel} (${CLAIM_CASES.items.length - CLAIM_CASES.primaryCount})`}
            <ChevronDown className={cn("h-4 w-4 transition-transform", more && "rotate-180")} aria-hidden="true" />
          </button>
        </div>
        <ul className="mt-5 space-y-1.5" data-testid="claim-cases-notes">
          {CLAIM_CASES.notes.map((n) => (
            <li key={n} className="flex gap-1.5 text-[13px] leading-relaxed text-navy-600">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {n}
            </li>
          ))}
        </ul>
        <div id="claim-cases-cta" className="mt-7 text-center">
          <ApplyCta source="cases" size="xl" arrow={false} className="h-auto min-h-[64px] w-full flex-col gap-0.5 whitespace-normal py-3 sm:w-auto sm:min-w-[360px]">
            <span className="text-[14px] font-medium text-white">{CLAIM_CASES.ctaLead}</span>
            <span className="flex items-center gap-1.5 text-[18px] font-bold">
              {CLAIM_CASES.cta}
              <ArrowRight className="h-[1.1em] w-[1.1em]" aria-hidden="true" />
            </span>
          </ApplyCta>
        </div>
      </div>
    </section>
  );
}
