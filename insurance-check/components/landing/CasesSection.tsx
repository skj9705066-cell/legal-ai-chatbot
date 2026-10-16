"use client";

import { ArrowRight, CalendarClock, HeartPulse, Info, Layers, ReceiptText, type LucideIcon } from "lucide-react";
import type { ServiceType } from "@/lib/types";
import { CASES } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { useApply } from "./ApplyContext";
import { ApplyCta } from "./ApplyCta";
import { SectionHeading } from "./Section";

const ICON: Record<(typeof CASES.items)[number]["icon"], LucideIcon> = {
  surgery: HeartPulse,
  old: CalendarClock,
  receipt: ReceiptText,
  layers: Layers,
};

/**
 * 공감 섹션 — "나도 그랬는데"를 떠올리게 하는 질문형 카드.
 * 카드 전체가 버튼이며, 맞는 점검 유형을 골라 같은 신청 폼으로 바로 이어진다(유형이 애매한 카드는 폼에서 고르게 한다).
 */
export function CasesSection() {
  const { startApply } = useApply();
  return (
    <section id="cases" aria-labelledby="cases-title" className="bg-white py-14 sm:py-20 lg:py-24">
      <div className="container">
        <Reveal>
          <SectionHeading id="cases" eyebrow={CASES.eyebrow} title={CASES.title} description={CASES.subtitle} />
        </Reveal>

        <ul className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-10 lg:grid-cols-4">
          {CASES.items.map((c, i) => {
            const Icon = ICON[c.icon];
            return (
              <Reveal as="li" key={c.id} delay={i * 70} className="h-full">
                <button
                  type="button"
                  data-testid={`case-${c.id}`}
                  onClick={() => startApply("cases", (c.type as ServiceType | null) ?? undefined)}
                  className="group flex h-full w-full flex-col rounded-[22px] bg-navy-50 p-4 text-left ring-1 ring-navy-100 transition-[box-shadow,transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-card focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/25 active:scale-[0.99] sm:p-6"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-blue ring-1 ring-navy-100 sm:h-12 sm:w-12">
                    <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="mt-4 block text-[16.5px] font-bold leading-[1.4] tracking-[-0.02em] text-navy sm:text-[19px]">{c.title}</span>
                  <span className="mt-2 block text-[15px] leading-[1.6] text-navy-600 sm:text-[16px]">{c.body}</span>
                  <span className="mt-auto flex items-center gap-1 pt-4 text-[15px] font-bold text-blue-700">
                    {c.cta}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </button>
              </Reveal>
            );
          })}
        </ul>

        <p className="mt-4 flex gap-2 text-[14px] leading-relaxed text-navy-600" data-testid="cases-footnote">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {CASES.footnote}
        </p>

        <Reveal className="mt-10 text-center">
          <p className="text-balance text-[21px] font-extrabold leading-[1.45] tracking-[-0.025em] text-navy sm:text-[26px]">
            {CASES.closingLines[0]}
            <br />
            {CASES.closingLines[1]}
          </p>
          <div id="cases-cta" className="mt-5">
            <ApplyCta source="cases" size="xl" className="h-[60px] w-full text-[18px] sm:w-auto sm:min-w-[320px]">
              {CASES.cta}
            </ApplyCta>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
