"use client";

import { ArrowRight, Info } from "lucide-react";
import { SERVICE_TYPES } from "@/lib/types";
import { SERVICE_CONTENT } from "@/lib/content";
import { cn } from "@/lib/utils";
import { TypeArt } from "@/components/illustrations/Art";
import { Reveal } from "@/components/motion/Reveal";
import { useApply } from "./ApplyContext";

/**
 * 점검 유형 선택 — 큰 일러스트 + 짧은 이름만. 누르면 그 유형으로 곧바로 신청 폼(연락처 단계)으로 이동하고,
 * 유형 설명은 폼에서 짧게 보여준다. 모바일은 3열 타일(한 화면에 모두 보임), 데스크톱은 설명까지 보이는 큰 카드.
 */
export function ServiceTypes() {
  const { serviceType, startApply } = useApply();
  return (
    <section id="services" aria-labelledby="services-title" className="bg-navy-50 py-12 sm:py-20 lg:py-24">
      <div className="container">
        <Reveal>
          <h2 id="services-title" tabIndex={-1} className="text-[26px] font-extrabold leading-[1.3] tracking-[-0.03em] text-navy focus:outline-none sm:text-[32px] lg:text-[38px]">
            어떤 보험금이 궁금하세요?
          </h2>
        </Reveal>

        <ul className="mt-6 grid grid-cols-3 gap-2.5 sm:gap-4 lg:mt-10 lg:gap-5">
          {SERVICE_TYPES.map((id, i) => {
            const c = SERVICE_CONTENT[id];
            const isSelected = serviceType === id;
            return (
              <Reveal as="li" key={id} delay={i * 80} className="h-full">
                <button
                  type="button"
                  data-testid={`type-${id}`}
                  aria-label={`${c.cardTitle} 점검 신청`}
                  onClick={() => startApply("type_card", id)}
                  className={cn(
                    "group flex h-full w-full flex-col items-center rounded-[22px] border-2 bg-white px-2 pb-4 pt-4 text-center transition-[border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/25 active:scale-[0.98] sm:px-4 sm:pb-6 lg:items-start lg:p-7 lg:text-left",
                    isSelected ? "border-blue shadow-lift" : "border-transparent shadow-card hover:-translate-y-0.5 hover:border-blue/40 hover:shadow-lift",
                  )}
                >
                  <TypeArt kind={id} className="h-[68px] w-[68px] sm:h-[88px] sm:w-[88px] lg:h-[104px] lg:w-[104px]" />
                  <span className="mt-2.5 block text-[15px] font-bold leading-[1.35] tracking-[-0.025em] text-navy [word-break:keep-all] sm:text-[18px] lg:mt-4 lg:text-[21px]">
                    {c.pickTitle}
                  </span>
                  {id === "refund" && (
                    <span className="mt-1.5 whitespace-nowrap rounded-full bg-caution-50 px-1.5 py-0.5 text-[11.5px] font-semibold text-caution sm:px-2 sm:text-[13px]">해지 권유 없음</span>
                  )}
                  <span className="mt-2 hidden text-[16px] leading-[1.55] text-navy-600 lg:block">{c.cardDesc}</span>
                  <span className="mt-auto hidden items-center gap-1 pt-4 text-[15px] font-bold text-blue-700 lg:flex">
                    이 항목으로 신청
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </button>
              </Reveal>
            );
          })}
        </ul>

        <p className="mt-4 flex gap-1.5 text-[13.5px] leading-relaxed text-navy-600" data-testid="refund-note">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          해지환급금은 해지할 때 받는 돈이라 해지하면 보장이 사라집니다. 해지를 권유하지 않습니다.
        </p>

        <div id="type-cta" className="mt-3 text-center">
          <button
            type="button"
            onClick={() => startApply("type_card")}
            className="inline-flex min-h-[48px] items-center gap-1 rounded-xl px-4 text-[15px] font-semibold text-navy-600 underline-offset-4 hover:text-navy hover:underline"
          >
            잘 모르겠어요 · 바로 신청하기
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
