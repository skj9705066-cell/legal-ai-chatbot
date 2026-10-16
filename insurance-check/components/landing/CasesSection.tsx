"use client";

import { ArrowRight } from "lucide-react";
import type { ServiceType } from "@/lib/types";
import { CASES } from "@/lib/content";
import { CaseArt } from "@/components/illustrations/Art";
import { Reveal } from "@/components/motion/Reveal";
import { useApply } from "./ApplyContext";

/**
 * 공감 카드 — 일러스트가 먼저 보이고 제목 + 한 문장만. 카드 전체가 버튼이며 해당 유형으로 신청 폼에 바로 들어간다.
 * 모바일은 다음 카드가 살짝 보이는 가로 스와이프(카드가 커서 그림·제목을 읽기 쉬움), 데스크톱은 3열.
 */
export function CasesSection() {
  const { startApply } = useApply();
  return (
    <section id="cases" aria-labelledby="cases-title" className="bg-white py-12 sm:py-20 lg:py-24">
      <div className="container">
        <Reveal>
          <h2 id="cases-title" tabIndex={-1} className="text-[26px] font-extrabold leading-[1.3] tracking-[-0.03em] text-navy focus:outline-none sm:text-[32px] lg:text-[38px]">
            {CASES.title}
          </h2>
        </Reveal>

        <ul className="no-scrollbar -mx-5 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 lg:mx-0 lg:mt-10 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0">
          {CASES.items.map((c, i) => (
            <Reveal as="li" key={c.id} delay={i * 80} className="w-[80%] max-w-[320px] shrink-0 snap-start lg:w-auto lg:max-w-none">
              <button
                type="button"
                data-testid={`case-${c.id}`}
                onClick={() => startApply("cases", c.type as ServiceType)}
                className="group flex h-full w-full flex-col overflow-hidden rounded-[24px] bg-white text-left ring-1 ring-navy-100 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/25 active:scale-[0.99]"
              >
                <CaseArt kind={c.art} className="block aspect-[240/150] w-full" />
                <span className="flex flex-1 flex-col p-5">
                  <span className="block text-[18px] font-bold leading-[1.35] tracking-[-0.025em] text-navy sm:text-[20px]">{c.title}</span>
                  <span className="mt-1.5 block text-[15px] leading-[1.55] text-navy-600">{c.body}</span>
                  <span className="mt-auto flex items-center gap-1 pt-4 text-[15px] font-bold text-blue-700">
                    {CASES.cardCta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </span>
              </button>
            </Reveal>
          ))}
        </ul>

        <p className="mt-3 text-[13.5px] leading-relaxed text-navy-600" data-testid="cases-footnote">
          {CASES.footnote}
        </p>
      </div>
    </section>
  );
}
