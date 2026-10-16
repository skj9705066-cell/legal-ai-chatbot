import { HERO } from "@/lib/content";
import { MemoryScene } from "@/components/illustrations/Art";
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
 * 첫 화면: "보험료는 꼬박꼬박 내는데, / 보험금은 모두 확인하셨나요?" — 강조는 '보험금' 한 단어만.
 * PC(lg↑)는 줄마다 줄바꿈 금지 + 열 너비에 맞춘 글자 크기로 정확히 2줄. 모바일은 원래 크기로 자연스럽게 줄바꿈.
 * 모바일: 제목(3~4줄) → 한 줄 보조 문구 → 설명 → 일러스트 → CTA가 첫 화면 안에 들어온다. 데스크톱: 왼쪽 카피·CTA, 오른쪽 일러스트.
 * CTA는 바로 신청 폼(1단계: 점검 유형)으로 간다.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-gradient-to-b from-white via-white to-navy-50">
      <div className="container grid gap-x-12 pb-8 pt-6 sm:pb-12 sm:pt-10 lg:grid-cols-[1fr_1fr] lg:grid-rows-[auto_auto] lg:pb-16 lg:pt-14">
        <div className="animate-fade-up lg:col-start-1 lg:row-start-1 lg:self-end">
          <h1
            id="hero-title"
            className="text-balance text-[28px] font-extrabold leading-[1.28] tracking-[-0.04em] text-navy min-[400px]:text-[30px] sm:text-[40px] lg:leading-[1.22] lg:[font-size:clamp(36px,3.6vw,52px)]"
          >
            {HERO.titleLines.map((l) => (
              <span key={l} className="block lg:whitespace-nowrap">
                <Highlighted line={l} />
              </span>
            ))}
          </h1>
          <p className="mt-3 text-[17px] font-semibold leading-[1.5] tracking-[-0.02em] text-ink sm:text-[19px] lg:mt-5 lg:text-[20px]" data-testid="hero-sub">
            {HERO.sub}
          </p>
          <p className="mt-1 text-pretty text-[15.5px] leading-[1.6] text-navy-600 sm:text-[17px]" data-testid="hero-subtitle">
            {HERO.description}
          </p>
        </div>

        <div className="mx-auto mt-3 w-full max-w-[340px] animate-fade-up [animation-delay:120ms] sm:max-w-[460px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:max-w-[560px] lg:self-center">
          <MemoryScene />
        </div>

        <div id="hero-cta" className="mt-4 animate-fade-up [animation-delay:200ms] lg:col-start-1 lg:row-start-2 lg:mt-9 lg:self-start">
          <ApplyCta source="hero" size="xl" className="h-[58px] w-full text-[18px] sm:h-[62px] sm:w-auto sm:min-w-[320px]" />
          <p className="mt-2.5 text-center text-[13px] leading-relaxed text-navy-600 sm:text-left sm:text-[14px]" data-testid="hero-cta-note">
            {HERO.ctaNote}
          </p>
        </div>
      </div>
    </section>
  );
}
