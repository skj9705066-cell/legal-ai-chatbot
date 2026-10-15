import { ArrowUpRight, Info } from "lucide-react";
import { HIDDEN_DEFINITION, STATS, STATS_DISCLAIMER, STATS_SOURCE } from "@/lib/content";
import { OfficialLink } from "@/components/site/OfficialLink";
import { ApplyCta } from "./ApplyCta";
import { Section, SectionHeading } from "./Section";

export function StatsSection() {
  return (
    <Section id="stats" tone="navy">
      <SectionHeading
        id="stats"
        tone="dark"
        eyebrow="금융위원회 발표 통계"
        title={
          <>
            아직 주인을 찾지 못한
            <br className="hidden sm:block" /> 숨은보험금이 있습니다
          </>
        }
        description={HIDDEN_DEFINITION}
      />

      <dl className="mt-12 grid gap-4 md:grid-cols-3 lg:mt-14 lg:gap-5">
        {STATS.map((s, i) => (
          <div
            key={s.id}
            className={`flex flex-col rounded-3xl p-7 lg:p-8 ${i === 0 ? "bg-blue" : "bg-white/[0.06] ring-1 ring-inset ring-white/10"}`}
          >
            <dt className="order-2 mt-3 text-[16px] font-semibold text-white/90">
              {s.label}
              <span className={`mt-1 block text-[14px] font-medium ${i === 0 ? "text-white" : "text-navy-300"}`}>{s.basis}</span>
            </dt>
            <dd className="num-display order-1 flex items-baseline gap-1 text-white">
              {"prefix" in s && <span className="mr-1 text-[20px] font-bold text-white/80">{s.prefix}</span>}
              <span className="text-[40px] font-extrabold leading-none lg:text-[48px]">{s.num}</span>
              <span className="text-[22px] font-bold lg:text-[24px]">{s.unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 rounded-3xl bg-white/[0.04] p-6 ring-1 ring-inset ring-white/10 lg:flex lg:items-center lg:justify-between lg:gap-8 lg:p-7">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-[15px] sm:grid-cols-3 lg:flex-1">
          <div>
            <dt className="text-navy-300">발표 기관</dt>
            <dd className="mt-0.5 font-semibold text-white">{STATS_SOURCE.publisher}</dd>
          </div>
          <div>
            <dt className="text-navy-300">발표일</dt>
            <dd className="mt-0.5 font-semibold text-white">{STATS_SOURCE.dateLabel}</dd>
          </div>
          <div>
            <dt className="text-navy-300">원문</dt>
            <dd className="mt-0.5">
              <a
                href={STATS_SOURCE.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
              >
                보도자료 보기
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">(새 창에서 열림)</span>
              </a>
            </dd>
          </div>
        </dl>
        <p className="mt-5 flex gap-2 border-t border-white/10 pt-5 text-[15px] leading-relaxed text-navy-300 lg:mt-0 lg:max-w-sm lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <Info className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          {STATS_DISCLAIMER}
        </p>
      </div>

      <div className="mt-12 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:mt-14">
        <ApplyCta source="stats" variant="white" size="xl" className="w-full shadow-none sm:w-auto sm:min-w-[300px]" />
        <OfficialLink className="justify-center rounded-2xl px-4 py-3 text-[16px] font-semibold text-white/90 underline-offset-4 hover:text-white hover:underline">
          내보험찾아줌에서 직접 조회하기
        </OfficialLink>
      </div>
    </Section>
  );
}
