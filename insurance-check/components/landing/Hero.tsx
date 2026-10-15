import { BadgeCheck, Landmark, ShieldCheck } from "lucide-react";
import { STATS, STATS_DISCLAIMER, STATS_SOURCE } from "@/lib/content";
import { OfficialLink } from "@/components/site/OfficialLink";
import { ApplyCta } from "./ApplyCta";

const TRUST = [
  { icon: BadgeCheck, label: "무료 점검 안내" },
  { icon: ShieldCheck, label: "보험 가입 필수 아님" },
  { icon: Landmark, label: "공식 조회 서비스 안내" },
];

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(60%_60%_at_80%_0%,#EFF6FF_0%,rgba(239,246,255,0)_70%)]"
      />
      <div className="container grid gap-10 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:pb-24 lg:pt-20">
        <div className="animate-fade-up">
          <h1 id="hero-title" className="text-balance text-[30px] font-extrabold leading-[1.25] tracking-[-0.02em] text-navy sm:text-[40px] lg:text-[52px]">
            혹시 아직 받지 못한
            <br />
            <span className="text-blue">보험금</span>이 있으신가요?
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-[1.7] text-navy-600 sm:text-[18px]">
            병원비·수술비 미청구 보험금, 숨은 보험금, 과오납 보험료·해지환급금 확인 방법을 안내합니다.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="서비스 특징">
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3 py-1.5 text-[13.5px] font-semibold text-navy-700">
                <Icon className="h-4 w-4 text-mint" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center" id="hero-cta">
            <ApplyCta source="hero" size="xl" className="w-full sm:w-auto" />
            <OfficialLink className="justify-center rounded-xl px-4 py-3 text-[15px] font-semibold text-navy-600 underline-offset-4 hover:text-navy hover:underline">
              개인정보 입력 없이 공식 조회하기
            </OfficialLink>
          </div>
        </div>

        <div className="animate-fade-up [animation-delay:120ms]">
          <div className="rounded-[28px] border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
            <div className="flex items-center justify-between px-1 pb-3">
              <p className="text-[13px] font-bold text-navy-600">금융위원회 발표 통계 인용</p>
              <a
                href={STATS_SOURCE.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12.5px] font-medium text-navy-500 underline underline-offset-2 hover:text-navy"
              >
                출처 보기<span className="sr-only">: {STATS_SOURCE.label} (새 창에서 열림)</span>
              </a>
            </div>
            <dl className="grid gap-3">
              {STATS.map((s) => (
                <div key={s.id} className="rounded-2xl bg-white p-5 shadow-card">
                  <dt className="text-[13.5px] font-semibold text-navy-500">
                    {s.basis} {s.label}
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[28px] font-extrabold tracking-tight text-navy sm:text-[32px]">{s.value}</span>
                    {"sub" in s && <span className="whitespace-nowrap text-[17px] font-bold text-navy-600">/ {s.sub}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-navy-500">
              출처: {STATS_SOURCE.label}. {STATS_DISCLAIMER}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
