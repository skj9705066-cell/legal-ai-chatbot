"use client";

import { ArrowRight, Check, CircleCheck, Info } from "lucide-react";
import { SERVICE_TYPES } from "@/lib/types";
import { CHECK_CASES, CHECK_CASES_FOOTNOTE, SERVICE_CONTENT } from "@/lib/content";
import { cn } from "@/lib/utils";
import { OfficialLink } from "@/components/site/OfficialLink";
import { Button } from "@/components/ui/button";
import { useApply } from "./ApplyContext";
import { Section, SectionHeading } from "./Section";
import { SERVICE_ICON } from "./ServiceIcons";

export function ServiceTypes() {
  const { serviceType, selectType, startApply } = useApply();
  return (
    <Section id="services" tone="tint">
      <SectionHeading
        id="services"
        eyebrow="점검 유형"
        title="어떤 점검이 필요하세요?"
        description="상황에 맞는 유형을 고르면 필요한 서류와 진행 순서를 안내해 드려요."
      />
      <div role="radiogroup" aria-labelledby="services-title" className="mt-10 grid gap-4 lg:mt-14 lg:grid-cols-3 lg:gap-5">
        {SERVICE_TYPES.map((id, i) => {
          const c = SERVICE_CONTENT[id];
          const Icon = SERVICE_ICON[id];
          const selected = serviceType === id;
          return (
            <div
              key={id}
              onClick={() => selectType(id)}
              className={cn(
                "group relative flex cursor-pointer flex-col rounded-3xl border-2 bg-white p-6 transition-[border-color,box-shadow,transform] duration-200 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-blue/20 sm:p-7",
                selected ? "border-blue shadow-lift" : "border-navy-100 shadow-card hover:-translate-y-0.5 hover:border-navy-200",
              )}
            >
              <input
                type="radio"
                name="service-type-browse"
                value={id}
                checked={selected}
                onChange={() => selectType(id)}
                aria-label={c.cardTitle}
                aria-describedby={`type-desc-${id}`}
                className="sr-only"
              />
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
                    selected ? "bg-blue text-white" : "bg-blue-50 text-blue",
                  )}
                >
                  <Icon className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors",
                    selected ? "border-blue bg-blue text-white" : "border-navy-200 bg-white text-transparent",
                  )}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              </div>
              <p className="mt-6 text-[14px] font-bold text-navy-500">0{i + 1}</p>
              <h3 className="mt-1 text-[21px] font-bold leading-snug tracking-[-0.02em] text-navy">{c.cardTitle}</h3>
              <p id={`type-desc-${id}`} className="mt-2.5 text-[16px] leading-[1.65] text-navy-600">
                {c.cardDesc}
              </p>
              {c.cardNote && (
                <p className="mt-4 flex gap-2 rounded-2xl bg-caution-50 px-4 py-3 text-[14px] font-medium leading-relaxed text-caution">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {c.cardNote}
                </p>
              )}
              <div className="mt-auto pt-7">
                <Button
                  size="lg"
                  variant={selected ? "primary" : "soft"}
                  className={cn("w-full", !selected && "shadow-none")}
                  onClick={(e) => {
                    e.stopPropagation();
                    startApply("type_card", id);
                  }}
                >
                  {id === "hidden" ? "조회가 어려우면 상담 신청" : "이 유형으로 신청하기"}
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
                {id === "hidden" && (
                  <OfficialLink className="mt-2 w-full justify-center rounded-2xl py-2.5 text-[15px] font-semibold text-blue-700 hover:underline">
                    내보험찾아줌에서 바로 조회
                  </OfficialLink>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 rounded-3xl bg-white p-6 shadow-ring sm:p-8 lg:mt-16">
        <h3 className="text-[19px] font-bold tracking-[-0.02em] text-navy">이런 경우라면 점검해 보세요</h3>
        <ul className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-2 md:gap-y-5">
          {CHECK_CASES.map((c) => (
            <li key={c.title} className="flex gap-3">
              <CircleCheck className="mt-0.5 h-[22px] w-[22px] shrink-0 text-mint" aria-hidden="true" />
              <span>
                <span className="block text-[16px] font-semibold leading-snug text-ink">{c.title}</span>
                <span className="mt-1 hidden text-[15px] leading-relaxed text-navy-600 md:block">{c.body}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-navy-100 pt-5 text-[14px] leading-relaxed text-navy-500">{CHECK_CASES_FOOTNOTE}</p>
      </div>
    </Section>
  );
}
