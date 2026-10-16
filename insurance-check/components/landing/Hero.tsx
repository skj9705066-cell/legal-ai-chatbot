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
          <p className="text-[15px] font-bold text-blue-700 sm:text-[16px]">{HERO.kicker}</p>
          <h1
            id="hero-title"
            className="mt-3 text-balance text-[32px] font-extrabold leading-[1.25] tracking-[-0.04em] text-navy sm:text-[44px] lg:text-[46px] lg:leading-[1.2] xl:text-[54px]"
          >
            {HERO.titleLines.map((l) => (
              <span key={l} className="block">
                <Highlighted line={l} />
              </span>
            ))}
          </h1>
          <p className="mt-4 text-[18px] font-bold leading-[1.55] tracking-[-0.02em] text-ink sm:text-[21px] lg:mt-6 lg:text-[22px]" data-testid="hero-subtitle">
            {HERO.subLines.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </p>
          <p className="mt-3 max-w-[540px] text-pretty text-[16px] leading-[1.7] text-navy-600 sm:text-[17px]">{HERO.description}</p>

          <div id="hero-cta" className="mt-7 lg:mt-9">
            <ApplyCta source="hero" target="types" size="xl" className="h-[62px] w-full text-[18px] sm:w-auto sm:min-w-[320px]" />
            <p className="mt-3 text-[14px] leading-relaxed text-navy-600" data-testid="hero-cta-note">
              {HERO.ctaNote}
            </p>
          </div>
        </div>

        {/* 장식용 목업은 데스크톱에서만 — 모바일은 카피·CTA 다음 바로 통계로 이어진다 */}
        <div className="hidden animate-fade-up [animation-delay:140ms] lg:block">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
