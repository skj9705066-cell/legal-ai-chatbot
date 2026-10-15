import { ArrowUpRight, Info } from "lucide-react";
import { HIDDEN_DEFINITION, STATS, STATS_DISCLAIMER, STATS_MOTION_NOTE, STATS_SOURCE } from "@/lib/content";
import { Odometer } from "@/components/motion/Odometer";
import { Reveal } from "@/components/motion/Reveal";
import { ApplyCta } from "./ApplyCta";

const [MAIN, ...SUBS] = STATS;

/** 장식용 링 그래픽: 숫자 애니메이션 진행에 맞춰 그려진다. 시점별 추이·데이터를 나타내지 않는다. */
function DecorativeRing() {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className="h-[168px] w-[168px] lg:h-[196px] lg:w-[196px]">
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4D93FF" />
          <stop offset="100%" stopColor="#16A085" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
      <circle
        className="ring-arc"
        cx="100"
        cy="100"
        r="84"
        fill="none"
        stroke="url(#ring-grad)"
        strokeWidth="14"
        strokeLinecap="round"
        transform="rotate(-90 100 100)"
        pathLength={100}
        strokeDasharray="100"
      />
      <circle cx="100" cy="100" r="36" fill="rgba(8,102,245,0.18)" />
      <path d="M86 101l9 9 19-20" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatsSection() {
  return (
    <section id="stats" aria-labelledby="stats-title" className="relative overflow-hidden bg-deep py-20 text-white sm:py-24 lg:py-32">
      {/* 은은한 블루 글로우 */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-blue/25 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-40 h-[420px] w-[420px] rounded-full bg-mint/10 blur-[110px]" />

      <div className="container relative">
        <Reveal className="max-w-2xl">
          <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-blue-300">
            금융위원회 공식 발표 통계
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[13px] font-semibold text-white/85 ring-1 ring-inset ring-white/15">
              {STATS_SOURCE.dateLabel} 발표 · 고정 수치
            </span>
          </p>
          <h2 id="stats-title" className="mt-3 text-balance text-[28px] font-extrabold leading-[1.3] tracking-[-0.03em] sm:text-[36px] lg:text-[44px]">
            아직 주인을 찾지 못한
            <br />
            숨은보험금이 있습니다
          </h2>
          <p className="mt-4 text-[17px] leading-[1.7] text-navy-300 lg:text-[18px]">{HIDDEN_DEFINITION}</p>
        </Reveal>

        {/* 메인 통계 */}
        <Reveal className="mt-12 lg:mt-14">
          <div className="stat-main relative overflow-hidden rounded-[28px] bg-deep-800 p-6 shadow-glow ring-1 ring-inset ring-white/10 sm:p-9 lg:p-12">
            <div aria-hidden="true" className="pointer-events-none absolute left-6 top-1/2 h-40 w-[70%] -translate-y-1/2 rounded-full bg-blue/20 blur-[70px]" />
            <div className="relative flex items-center justify-between gap-8">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[16px] font-semibold text-white/90 lg:text-[18px]">
                  <span className="h-2 w-2 rounded-full bg-mint" aria-hidden="true" />
                  {MAIN.basis} {MAIN.label}
                </p>
                <p className="mt-3 font-extrabold tracking-[-0.035em] text-white [font-size:clamp(30px,9vw,46px)] sm:text-[56px] lg:text-[72px]" data-testid="stat-main">
                  <Odometer value={MAIN.value} template={MAIN.template} label={`${MAIN.basis} ${MAIN.label} ${MAIN.text}`} duration={2800} />
                </p>
                <p className="mt-4 text-[15px] text-navy-300">
                  출처: {STATS_SOURCE.publisher} ({STATS_SOURCE.dateLabel} 발표) · 기준: 2025년 말
                </p>
              </div>
              <div className="hidden shrink-0 md:block">
                <DecorativeRing />
              </div>
            </div>
          </div>
        </Reveal>

        {/* 보조 통계 */}
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:mt-5 lg:gap-5">
          {SUBS.map((s, i) => (
            <Reveal key={s.id} delay={120 * (i + 1)}>
              <div className="h-full rounded-[24px] bg-white/[0.05] p-6 ring-1 ring-inset ring-white/10 sm:p-8">
                <p className="text-[16px] font-semibold text-white/90">
                  {s.basis} {s.label}
                </p>
                <p className="mt-3 flex items-baseline gap-1.5 whitespace-nowrap font-extrabold tracking-[-0.03em] text-white [font-size:clamp(30px,8.6vw,40px)] lg:text-[48px]" data-testid={`stat-${s.id}`}>
                  {"prefix" in s && <span className="text-[0.5em] font-bold text-white/75">{s.prefix}</span>}
                  <Odometer value={s.value} template={s.template} label={`${s.basis} ${s.label} ${s.text}`} duration={2400} delay={150 * (i + 1)} />
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* 출처·유의사항 */}
        <Reveal className="mt-4 lg:mt-5">
          <div className="rounded-[24px] bg-white/[0.03] p-6 ring-1 ring-inset ring-white/10 sm:p-7 lg:flex lg:items-start lg:gap-10">
            <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 text-[15px] sm:grid-cols-4">
              <div>
                <dt className="text-navy-300">발표 기관</dt>
                <dd className="mt-0.5 font-semibold">{STATS_SOURCE.publisher}</dd>
              </div>
              <div>
                <dt className="text-navy-300">발표일</dt>
                <dd className="mt-0.5 font-semibold">{STATS_SOURCE.dateLabel}</dd>
              </div>
              <div>
                <dt className="text-navy-300">기준 연도</dt>
                <dd className="mt-0.5 font-semibold">2025년</dd>
              </div>
              <div>
                <dt className="text-navy-300">원문</dt>
                <dd className="mt-0.5">
                  <a
                    href={STATS_SOURCE.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold underline decoration-white/40 underline-offset-4 hover:decoration-white"
                  >
                    보도자료
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">(새 창에서 열림)</span>
                  </a>
                </dd>
              </div>
            </dl>
            <div className="mt-5 space-y-2 border-t border-white/10 pt-5 text-[15px] leading-relaxed text-navy-300 lg:mt-0 lg:max-w-md lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <p className="flex gap-2">
                <Info className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                {STATS_DISCLAIMER}
              </p>
              <p className="pl-[26px]">{STATS_MOTION_NOTE} 그래픽은 장식이며 시점별 추이를 나타내지 않습니다.</p>
            </div>
          </div>
        </Reveal>

        <div className="mt-12 lg:mt-14">
          <ApplyCta source="stats" target="types" variant="white" size="xl" className="w-full shadow-none sm:w-auto sm:min-w-[320px]" />
        </div>
      </div>
    </section>
  );
}
