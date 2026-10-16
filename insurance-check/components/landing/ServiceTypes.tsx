"use client";

import { ArrowRight, Check, Info } from "lucide-react";
import { SERVICE_TYPES } from "@/lib/types";
import { SERVICE_CONTENT } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/Reveal";
import { useApply } from "./ApplyContext";
import { Section, SectionHeading } from "./Section";
import { SERVICE_ICON } from "./ServiceIcons";

export function ServiceTypes() {
  const { serviceType, selectType, startApply } = useApply();
  const selected = serviceType ? SERVICE_CONTENT[serviceType] : null;
  return (
    <Section id="services" tone="tint">
      <Reveal>
        <SectionHeading
          id="services"
          eyebrow="점검 유형 선택"
          title="어떤 보험금을 점검해 드릴까요?"
          description="유형을 고르면 신청서에 자동으로 반영돼요."
        />
      </Reveal>

      <div role="radiogroup" aria-labelledby="services-title" className="mt-7 grid gap-3 sm:gap-4 lg:mt-10 lg:grid-cols-3 lg:gap-5">
        {SERVICE_TYPES.map((id, i) => {
          const c = SERVICE_CONTENT[id];
          const Icon = SERVICE_ICON[id];
          const isSelected = serviceType === id;
          return (
            <Reveal key={id} delay={i * 90} className="h-full">
              <label
                className={cn(
                  "group relative flex h-full cursor-pointer flex-col rounded-[24px] border-2 bg-white p-5 transition-[border-color,box-shadow,transform,background-color] duration-300 ease-out has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-blue/25 sm:p-8",
                  isSelected
                    ? "border-blue bg-[linear-gradient(180deg,#FFFFFF_0%,#EEF5FF_100%)] shadow-lift"
                    : "border-transparent shadow-card ring-1 ring-navy-100 hover:-translate-y-1 hover:shadow-lift",
                )}
              >
                <input
                  type="radio"
                  name="service-type-browse"
                  value={id}
                  checked={isSelected}
                  onChange={() => selectType(id)}
                  aria-describedby={`type-desc-${id}`}
                  className="sr-only"
                />
                <span className="flex items-start justify-between">
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-[16px] transition-colors duration-300 sm:h-16 sm:w-16 sm:rounded-[20px]",
                      isSelected ? "bg-blue text-white shadow-cta" : "bg-blue-50 text-blue group-hover:bg-blue-100",
                    )}
                  >
                    <Icon className="h-6 w-6 sm:h-8 sm:w-8" strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                      isSelected ? "scale-100 border-blue bg-blue text-white" : "scale-95 border-navy-200 bg-white text-transparent",
                    )}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                </span>
                <span className="mt-4 block text-[20px] font-bold leading-[1.32] tracking-[-0.025em] text-navy sm:mt-7 sm:text-[24px]">
                  {c.cardTitleLines[0]}
                  <br />
                  {c.cardTitleLines[1]}
                </span>
                <span id={`type-desc-${id}`} className="mt-2 block text-[15.5px] leading-[1.6] text-navy-600 sm:mt-3 sm:text-[17px]">
                  {c.cardDesc}
                </span>
                {c.cardNote && (
                  <span className="mt-4 flex gap-2 rounded-2xl bg-caution-50 px-4 py-3 text-[14px] font-medium leading-relaxed text-caution">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {c.cardNote}
                  </span>
                )}
              </label>
            </Reveal>
          );
        })}
      </div>

      {/* 유형 선택 직후 CTA */}
      <Reveal className="mt-6 flex flex-col items-center gap-3 text-center lg:mt-10">
        <div id="type-cta" className="w-full sm:w-auto">
        <Button
          size="xl"
          className="h-[62px] w-full text-[18px] sm:w-auto sm:min-w-[420px]"
          onClick={() => startApply("type_card", serviceType ?? undefined)}
        >
          선택한 보험금 무료 점검 상담 신청하기
          <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </Button>
        </div>
        <p className="text-[15px] text-navy-600" aria-live="polite">
          {selected ? (
            <>
              <strong className="font-semibold text-navy">{selected.cardTitle}</strong> 점검으로 신청서를 열어요
            </>
          ) : (
            "유형을 고르지 않아도 신청서에서 선택할 수 있어요"
          )}
        </p>
      </Reveal>

    </Section>
  );
}
