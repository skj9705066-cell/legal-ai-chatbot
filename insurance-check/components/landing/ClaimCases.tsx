"use client";

import { ArrowRight, ChevronRight, Info } from "lucide-react";
import type { ServiceType } from "@/lib/types";
import { CLAIM_CASES, SERVICE_CONTENT } from "@/lib/content";
import { CaseArt, type CaseArtKind } from "@/components/illustrations/Art";
import { Reveal } from "@/components/motion/Reveal";
import { useApply } from "./ApplyContext";
import { ApplyCta } from "./ApplyCta";
import { Carousel } from "./Carousel";

type Item = (typeof CLAIM_CASES.items)[number];

function CaseCard({ c }: { c: Item }) {
  const { startApply } = useApply();
  const type = c.type as ServiceType;
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
        <p className="mt-2 text-[14.5px] leading-[1.5] text-navy-600 [word-break:keep-all]">
          <span className="font-semibold text-ink">확인할 것 </span>
          {c.check}
        </p>
        {/* 확인 → 청구·신청 → 보험사 심사·지급 */}
        <ol className="mt-4 flex items-center gap-1 text-[12.5px] font-semibold text-navy-600" aria-label="진행 과정">
          {CLAIM_CASES.steps.map((st, i) => (
            <li key={st} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-navy-300" aria-hidden="true" />}
              <span className="whitespace-nowrap rounded-lg bg-navy-50 px-2 py-1">{st}</span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => startApply("cases", type)}
          className="group mt-auto flex min-h-[48px] items-center gap-1 pt-4 text-[15px] font-bold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue"
          data-testid={`claim-case-cta-${c.id}`}
        >
          {SERVICE_CONTENT[type].pickTitle} 점검하기
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

/**
 * 놓치기 쉬운 보험금 대표 사례 — 상황별 모범 절차 예시 5장(실제 고객 사례·지급 금액 없음).
 * 모바일: 그림 중심 가로 캐러셀(다음 카드가 살짝 보임), 데스크톱: 3장이 보이고 나머지 2장은 넘겨서 확인.
 * 카드 CTA는 해당 점검 유형으로 신청 폼 연락처 단계로, 하단 CTA는 고른 유형을 유지해 신청 폼으로 이동한다.
 */
export function ClaimCases() {
  return (
    <section id="claim-cases" aria-labelledby="claim-cases-title" className="bg-navy-50 py-12 sm:py-20 lg:py-24">
      <div className="container">
        <Reveal>
          <h2 id="claim-cases-title" className="text-balance text-[26px] font-extrabold leading-[1.3] tracking-[-0.03em] text-navy sm:text-[32px] lg:text-[38px]">
            {CLAIM_CASES.title}
          </h2>
          <p className="mt-2 text-[16px] leading-[1.6] text-navy-600 sm:text-[17px]">{CLAIM_CASES.subtitle}</p>
        </Reveal>
        <div className="mt-6 lg:mt-9">
          <Carousel
            id="claim-cases-track"
            label="놓치기 쉬운 보험금 상황별 예시 (좌우로 넘겨 보세요)"
            itemLabel="사례 카드"
            slideClassName={() => "w-[86%] sm:w-[calc((100%-16px)/2)] lg:w-[calc((100%-40px)/3)]"}
            slides={CLAIM_CASES.items.map((c) => ({ key: c.id, label: c.kind, node: <CaseCard c={c} /> }))}
          />
        </div>
        <ul className="mt-4 space-y-1.5" data-testid="claim-cases-notes">
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
