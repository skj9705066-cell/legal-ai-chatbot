import { Info, Quote } from "lucide-react";
import { CASES } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { PersonaAvatar } from "./PersonaAvatar";
import { SectionHeading } from "./Section";

/** 4. 상황별 사례 — 실제 지급 사례가 아닌 일반 예시(인물·이름·금액 없음). */
export function CasesSection() {
  return (
    <section id="cases" aria-labelledby="cases-title" className="bg-white py-20 sm:py-24 lg:py-32">
      <div className="container">
        <Reveal>
          <SectionHeading id="cases" eyebrow={CASES.eyebrow} title={CASES.title} />
        </Reveal>

        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:mt-14 lg:gap-5 xl:grid-cols-4">
          {CASES.items.map((c, i) => (
            <Reveal as="li" key={c.id} delay={i * 90} className="h-full">
              <article
                data-testid={`case-${c.id}`}
                aria-labelledby={`case-${c.id}-title`}
                className="group relative flex h-full flex-col rounded-[28px] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAFE_100%)] p-6 shadow-card ring-1 ring-navy-100 transition-[box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:shadow-lift sm:p-7"
              >
                <div className="flex items-start justify-between gap-3">
                  <PersonaAvatar kind={c.avatar} className="h-16 w-16 shrink-0 drop-shadow-sm transition-transform duration-300 group-hover:scale-105" />
                  <span className="rounded-full bg-navy-100 px-2.5 py-1 text-[12.5px] font-bold text-navy-600">{CASES.badge}</span>
                </div>
                <p className="mt-5 text-[13px] font-bold tracking-[0.08em] text-blue-700">사례 {c.no}</p>
                <h3 id={`case-${c.id}-title`} className="mt-1 text-[19px] font-bold leading-[1.4] tracking-[-0.02em] text-navy">
                  {c.persona}
                </h3>
                <blockquote className="relative mt-4 flex-1 rounded-2xl bg-navy-50 p-4 pt-5 text-[16px] leading-[1.7] text-ink">
                  <Quote className="absolute -top-2.5 left-4 h-5 w-5 fill-blue-100 text-blue-300" aria-hidden="true" />
                  {c.quote}
                </blockquote>
              </article>
            </Reveal>
          ))}
        </ul>

        <p className="mt-6 flex gap-2 text-[15px] leading-relaxed text-navy-600" data-testid="cases-footnote">
          <Info className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          {CASES.footnote}
        </p>
      </div>
    </section>
  );
}
