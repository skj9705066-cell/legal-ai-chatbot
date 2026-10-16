"use client";

import { ArrowRight, Info } from "lucide-react";
import type { ServiceType } from "@/lib/types";
import { STORIES } from "@/lib/content";
import { CaseArt } from "@/components/illustrations/Art";
import { Reveal } from "@/components/motion/Reveal";
import { useApply } from "./ApplyContext";
import { ApplyCta } from "./ApplyCta";

/**
 * 스토리 카드 — "예전에 병원 다녀오신 적 있으시죠?" 등 기억을 떠올리게 하는 질문 3개.
 * 카드 전체가 버튼: 해당 점검 유형으로 신청 폼 연락처 단계에 바로 들어간다(유형 단계 반복 없음, '변경'으로만 수정).
 * 유형이 애매한 카드는 폼의 유형 단계로 보낸다. 모바일은 그림 + 제목 + 한 문장의 가로형 카드 3장.
 */
export function StoryCards() {
  const { startApply } = useApply();
  return (
    <section id="services" aria-labelledby="services-title" className="bg-white py-12 sm:py-20 lg:py-24">
      <div className="container">
        <Reveal>
          <h2 id="services-title" tabIndex={-1} className="text-balance text-[26px] font-extrabold leading-[1.3] tracking-[-0.03em] text-navy focus:outline-none sm:text-[32px] lg:text-[38px]">
            {STORIES.title}
          </h2>
        </Reveal>
        <ul className="mt-6 grid gap-3 lg:mt-10 lg:grid-cols-3 lg:gap-5">
          {STORIES.items.map((it, i) => (
            <Reveal as="li" key={it.id} delay={i * 80}>
              <button
                type="button"
                data-testid={`story-${it.id}`}
                onClick={() => startApply("cases", it.type as ServiceType | null)}
                className="group flex h-full w-full items-center gap-3.5 overflow-hidden rounded-[22px] bg-navy-50 p-2.5 pr-4 text-left ring-1 ring-navy-100 transition-[box-shadow,transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/25 active:scale-[0.99] lg:flex-col lg:items-stretch lg:gap-0 lg:bg-white lg:p-0"
              >
                <CaseArt kind={it.art} className="block aspect-[240/150] w-[108px] shrink-0 rounded-[16px] lg:w-full lg:rounded-none" />
                <span className="flex min-w-0 flex-1 flex-col lg:p-6">
                  <span className="block text-[16.5px] font-bold leading-[1.38] tracking-[-0.025em] text-navy [word-break:keep-all] lg:text-[20px]">{it.title}</span>
                  <span className="mt-1 block text-[14px] leading-[1.5] text-navy-600 [word-break:keep-all] lg:mt-2 lg:text-[16px]">{it.body}</span>
                  <span className="mt-4 hidden items-center gap-1 text-[15px] font-bold text-blue-700 lg:flex">
                    확인하기
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-blue lg:hidden" aria-hidden="true" />
              </button>
            </Reveal>
          ))}
        </ul>
        <p className="mt-3 flex gap-1.5 text-[13px] leading-relaxed text-navy-600" data-testid="stories-footnote">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {STORIES.footnote}
        </p>
        <div id="cases-cta" className="mt-6 text-center">
          <ApplyCta source="cases" type={null} variant="outline" size="xl" className="h-[56px] w-full text-[17px] sm:w-auto sm:min-w-[340px]">
            {STORIES.cta}
          </ApplyCta>
        </div>
      </div>
    </section>
  );
}
