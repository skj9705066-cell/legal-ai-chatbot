import { HERO } from "@/lib/content";
import { HeroScene } from "@/components/illustrations/Art";
import { ApplyCta } from "./ApplyCta";

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

/**
 * 첫 화면: 제목 2줄 → 3D 스마트폰 장면 → CTA. 모바일 한 화면 안에 셋이 모두 들어오도록 장면 높이를 제한한다.
 * 데스크톱은 왼쪽 카피·CTA, 오른쪽 장면.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-gradient-to-b from-white via-white to-navy-50">
      <div className="container grid gap-x-12 pb-8 pt-6 sm:pb-12 sm:pt-10 lg:grid-cols-[1fr_1fr] lg:grid-rows-[auto_auto] lg:pb-16 lg:pt-14">
        <div className="animate-fade-up lg:col-start-1 lg:row-start-1 lg:self-end">
          <h1
            id="hero-title"
            className="text-balance text-[31px] font-extrabold leading-[1.24] tracking-[-0.04em] text-navy min-[400px]:text-[33px] sm:text-[44px] lg:text-[50px] lg:leading-[1.18] xl:text-[56px]"
          >
            {HERO.titleLines.map((l) => (
              <span key={l} className="block">
                <Highlighted line={l} />
              </span>
            ))}
          </h1>
          <p className="mt-3 text-[17px] font-medium leading-[1.55] tracking-[-0.015em] text-navy-600 sm:text-[19px] lg:mt-5 lg:text-[21px]" data-testid="hero-subtitle">
            {HERO.subLines.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </p>
        </div>

        <div className="mx-auto mt-4 w-full max-w-[380px] animate-fade-up [animation-delay:120ms] sm:max-w-[460px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:max-w-[560px] lg:self-center">
          <HeroScene />
        </div>

        <div id="hero-cta" className="mt-5 animate-fade-up [animation-delay:200ms] lg:col-start-1 lg:row-start-2 lg:mt-9 lg:self-start">
          <ApplyCta source="hero" target="types" size="xl" className="h-[58px] w-full text-[18px] sm:h-[62px] sm:w-auto sm:min-w-[320px]" />
          <p className="mt-2.5 text-center text-[13.5px] leading-relaxed text-navy-600 sm:text-left sm:text-[14px]" data-testid="hero-cta-note">
            {HERO.ctaNote}
          </p>
        </div>
      </div>
    </section>
  );
}
