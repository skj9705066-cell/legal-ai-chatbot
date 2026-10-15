import { Ban, Clock3, MessageSquareText, PhoneCall } from "lucide-react";
import type { PublicConfig } from "@/lib/config";
import { orSetting, isPlaceholder } from "@/lib/display";
import { cn } from "@/lib/utils";
import { ApplyForm } from "./ApplyForm";

const FLOW = [
  { icon: MessageSquareText, title: "신청 접수", body: "이름·연락처·희망 시간만 받습니다." },
  { icon: PhoneCall, title: "상담 연락", body: "희망 시간에 담당 설계사가 연락해 확인 방법을 안내합니다." },
  { icon: Clock3, title: "고객이 직접 청구", body: "보험사에 본인이 청구하고, 지급은 보험사가 결정합니다." },
];

export function ApplySection({ config }: { config: PublicConfig }) {
  const contact = orSetting(config.operator.contactPhone, "대표 연락처");
  return (
    <section id="apply" aria-labelledby="apply-title" className="scroll-mt-16 bg-gradient-to-b from-white to-blue-50/60 py-16 sm:py-20 lg:py-24">
      <div className="container grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div>
          <p className="text-[13.5px] font-bold tracking-wide text-blue">상담 신청</p>
          <h2 id="apply-title" className="mt-2 text-balance text-[24px] font-extrabold leading-snug tracking-[-0.015em] text-navy sm:text-[30px] lg:text-[34px]">
            필요한 정보만 받고,
            <br />
            확인 방법을 안내해 드립니다
          </h2>
          <ol className="mt-8 space-y-5">
            {FLOW.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue shadow-card">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[16px] font-bold text-navy">
                    <span className="sr-only">{i + 1}단계 </span>
                    {title}
                  </p>
                  <p className="mt-0.5 text-[14.5px] leading-relaxed text-navy-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 rounded-2xl border border-navy-200/80 bg-white p-5">
            <p className="flex items-center gap-2 text-[14.5px] font-bold text-navy">
              <Ban className="h-4 w-4 text-navy-400" aria-hidden="true" />
              신청 단계에서 받지 않는 정보
            </p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-navy-600">주민등록번호 · 상세 병력 등 건강정보 · 보험증권 원본</p>
          </div>
          <p className="mt-5 text-[14px] text-navy-600">
            전화 문의 <strong className={cn("font-bold text-navy", isPlaceholder(contact) && "text-caution")}>{contact}</strong>
            {config.operator.contactHours && <span className="text-navy-500"> ({config.operator.contactHours})</span>}
          </p>
        </div>
        <ApplyForm config={config} />
      </div>
    </section>
  );
}
