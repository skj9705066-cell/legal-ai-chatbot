import { CheckCircle2 } from "lucide-react";
import { HERO } from "@/lib/content";
import { ApplyCta } from "./ApplyCta";
import { HeroVisual } from "./HeroVisual";

function Highlighted({ line }: { line: string }) {
  const i = line.indexOf(HERO.highlight);
  if (i < 0) return <>{line}</>;
  return (
    <>
      {line.slice(0, i)}
      <span className="text-blue">{HERO.highlight}</span>
      {line.slice(i + HERO.highlight.length)}
    </>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-[linear-gradient(180deg,#FFFFFF_0%,#F3F7FC_100%)]">
      <div className="container grid items-center gap-10 pb-10 pt-7 sm:pb-14 sm:pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-20 lg:pt-16">
        <div className="animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[14px] font-semibold text-navy-600 shadow-ring">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden="true" />
            내 보험 무료 점검
          </p>
          <h1
            id="hero-title"
            className="mt-5 text-[32px] font-extrabold leading-[1.25] tracking-[-0.04em] text-navy sm:text-[44px] lg:text-[46px] lg:leading-[1.2] xl:text-[54px]"
          >
            {HERO.titleLines.map((l) => (
              <span key={l} className="block">
                <Highlighted line={l} />
              </span>
            ))}
          </h1>
          <p className="mt-4 text-[19px] font-bold leading-[1.55] tracking-[-0.02em] text-ink sm:text-[22px] lg:mt-6 lg:text-[23px]" data-testid="hero-subtitle">
            {HERO.subLines.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </p>
          <p className="mt-3 max-w-[540px] text-pretty text-[16px] leading-[1.7] text-navy-600 sm:text-[17px] lg:text-[18px]">{HERO.description}</p>

          <div id="hero-cta" className="mt-7 lg:mt-10">
            <ApplyCta source="hero" target="types" size="xl" className="h-[62px] w-full text-[18px] sm:w-auto sm:min-w-[320px]" />
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2.5" aria-label="서비스 특징">
            {HERO.trust.map((t) => (
              <li key={t} className="flex items-center gap-1.5 text-[15px] font-semibold text-navy-600">
                <CheckCircle2 className="h-[18px] w-[18px] text-mint" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* 장식용 목업은 데스크톱에서만 — 모바일은 카피·CTA 다음 바로 통계로 이어진다 */}
        <div className="hidden animate-fade-up [animation-delay:140ms] lg:block">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
