import { Info, SearchCheck } from "lucide-react";
import { CASES } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { ApplyCta } from "./ApplyCta";
import { PersonaAvatar } from "./PersonaAvatar";
import { SectionHeading } from "./Section";

/**
 * 공감형 상황 섹션 — 상황별 사례와 대화 예시를 하나로 합쳤다.
 * 카드 = 인물 일러스트 + 고객이 할 법한 질문(말풍선) + 점검에서 확인하는 것. 지급 성공담이 아니다.
 * 모바일은 가로로 넘기는 한 줄(세로 길이 절약), 데스크톱은 4열.
 */
export function CasesSection() {
  return (
    <section id="cases" aria-labelledby="cases-title" className="bg-white py-14 sm:py-20 lg:py-24">
      <div className="container">
        <Reveal>
          <SectionHeading id="cases" eyebrow={CASES.eyebrow} title={CASES.title} description={CASES.subtitle} />
        </Reveal>

        <ul
          className="-mx-5 mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:mt-10 xl:grid-cols-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/20 [&::-webkit-scrollbar]:hidden"
          aria-label="상황 예시 (좌우로 넘겨 보세요)"
          // 모바일 가로 스크롤 영역은 키보드로도 넘길 수 있어야 한다
          tabIndex={0}
        >
          {CASES.items.map((c, i) => (
            <Reveal as="li" key={c.id} delay={i * 80} className="w-[84%] shrink-0 snap-start sm:w-auto">
              <article
                data-testid={`case-${c.id}`}
                aria-labelledby={`case-${c.id}-title`}
                className="flex h-full flex-col rounded-[24px] bg-navy-50 p-5 ring-1 ring-navy-100 transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-card sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <PersonaAvatar kind={c.avatar} className="h-12 w-12 shrink-0" />
                  <h3 id={`case-${c.id}-title`} className="text-[17px] font-bold leading-[1.4] tracking-[-0.02em] text-navy">
                    {c.persona}
                  </h3>
                </div>
                {/* 고객이 할 법한 질문 — 말풍선 */}
                <p className="mt-4 self-start rounded-[18px] rounded-tl-[6px] bg-white px-4 py-3 text-[15.5px] leading-[1.6] text-ink shadow-sm ring-1 ring-navy-100">
                  &ldquo;{c.question}&rdquo;
                </p>
                {/* 점검에서 확인하는 것 */}
                <p className="mt-3 flex gap-2 text-[15px] leading-[1.6] text-navy-700">
                  <SearchCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-blue" aria-hidden="true" />
                  {c.point}
                </p>
                <span className="mt-auto pt-4 text-[12.5px] font-semibold text-navy-600">{CASES.badge}</span>
              </article>
            </Reveal>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex gap-2 text-[14px] leading-relaxed text-navy-600" data-testid="cases-footnote">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {CASES.footnote}
          </p>
          <ApplyCta source="cases" variant="soft" size="lg" className="w-full shrink-0 sm:w-auto">
            {CASES.cta}
          </ApplyCta>
        </div>
      </div>
    </section>
  );
}
