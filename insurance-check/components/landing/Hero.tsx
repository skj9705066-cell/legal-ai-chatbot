import { CheckCircle2 } from "lucide-react";
import { HERO } from "@/lib/content";
import { OfficialLink } from "@/components/site/OfficialLink";
import { ApplyCta } from "./ApplyCta";
import { HeroVisual } from "./HeroVisual";

const TRUST = ["무료 점검 안내", "보험 가입 의무 없음", "공식 조회 서비스 안내"];

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
    <section aria-labelledby="hero-title" className="overflow-hidden bg-white">
      <div className="container grid items-center gap-12 pb-16 pt-10 sm:pt-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:pb-28 lg:pt-20">
        <div className="animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full bg-navy-50 px-3.5 py-1.5 text-[14px] font-semibold text-navy-600">
            <span className="h-1.5 w-1.5 rounded-full bg-blue" aria-hidden="true" />
            보험금 청구 방법 · 공식 조회 안내
          </p>
          <h1
            id="hero-title"
            className="mt-5 text-[34px] font-extrabold leading-[1.26] tracking-[-0.035em] text-navy sm:text-[46px] lg:text-[58px] lg:leading-[1.18]"
          >
            {HERO.titleLines.map((l) => (
              <span key={l} className="block">
                <Highlighted line={l} />
              </span>
            ))}
          </h1>
          <p className="mt-5 text-[17px] leading-[1.7] text-navy-600 sm:text-[19px] lg:mt-6">
            {HERO.subLines.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </p>

          <div id="hero-cta" className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center lg:mt-10">
            <ApplyCta source="hero" size="xl" className="w-full sm:w-auto sm:min-w-[300px]" />
            <OfficialLink className="justify-center rounded-2xl px-4 py-3 text-[16px] font-semibold text-navy-600 underline-offset-4 hover:text-navy hover:underline">
              개인정보 입력 없이 공식 조회하기
            </OfficialLink>
          </div>

          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2.5" aria-label="서비스 특징">
            {TRUST.map((t) => (
              <li key={t} className="flex items-center gap-1.5 text-[15px] font-semibold text-navy-600">
                <CheckCircle2 className="h-[18px] w-[18px] text-mint" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="animate-fade-up [animation-delay:120ms]">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
