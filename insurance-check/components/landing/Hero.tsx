import { Check } from "lucide-react";
import { HERO } from "@/lib/content";
import { HeroArt } from "@/components/illustrations/WarmArt";
import { ApplyCta, CallButton } from "./ApplyCta";

/**
 * 1. 메인 후킹 메시지. 첫 화면(360×740)에 제목·설명·신청 버튼이 모두 들어온다.
 * 강조는 '찾지 못한 돈' 한 곳(골드 밑줄). 불안·압박 문구 없이 무료·조건 없음·안전을 먼저 알린다.
 */
export function Hero({ contactPhone }: { contactPhone: string | null }) {
  const t = HERO.title;
  return (
    <section id="hero" aria-labelledby="hero-title" className="overflow-hidden bg-ivory">
      <div className="container grid items-center gap-8 pb-12 pt-7 sm:pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:pb-20 lg:pt-16">
        <div className="min-w-0">
          <p className="inline-flex items-center rounded-full bg-sage px-4 py-2 text-[16px] font-bold text-forest-700 sm:text-[17px]">{HERO.eyebrow}</p>
          <h1 id="hero-title" className="mt-5 text-[34px] font-extrabold leading-[1.3] tracking-[-0.03em] text-charcoal sm:text-[46px] lg:text-[56px]">
            {t.pre}
            <br />
            <span className="relative whitespace-nowrap">
              <span className="relative z-10 text-forest">{t.highlight}</span>
              <span aria-hidden="true" className="absolute inset-x-0 bottom-[0.08em] z-0 h-[0.32em] rounded-full bg-gold/55" />
            </span>
            {t.post}
            <br />
            {t.last}
          </h1>
          <p className="mt-5 text-pretty text-[19px] font-semibold leading-[1.65] text-charcoal sm:text-[21px]">{HERO.sub}</p>
          <p className="mt-1.5 text-pretty text-[18px] leading-[1.65] text-navy-600 sm:text-[20px]">{HERO.description}</p>

          <div id="hero-cta" className="mt-7 flex flex-col gap-3 sm:max-w-[460px]">
            <ApplyCta source="hero" size="xl" className="h-[64px] w-full text-[20px]" />
            {contactPhone && <CallButton phone={contactPhone} label={HERO.callLabel} className="h-[60px] w-full text-[18px]" />}
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2.5" aria-label="안내">
            {HERO.trust.map((t) => (
              <li key={t} className="flex items-center gap-2 text-[17px] font-semibold text-charcoal">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest text-white">
                  <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                </span>
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[15px] leading-relaxed text-navy-600">{HERO.ctaNote}</p>
        </div>
        <HeroArt className="mx-auto w-full max-w-[340px] sm:max-w-[420px] lg:max-w-[480px]" />
      </div>
    </section>
  );
}
