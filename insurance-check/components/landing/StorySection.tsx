import { CalendarCheck, Gift, Info, Stethoscope, type LucideIcon } from "lucide-react";
import { HERO, STORY } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";
import { ApplyCta } from "./ApplyCta";
import { SectionHeading } from "./Section";

const ICON: Record<(typeof STORY.cases)[number]["id"], LucideIcon> = {
  maturity: CalendarCheck,
  interim: Gift,
  medical: Stethoscope,
};

/**
 * 통계 → 상황별 예시 → 나도 점검하기. 예시는 실제 지급 사례가 아니며,
 * 병원비 미청구 카드는 위 숨은보험금 통계와 별개임을 카드 안에 명시한다.
 */
export function StorySection() {
  return (
    <section id="stories" aria-labelledby="stories-title" className="bg-white py-20 sm:py-24 lg:py-32">
      <div className="container">
        <Reveal>
          <SectionHeading id="stories" eyebrow={STORY.eyebrow} title={STORY.title} />
        </Reveal>

        <ul className="mt-10 grid gap-4 lg:mt-14 lg:grid-cols-3 lg:gap-5">
          {STORY.cases.map((c, i) => {
            const Icon = ICON[c.id];
            return (
              <Reveal as="li" key={c.id} delay={i * 90} className="h-full">
                <article
                  data-testid={`story-${c.id}`}
                  className="flex h-full flex-col rounded-[28px] bg-white p-6 shadow-card ring-1 ring-navy-100 transition-[box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:shadow-lift sm:p-8"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px]",
                        c.inStats ? "bg-blue-50 text-blue" : "bg-navy-100 text-navy-700",
                      )}
                    >
                      <Icon className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[13px] font-bold",
                        c.inStats ? "bg-blue-50 text-blue-700" : "bg-navy-100 text-navy-600",
                      )}
                    >
                      {c.tag}
                    </span>
                  </div>
                  <h3 className="mt-6 text-[20px] font-bold leading-[1.4] tracking-[-0.02em] text-navy lg:text-[21px]">{c.title}</h3>
                  <p className="mt-3 text-[16px] leading-[1.7] text-navy-600">{c.desc}</p>
                  {"note" in c && (
                    <div className="mt-auto pt-5">
                      <p className="flex gap-2 rounded-2xl bg-navy-50 p-4 text-[14px] font-medium leading-relaxed text-navy-700">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        {c.note}
                      </p>
                    </div>
                  )}
                </article>
              </Reveal>
            );
          })}
        </ul>

        <p className="mt-5 flex gap-2 text-[15px] leading-relaxed text-navy-600" data-testid="story-footnote">
          <Info className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          {STORY.footnote}
        </p>

        {/* 나도 점검하기 → 사이트 안의 점검 유형 선택으로 이동 */}
        <Reveal className="mt-14 lg:mt-20">
          <div
            id="story-cta"
            className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#0B2445_0%,#0F2C52_55%,#0B3E8A_100%)] px-6 py-12 text-white sm:px-12 sm:py-16 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-16 lg:py-16"
          >
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue/30 blur-[90px]" />
            <div className="relative max-w-xl">
              <h3 id="story-cta-title" className="text-balance text-[28px] font-extrabold leading-[1.3] tracking-[-0.03em] sm:text-[36px] lg:text-[42px]">
                {/* "…보험금," 뒤에서 줄바꿈 */}
                {STORY.cta.title.split(", ").map((part, i, arr) => (
                  <span key={part}>
                    {part}
                    {i < arr.length - 1 && (
                      <>
                        ,{" "}
                        <br />
                      </>
                    )}
                  </span>
                ))}
              </h3>
              <p className="mt-4 text-pretty text-[17px] leading-[1.7] text-navy-300 lg:text-[18px]">{STORY.cta.desc}</p>
            </div>
            <div className="relative mt-9 flex flex-col gap-3 lg:mt-0 lg:shrink-0 lg:items-center">
              <ApplyCta source="stats" target="types" variant="white" size="xl" className="h-[62px] w-full text-[18px] shadow-none sm:w-auto sm:min-w-[320px]">
                {STORY.cta.button}
              </ApplyCta>
              <p className="text-[15px] text-navy-300">{HERO.trust.slice(0, 2).join(" · ")}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
