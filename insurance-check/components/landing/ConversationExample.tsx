import { Headset, Info } from "lucide-react";
import { CONVERSATION_EXAMPLE as C } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";
import { LogoMark } from "@/components/site/Logo";

/**
 * 상담 대화 예시 — 실제 고객 메시지가 아니다. 특정 메신저 화면을 흉내 내지 않고(브랜드 색·로고 없음)
 * 자체 디자인의 말풍선으로 구성하며, 카드 상단에 '예시'를 항상 표시한다.
 * 실제 후기는 RealReviews에서 별도로 다룬다(이 컴포넌트를 실제 후기 용도로 쓰지 말 것).
 */
export function ConversationExample() {
  return (
    <section id="conversation" aria-labelledby="conversation-title" className="bg-navy-50 py-20 sm:py-24 lg:py-32">
      <div className="container grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <Reveal>
          <p className="text-[15px] font-bold text-blue-700">{C.eyebrow}</p>
          <h2 id="conversation-title" className="mt-2.5 text-balance text-[28px] font-extrabold leading-[1.32] tracking-[-0.03em] text-navy sm:text-[34px] lg:text-[40px]">
            {C.title}
          </h2>
          <p className="mt-4 text-pretty text-[17px] leading-[1.7] text-navy-600 lg:text-[18px]">{C.description}</p>
          <p className="mt-6 flex gap-2 rounded-2xl bg-white p-4 text-[15px] leading-relaxed text-navy-700 ring-1 ring-navy-100" data-testid="conversation-note">
            <Info className="mt-0.5 h-[18px] w-[18px] shrink-0 text-blue" aria-hidden="true" />
            {C.note}
          </p>
        </Reveal>

        <Reveal delay={120}>
          <figure className="mx-auto w-full max-w-[520px] overflow-hidden rounded-[28px] bg-white shadow-lift ring-1 ring-navy-100" data-testid="conversation-example">
            {/* 예시 표시 — 실제 대화로 오인하지 않게 항상 노출 */}
            <figcaption className="flex items-center justify-center gap-1.5 bg-caution-50 px-4 py-2.5 text-[14px] font-bold text-caution">
              <Info className="h-4 w-4" aria-hidden="true" />
              {C.label}
            </figcaption>
            <div className="flex items-center gap-3 border-b border-navy-100 px-5 py-4">
              <LogoMark className="h-9 w-9 rounded-xl" />
              <div>
                <p className="text-[16px] font-bold text-navy">내보험 통합 점검 상담</p>
                <p className="text-[13px] text-navy-500">예시 화면</p>
              </div>
            </div>
            <ol className="space-y-4 bg-[linear-gradient(180deg,#F3F7FC_0%,#EEF3FA_100%)] px-4 py-6 sm:px-6 sm:py-7" aria-label="예시 대화">
              {C.messages.map((m, i) => {
                const mine = m.from === "customer";
                return (
                  <Reveal as="li" key={i} delay={200 + i * 260} className={cn("flex items-end gap-2.5", mine ? "justify-end" : "justify-start")}>
                    {!mine && (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full bg-navy text-white" aria-hidden="true">
                        <Headset className="h-[18px] w-[18px]" />
                      </span>
                    )}
                    <div className={cn("max-w-[80%]", mine && "text-right")}>
                      {!mine && <p className="mb-1 text-[13px] font-semibold text-navy-600">상담사 (예시)</p>}
                      <p
                        className={cn(
                          "inline-block text-left text-[16px] leading-[1.6] shadow-sm",
                          mine
                            ? "rounded-[20px] rounded-br-md bg-blue px-4 py-3 text-white"
                            : "rounded-[20px] rounded-tl-md bg-white px-4 py-3 text-ink ring-1 ring-navy-100",
                        )}
                      >
                        <span className="sr-only">{mine ? "고객(예시): " : "상담사(예시): "}</span>
                        {m.text}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </ol>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
