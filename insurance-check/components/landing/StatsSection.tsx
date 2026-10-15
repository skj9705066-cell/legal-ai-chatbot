import { CalendarDays, FileText, Info } from "lucide-react";
import { STATS, STATS_DISCLAIMER, STATS_SOURCE, OFFICIAL_LOOKUP } from "@/lib/content";
import { OfficialLink } from "@/components/site/OfficialLink";
import { Section } from "./Section";

export function StatsSection() {
  return (
    <Section
      id="stats"
      eyebrow="공식 통계"
      title="찾아가지 않은 보험금, 생각보다 많습니다"
      description="숨은보험금은 지급 사유가 생겼거나 만기가 지났는데도 아직 찾아가지 않은 중도·만기·휴면보험금 등을 말합니다."
      tone="tint"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.9fr]">
        {STATS.map((s) => (
          <figure key={s.id} className="rounded-2xl border border-navy-200/80 bg-white p-6 shadow-card">
            <figcaption className="text-[14px] font-semibold text-navy-500">
              {s.basis} · {s.label}
            </figcaption>
            <p className="mt-2 text-[30px] font-extrabold tracking-tight text-navy sm:text-[34px]">
              {s.value}
              {"sub" in s && <span className="ml-2 inline-block whitespace-nowrap text-[18px] font-bold text-navy-600">/ {s.sub}</span>}
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-[13px] text-navy-500">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              금융위원회 발표 통계 인용
            </p>
          </figure>
        ))}
        <div className="rounded-2xl border border-navy-200/80 bg-white p-6">
          <dl className="space-y-3 text-[14px] leading-relaxed">
            <div className="flex gap-2">
              <dt className="flex w-16 shrink-0 items-center gap-1 font-semibold text-navy">
                <FileText className="h-4 w-4 text-navy-400" aria-hidden="true" />
                출처
              </dt>
              <dd>
                <a href={STATS_SOURCE.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue underline-offset-4 hover:underline">
                  {STATS_SOURCE.label}
                  <span className="sr-only">(새 창에서 열림)</span>
                </a>
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="flex w-16 shrink-0 items-center gap-1 font-semibold text-navy">
                <CalendarDays className="h-4 w-4 text-navy-400" aria-hidden="true" />
                기준
              </dt>
              <dd className="text-navy-600">규모는 2025년 말, 환급 실적은 2025년 중</dd>
            </div>
            <div className="flex gap-2">
              <dt className="flex w-16 shrink-0 items-center gap-1 font-semibold text-navy">
                <Info className="h-4 w-4 text-navy-400" aria-hidden="true" />
                유의
              </dt>
              <dd className="text-navy-600">{STATS_DISCLAIMER}</dd>
            </div>
          </dl>
          <div className="mt-5 border-t border-navy-100 pt-4">
            <p className="text-[13.5px] text-navy-600">숨은보험금은 {OFFICIAL_LOOKUP.name}에서 직접 조회할 수 있습니다.</p>
            <OfficialLink className="mt-1.5 text-[14.5px] font-semibold text-blue underline-offset-4 hover:underline" />
          </div>
        </div>
      </div>
    </Section>
  );
}
