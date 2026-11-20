import { CreditCard, FileClock, Info, Receipt } from "lucide-react";
import { HIDDEN_STAT, MONEY, STATS_DISCLAIMER, STATS_SOURCE } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { ApplyCta } from "./ApplyCta";
import { Section, SectionHeading } from "./Section";

const ICON = { card_points: CreditCard, unclaimed: Receipt, hidden: FileClock } as const;

/**
 * 2. 카드포인트 및 미청구 보험금 안내. 카드 = 아이콘 + 제목 + 쉬운 설명 한두 줄 + 그 항목으로 신청.
 * 숫자는 출처가 확인된 공식 통계 하나만(숨은보험금 잔액), 출처·전국 집계·개인 환급 아님을 함께 보여 준다.
 */
export function MoneySection() {
  return (
    <Section id="money" tone="sage">
      <Reveal>
        <SectionHeading id="money" title={MONEY.title} description={MONEY.description} />
      </Reveal>
      <ul className="mt-9 grid gap-5 lg:grid-cols-3">
        {MONEY.items.map((m) => {
          const Icon = ICON[m.id as keyof typeof ICON];
          return (
            <li key={m.id} className="flex flex-col rounded-[24px] bg-white p-6 shadow-card sm:p-7" data-testid={`money-${m.id}`}>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage text-forest" aria-hidden="true">
                <Icon className="h-7 w-7" strokeWidth={2} />
              </span>
              <h3 className="mt-5 text-[23px] font-bold leading-snug tracking-[-0.02em] text-charcoal">{m.title}</h3>
              <p className="mt-2.5 text-[18px] leading-[1.7] text-navy-700">{m.body}</p>
              {m.note && <p className="mt-3 rounded-xl bg-gold-100 px-3.5 py-2.5 text-[16px] font-medium leading-snug text-gold-700">{m.note}</p>}
              {m.id === "hidden" && (
                <div className="mt-3 rounded-xl bg-ivory px-4 py-3" data-testid="hidden-stat">
                  <p className="text-[15px] text-navy-600">
                    {HIDDEN_STAT.basis} {HIDDEN_STAT.label}
                  </p>
                  <p className="mt-0.5 text-[24px] font-extrabold tracking-[-0.02em] text-forest">{HIDDEN_STAT.text}</p>
                  <p className="mt-1 text-[14px] leading-snug text-navy-600">
                    출처:{" "}
                    <a href={STATS_SOURCE.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                      {STATS_SOURCE.label}
                      <span className="sr-only">(새 창에서 열림)</span>
                    </a>{" "}
                    · {STATS_DISCLAIMER}
                  </p>
                </div>
              )}
              <div className="mt-auto pt-6">
                <ApplyCta source="money" interest={m.id} variant="soft" size="lg" className="w-full text-[18px]">
                  {MONEY.cardCta}
                </ApplyCta>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 flex gap-2 text-[15px] leading-relaxed text-navy-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {MONEY.footnote}
      </p>
    </Section>
  );
}
