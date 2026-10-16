import { ArrowUpRight, Info } from "lucide-react";
import { HIDDEN_DEFINITION, PROOF, STATS, STATS_AVERAGE_NOTE, STATS_DISCLAIMER, STATS_MOTION_NOTE, STATS_SOURCE } from "@/lib/content";
import { Odometer } from "@/components/motion/Odometer";
import { Reveal } from "@/components/motion/Reveal";
import { ApplyCta } from "./ApplyCta";

const [MAIN, ...REST] = STATS;
const AVG = REST.find((s) => s.id === "refund-average")!;
const SUBS = REST.filter((s) => s.id !== "refund-average");

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

/**
 * 공식 통계(아직 남아 있는 규모 → 2025년 전국 지급 실적)를 한 섹션에 압축한다.
 * 숫자는 크게, 설명은 짧게. 출처·기준·'개인별 금액 아님' 고지는 한 패널에 모은다.
 */
export function StatsSection() {
  return (
    <section id="stats" aria-labelledby="stats-title" className="relative overflow-hidden bg-deep py-14 text-white sm:py-20 lg:py-24">
      {/* 은은한 블루 글로우 */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-blue/25 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-40 h-[460px] w-[460px] rounded-full bg-blue/15 blur-[120px]" />

      <div className="container relative">
        <Reveal className="max-w-2xl">
          <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-blue-300">
            금융위원회 공식 발표 통계
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[13px] font-semibold text-white/85 ring-1 ring-inset ring-white/15">
              {STATS_SOURCE.dateLabel} 발표 · 고정 수치
            </span>
          </p>
          <h2 id="stats-title" className="mt-3 text-balance text-[26px] font-extrabold leading-[1.3] tracking-[-0.03em] sm:text-[34px] lg:text-[42px]">
            생각보다 많은 보험금이{" "}
            <br />
            아직 찾아가지 않은 상태입니다.
          </h2>
          <p className="mt-3 text-[16px] leading-[1.65] text-navy-300 lg:text-[17px]">숨은보험금: {HIDDEN_DEFINITION}</p>
        </Reveal>

        {/* 메인 통계 */}
        <Reveal className="mt-8 lg:mt-10">
          <div className="stat-main relative overflow-hidden rounded-[26px] bg-deep-800 p-5 shadow-glow ring-1 ring-inset ring-white/10 sm:p-8 lg:p-10">
            <div aria-hidden="true" className="pointer-events-none absolute left-6 top-1/2 h-40 w-[70%] -translate-y-1/2 rounded-full bg-blue/20 blur-[70px]" />
            <div className="relative flex items-center justify-between gap-8">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[16px] font-semibold text-white/90 lg:text-[18px]">
                  <span className="h-2 w-2 rounded-full bg-mint" aria-hidden="true" />
                  {MAIN.basis} {MAIN.label}
                </p>
                <p className="mt-2 flex items-baseline gap-2 whitespace-nowrap font-extrabold tracking-[-0.035em] text-white [font-size:clamp(30px,8.4vw,46px)] sm:text-[56px] lg:text-[72px]" data-testid="stat-main">
                  <span aria-hidden="true" className="text-[0.45em] font-bold text-white/75">{MAIN.prefix}</span>
                  <Odometer value={MAIN.value} template={MAIN.template} label={`${MAIN.basis} ${MAIN.label} ${MAIN.text}`} duration={2800} />
                </p>
              </div>
              <div className="hidden shrink-0 md:block">
                <DecorativeRing />
              </div>
            </div>
          </div>
        </Reveal>

        {/* 2025년 전국 지급 실적 */}
        <div id="proof" className="mt-10 lg:mt-14">
          <Reveal>
            <h3 id="proof-title" className="text-balance text-[21px] font-extrabold leading-[1.4] tracking-[-0.025em] sm:text-[26px] lg:text-[30px]">
              {PROOF.title}
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2" data-testid="proof-notes">
              {PROOF.notes.map((n) => (
                <li key={n} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-[14px] font-semibold text-white/90 ring-1 ring-inset ring-white/15">
                  <Info className="h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
                  {n}
                </li>
              ))}
            </ul>
          </Reveal>

          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:gap-4">
            {SUBS.map((s, i) => (
              <Reveal key={s.id} delay={120 * (i + 1)}>
                <div className="h-full rounded-[22px] bg-white/[0.05] p-5 ring-1 ring-inset ring-white/10 sm:p-7">
                  <p className="text-[15px] font-semibold text-white/90 sm:text-[16px]">
                    {s.basis} {s.label}
                  </p>
                  <p className="mt-2 flex items-baseline gap-1.5 whitespace-nowrap font-extrabold tracking-[-0.03em] text-white [font-size:clamp(30px,8.6vw,40px)] lg:text-[48px]" data-testid={`stat-${s.id}`}>
                    <span aria-hidden="true" className="text-[0.5em] font-bold text-white/75">{s.prefix}</span>
                    <Odometer value={s.value} template={s.template} label={`${s.basis} ${s.label} ${s.text}`} duration={2400} delay={150 * (i + 1)} />
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* 건당 평균: 블루 카드로 강조하되 '개인별 예상액 아님'을 숫자 바로 아래에 함께 */}
          <Reveal className="mt-3 lg:mt-4" delay={360}>
            <div className="avg-feature relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#0866F5_0%,#0550C4_60%,#0B3E8A_100%)] p-5 shadow-[0_30px_80px_-24px_rgba(8,102,245,0.75)] ring-1 ring-inset ring-white/20 sm:p-8 lg:p-10">
              <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/15 blur-[80px]" />
              <div className="relative lg:flex lg:items-end lg:justify-between lg:gap-10">
                <div className="min-w-0">
                  <p className="text-[16px] font-bold text-white lg:text-[19px]">
                    {AVG.basis} {AVG.label}
                  </p>
                  <p
                    className="mt-2 flex items-baseline gap-2 whitespace-nowrap font-extrabold tracking-[-0.035em] text-white [font-size:clamp(30px,8.4vw,46px)] sm:text-[56px] lg:text-[72px]"
                    data-testid={`stat-${AVG.id}`}
                  >
                    <span aria-hidden="true" className="text-[0.45em] font-bold text-white/80">{AVG.prefix}</span>
                    <Odometer value={AVG.value} template={AVG.template} label={`${AVG.basis} ${AVG.label} ${AVG.text}`} duration={3000} delay={300} />
                  </p>
                  {/* 개인별 예상액으로 오인되지 않도록 숫자 바로 아래 고정 표기 */}
                  <div className="mt-3" data-testid="stat-average-note">
                    <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[16px] font-extrabold text-blue-700 shadow-sm">
                      <Info className="h-[18px] w-[18px]" aria-hidden="true" />
                      {STATS_AVERAGE_NOTE.badge}
                    </p>
                    <p className="mt-2 text-[15px] font-medium leading-relaxed text-white/90 lg:text-[16px]">{STATS_AVERAGE_NOTE.text}</p>
                  </div>
                </div>
                <p className="mt-4 max-w-[300px] border-t border-white/20 pt-4 text-[14px] leading-relaxed text-white/85 lg:mt-0 lg:shrink-0 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0 lg:text-[15px]">
                  받을 수 있는 금액은 계약 내용과 청구 요건에 따라 사람마다 다르며, 지급 여부는 보험사가 결정합니다.
                </p>
              </div>
            </div>
          </Reveal>

          {/* 출처·유의사항 (한 패널) */}
          <div className="mt-3 rounded-[22px] bg-white/[0.03] p-5 text-[14px] leading-relaxed text-navy-300 ring-1 ring-inset ring-white/10 sm:p-6 lg:mt-4 lg:text-[15px]">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-white/90">
              <span className="font-semibold">출처 {STATS_SOURCE.publisher}</span>
              <span aria-hidden="true">·</span>
              <span>{STATS_SOURCE.dateLabel} 발표</span>
              <span aria-hidden="true">·</span>
              <span>기준 연도 2025년</span>
              <span aria-hidden="true">·</span>
              <a
                href={STATS_SOURCE.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold underline decoration-white/40 underline-offset-4 hover:decoration-white"
              >
                보도자료 원문
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">(새 창에서 열림)</span>
              </a>
            </p>
            <p className="mt-2">
              {STATS_DISCLAIMER} {STATS_MOTION_NOTE} 링 그래픽은 장식이며 추이를 나타내지 않습니다.
            </p>
          </div>

          <div id="proof-cta" className="mt-8 lg:mt-10">
            <ApplyCta source="stats" target="types" variant="white" size="xl" className="h-[60px] w-full text-[18px] shadow-none sm:w-auto sm:min-w-[320px]">
              {PROOF.cta}
            </ApplyCta>
          </div>
        </div>
      </div>
    </section>
  );
}
