import { HERO } from "@/lib/content";
import { MemoryScene } from "@/components/illustrations/Art";
import { ApplyCta } from "./ApplyCta";

/**
 * 장면 1 — 기억을 떠올리게 하는 질문. 성공 사례가 아니라 "그때 다 확인했나?"를 묻는다.
 * 모바일: 질문 → 보조 질문 → 한 줄 설명 → 일러스트 → CTA가 첫 화면 안에 들어온다. 데스크톱: 왼쪽 카피·CTA, 오른쪽 일러스트.
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
            {HERO.title}
          </h1>
          <p className="mt-2 text-balance text-[21px] font-bold leading-[1.4] tracking-[-0.03em] text-blue sm:text-[26px] lg:mt-3 lg:text-[30px]" data-testid="hero-question">
            {HERO.question}
          </p>
          <p className="mt-2.5 max-w-[520px] text-pretty text-[16px] leading-[1.6] text-navy-600 sm:text-[18px] lg:mt-5" data-testid="hero-subtitle">
            {HERO.description}
          </p>
        </div>

        <div className="mx-auto mt-4 w-full max-w-[380px] animate-fade-up [animation-delay:120ms] sm:max-w-[460px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:max-w-[560px] lg:self-center">
          <MemoryScene />
        </div>

        <div id="hero-cta" className="mt-5 animate-fade-up [animation-delay:200ms] lg:col-start-1 lg:row-start-2 lg:mt-9 lg:self-start">
          <ApplyCta
            source="hero"
            target="types"
            primaryLabel={HERO.cta}
            size="xl"
            className="h-[58px] w-full text-[18px] sm:h-[62px] sm:w-auto sm:min-w-[320px]"
          />
          <p className="mt-2.5 text-center text-[13.5px] leading-relaxed text-navy-600 sm:text-left sm:text-[14px]" data-testid="hero-cta-note">
            {HERO.ctaNote}
          </p>
        </div>
      </div>
    </section>
  );
}
