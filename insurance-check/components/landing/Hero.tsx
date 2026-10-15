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
      <div className="container grid items-center gap-10 pb-14 pt-9 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-24 lg:pt-20">
        <div className="animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[14px] font-semibold text-navy-600 shadow-ring">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden="true" />
            내 보험 무료 점검
          </p>
          <h1
            id="hero-title"
            className="mt-5 text-[34px] font-extrabold leading-[1.25] tracking-[-0.04em] text-navy sm:text-[46px] lg:text-[60px] lg:leading-[1.16]"
          >
            {HERO.titleLines.map((l) => (
              <span key={l} className="block">
                <Highlighted line={l} />
              </span>
            ))}
          </h1>
          <p className="mt-5 text-[17px] leading-[1.7] text-navy-600 sm:text-[19px] lg:mt-6 lg:text-[20px]">
            {HERO.subLines.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </p>

          <div id="hero-cta" className="mt-8 lg:mt-10">
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

        {/* 모바일: 목업 상단만 보여 주어 카피·CTA가 먼저 보이게 */}
        <div className="animate-fade-up [animation-delay:140ms] max-lg:max-h-[380px] max-lg:overflow-hidden max-lg:[mask-image:linear-gradient(to_bottom,black_72%,transparent)]">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
