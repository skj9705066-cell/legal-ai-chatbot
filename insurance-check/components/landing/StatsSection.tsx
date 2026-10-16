import { ArrowUpRight, Info } from "lucide-react";
import { HIDDEN_DEFINITION, PROOF, STATS, STATS_DISCLAIMER, STATS_MOTION_NOTE, STATS_SOURCE } from "@/lib/content";
import { Odometer } from "@/components/motion/Odometer";
import { Reveal } from "@/components/motion/Reveal";
import { ApplyCta } from "./ApplyCta";
import { Disclosure } from "./Disclosure";

const [MAIN, COUNT, AMOUNT] = STATS;

/** 장식용 링 그래픽(데스크톱). 시점별 추이·데이터를 나타내지 않는다. */
function DecorativeRing() {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className="h-[176px] w-[176px] lg:h-[200px] lg:w-[200px]">
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
 * 공식 통계 — 모바일은 숫자 2개만 먼저(남은 규모 10조 3,000억원 → 2025년 약 80만 건 지급).
 * 지급액·정의·유의사항 전문은 '통계 자세히 보기'에 둔다. 출처·기준 시점·전국 집계 표시는 항상 보인다.
 */
export function StatsSection() {
  return (
    <section id="stats" aria-labelledby="stats-title" className="relative overflow-hidden bg-deep py-12 text-white sm:py-20 lg:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-blue/25 blur-[120px]" />

      <div className="container relative">
        <Reveal>
          <div className="stat-main relative overflow-hidden rounded-[28px] bg-deep-800 p-6 shadow-glow ring-1 ring-inset ring-white/10 sm:p-9 lg:p-12">
            <div aria-hidden="true" className="pointer-events-none absolute left-6 top-1/3 h-36 w-[70%] rounded-full bg-blue/20 blur-[70px]" />
            <div className="relative flex items-center justify-between gap-8">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-white/90 ring-1 ring-inset ring-white/15">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden="true" />
                  {MAIN.basis}
                </p>
                <h2 id="stats-title" className="mt-3 text-[20px] font-bold leading-snug tracking-[-0.025em] text-white/95 sm:text-[24px] lg:text-[28px]">
                  {MAIN.label}
                </h2>
                <p
                  className="mt-1.5 flex items-baseline gap-2 whitespace-nowrap font-extrabold tracking-[-0.04em] text-white [font-size:clamp(34px,10vw,48px)] sm:text-[60px] lg:text-[76px]"
                  data-testid="stat-main"
                >
                  <span aria-hidden="true" className="text-[0.42em] font-bold text-white/75">
                    {MAIN.prefix}
                  </span>
                  <Odometer value={MAIN.value} template={MAIN.template} label={`${MAIN.basis} ${MAIN.label} ${MAIN.text}`} duration={2800} />
                </p>

                <div id="proof" className="mt-5 border-t border-white/10 pt-5">
                  <h3 id="proof-title" className="sr-only">
                    {PROOF.title}
                  </h3>
                  <p className="flex flex-wrap items-baseline gap-x-2 text-[19px] font-bold tracking-[-0.02em] text-white sm:text-[22px]" aria-hidden="true">
                    <span className="text-white/80">2025년</span>
                    <span className="flex items-baseline gap-1 text-[28px] font-extrabold text-white sm:text-[34px]" data-testid={`stat-${COUNT.id}`}>
                      <span className="text-[0.55em] font-bold text-white/75">{COUNT.prefix}</span>
                      <Odometer value={COUNT.value} template={COUNT.template} label={`${COUNT.basis} ${COUNT.label} ${COUNT.text}`} duration={2400} delay={200} />
                    </span>
                    <span className="text-white/80">지급</span>
                  </p>
                </div>
              </div>
              <div className="hidden shrink-0 md:block">
                <DecorativeRing />
              </div>
            </div>
          </div>
        </Reveal>

        {/* 꼭 보여야 하는 표시: 전국 집계 · 건수 기준 · 출처/기준 시점 */}
        <ul className="mt-4 flex flex-wrap gap-2" data-testid="proof-notes">
          {PROOF.notes.map((n) => (
            <li key={n} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-[13.5px] font-semibold text-white/90 ring-1 ring-inset ring-white/15">
              <Info className="h-3.5 w-3.5 shrink-0 text-blue-300" aria-hidden="true" />
              {n}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[14px] text-navy-300">
          출처{" "}
          <a
            href={STATS_SOURCE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
          >
            {STATS_SOURCE.publisher} 보도자료
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">(새 창에서 열림)</span>
          </a>{" "}
          · {STATS_SOURCE.dateLabel} 발표 · 개인별 환급을 뜻하지 않아요
        </p>

        <Disclosure label="통계 자세히 보기" tone="dark" className="mt-1" testId="stats-more">
          <div className="space-y-3 pb-1">
            <div className="rounded-[20px] bg-white/[0.05] p-5 ring-1 ring-inset ring-white/10">
              <p className="text-[15px] font-semibold text-white/90">
                {AMOUNT.basis} {AMOUNT.label}
              </p>
              <p className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap text-[30px] font-extrabold tracking-[-0.03em] text-white sm:text-[36px]" data-testid={`stat-${AMOUNT.id}`}>
                <span aria-hidden="true" className="text-[0.5em] font-bold text-white/75">
                  {AMOUNT.prefix}
                </span>
                <Odometer value={AMOUNT.value} template={AMOUNT.template} label={`${AMOUNT.basis} ${AMOUNT.label} ${AMOUNT.text}`} duration={2000} />
              </p>
            </div>
            <div className="space-y-1.5 text-[14px] leading-relaxed text-navy-300">
              <p>숨은보험금: {HIDDEN_DEFINITION} 병원비·수술비 등 청구하지 않은 보험금은 이 통계에 포함되지 않습니다.</p>
              <p>
                {STATS_DISCLAIMER} {STATS_MOTION_NOTE} 기준 연도 2025년. 링 그래픽은 장식이며 추이를 나타내지 않습니다.
              </p>
            </div>
          </div>
        </Disclosure>

        <div id="proof-cta" className="mt-6">
          <ApplyCta source="stats" target="types" variant="white" size="xl" className="h-[58px] w-full text-[17px] shadow-none sm:w-auto sm:min-w-[340px] sm:text-[18px]">
            {PROOF.cta}
          </ApplyCta>
        </div>
      </div>
    </section>
  );
}
