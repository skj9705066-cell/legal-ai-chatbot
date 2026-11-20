import { CalendarCheck, ClipboardPen, PhoneCall, ShieldCheck, Smartphone } from "lucide-react";
import { VISIT_PROCESS } from "@/lib/content";
import { Reveal } from "@/components/motion/Reveal";
import { ApplyCta } from "./ApplyCta";
import { Section, SectionHeading } from "./Section";

const ICONS = [ClipboardPen, PhoneCall, CalendarCheck, Smartphone];

/** 3. 무료 방문 점검 과정: 신청 → 전화 → 방문 예약 → 함께 확인, (선택) 보장분석은 따로 동의한 분만 */
export function VisitProcess() {
  return (
    <Section id="process" tone="ivory">
      <Reveal>
        <SectionHeading id="process" title={VISIT_PROCESS.title} description={VISIT_PROCESS.description} />
      </Reveal>
      <ol className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {VISIT_PROCESS.steps.map((s, i) => {
          const Icon = ICONS[i];
          return (
            <li key={s.title} className="relative rounded-[24px] bg-white p-6 shadow-card">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest text-[20px] font-extrabold text-white" aria-hidden="true">
                  {i + 1}
                </span>
                <Icon className="h-7 w-7 text-forest-400" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-[22px] font-bold text-charcoal">
                <span className="sr-only">{i + 1}단계: </span>
                {s.title}
              </h3>
              <p className="mt-2 text-[18px] leading-[1.7] text-navy-700">{s.body}</p>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[24px] border-2 border-dashed border-gold bg-gold-100/60 p-6" data-testid="process-optional">
          <p className="text-[21px] font-bold text-charcoal">{VISIT_PROCESS.optional.title}</p>
          <p className="mt-2 text-[18px] leading-[1.7] text-navy-700">{VISIT_PROCESS.optional.body}</p>
        </div>
        <div className="rounded-[24px] bg-forest p-6 text-white" data-testid="process-safety">
          <p className="flex items-center gap-2 text-[21px] font-bold">
            <ShieldCheck className="h-6 w-6 text-gold" aria-hidden="true" />
            안심하세요
          </p>
          <ul className="mt-3 space-y-2">
            {VISIT_PROCESS.safety.map((t) => (
              <li key={t} className="flex gap-2 text-[18px] leading-[1.6]">
                <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div id="process-cta" className="mt-8 flex justify-center">
        <ApplyCta source="process" size="xl" className="h-[64px] w-full text-[20px] sm:w-auto sm:min-w-[360px]" />
      </div>
    </Section>
  );
}
