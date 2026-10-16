"use client";

import { ArrowRight, Info } from "lucide-react";
import { SERVICE_TYPES } from "@/lib/types";
import { SERVICE_CONTENT } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";
import { useApply } from "./ApplyContext";
import { Section, SectionHeading } from "./Section";
import { SERVICE_ICON } from "./ServiceIcons";

/**
 * 점검 유형 선택 — 카드를 누르면 그 유형으로 곧바로 신청 폼(연락처 단계)으로 이동한다(중간 확인 버튼 없음).
 * 유형을 모르면 아래 '바로 신청하기'로 폼에서 고르게 한다.
 */
export function ServiceTypes() {
  const { serviceType, startApply } = useApply();
  return (
    <Section id="services" tone="tint">
      <Reveal>
        <SectionHeading
          id="services"
          eyebrow="점검 유형 선택"
          title="어떤 보험금이 궁금하신가요?"
          description="해당되는 항목을 선택하면 확인할 사항을 안내해 드립니다."
        />
      </Reveal>

      <ul className="mt-7 grid gap-3 sm:gap-4 lg:mt-10 lg:grid-cols-3 lg:gap-5">
        {SERVICE_TYPES.map((id, i) => {
          const c = SERVICE_CONTENT[id];
          const Icon = SERVICE_ICON[id];
          const isSelected = serviceType === id;
          return (
            <Reveal as="li" key={id} delay={i * 80} className="h-full">
              <button
                type="button"
                data-testid={`type-${id}`}
                aria-describedby={`type-desc-${id}`}
                onClick={() => startApply("type_card", id)}
                className={cn(
                  "group relative flex h-full min-h-[96px] w-full items-center gap-4 rounded-[22px] border-2 bg-white p-4 text-left transition-[border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/25 active:scale-[0.99] sm:p-6 lg:flex-col lg:items-start",
                  isSelected ? "border-blue shadow-lift" : "border-transparent shadow-card ring-1 ring-navy-100 hover:-translate-y-0.5 hover:border-blue/40 hover:shadow-lift",
                )}
              >
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] transition-colors sm:h-14 sm:w-14",
                    isSelected ? "bg-blue text-white" : "bg-blue-50 text-blue group-hover:bg-blue-100",
                  )}
                >
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.7} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 lg:w-full">
                  <span className="block text-[18px] font-bold leading-[1.35] tracking-[-0.02em] text-navy sm:text-[21px]">{c.cardTitle}</span>
                  <span id={`type-desc-${id}`} className="mt-1 block text-[15px] leading-[1.55] text-navy-600 sm:text-[16px]">
                    {c.cardDesc}
                  </span>
                  {c.cardNote && (
                    <span className="mt-2.5 flex gap-1.5 text-[14px] font-medium leading-relaxed text-caution">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {c.cardNote}
                    </span>
                  )}
                  <span className="mt-3 hidden items-center gap-1 text-[15px] font-bold text-blue-700 lg:flex">
                    이 항목으로 상담 신청
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-blue lg:hidden" aria-hidden="true" />
              </button>
            </Reveal>
          );
        })}
      </ul>

      <div id="type-cta" className="mt-5 text-center">
        <button
          type="button"
          onClick={() => startApply("type_card")}
          className="inline-flex min-h-[48px] items-center gap-1 rounded-xl px-4 text-[16px] font-semibold text-navy-600 underline-offset-4 hover:text-navy hover:underline"
        >
          어떤 유형인지 모르겠어요 · 바로 신청하기
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </Section>
  );
}
