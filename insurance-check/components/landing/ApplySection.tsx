import { Ban, MessageSquareText, PhoneCall, Send } from "lucide-react";
import type { PublicConfig } from "@/lib/config";
import { orSetting, isPlaceholder } from "@/lib/display";
import { cn } from "@/lib/utils";
import { ApplyForm } from "./ApplyForm";

const FLOW = [
  { icon: MessageSquareText, title: "신청 접수", body: "이름·연락처·관심 유형만 받아요." },
  { icon: PhoneCall, title: "담당자 연락", body: "남겨주신 번호로 연락해 확인할 사항을 안내해요." },
  { icon: Send, title: "보험사에 직접 청구", body: "청구는 고객님이, 지급 결정은 보험사가 해요." },
];

export function ApplySection({ config }: { config: PublicConfig }) {
  const contact = orSetting(config.operator.contactPhone, "대표 연락처");
  return (
    <section id="apply" aria-labelledby="apply-title" className="scroll-mt-16 bg-navy-50 py-14 sm:py-20 lg:py-24">
      <div className="container grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-x-16 lg:gap-y-10">
        <div className="lg:col-start-1 lg:row-start-1">
          <p className="text-[15px] font-bold text-blue-700">무료 점검 상담 신청</p>
          <h2 id="apply-title" className="mt-2.5 text-balance text-[26px] font-extrabold leading-[1.32] tracking-[-0.03em] text-navy sm:text-[32px] lg:text-[38px]">
            혹시 놓친 보험금이 있는지,
            <br />
            확인할 사항부터 알아보세요.
          </h2>
          <p className="mt-3 text-[16px] leading-[1.65] text-navy-600">필요한 정보를 남겨주시면 점검 상담을 위한 안내를 도와드립니다.</p>
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <ApplyForm config={config} />
        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <ol className="space-y-5">
            {FLOW.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue shadow-card">
                  <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div className="pt-0.5">
                  <p className="text-[17px] font-bold text-navy">
                    <span className="sr-only">{i + 1}단계 </span>
                    {title}
                  </p>
                  <p className="mt-0.5 text-[16px] leading-relaxed text-navy-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 rounded-2xl bg-white p-5 shadow-ring">
            <p className="flex items-center gap-2 text-[16px] font-bold text-navy">
              <Ban className="h-[18px] w-[18px] text-navy-500" aria-hidden="true" />
              신청할 때 받지 않는 정보
            </p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-navy-600">주민등록번호 · 상세 병력 등 건강정보 · 보험증권 원본</p>
          </div>
          <p className="mt-6 text-[16px] text-navy-600">
            전화 문의 <strong className={cn("font-bold text-navy", isPlaceholder(contact) && "font-semibold text-caution")}>{contact}</strong>
            {config.operator.contactHours && <span className="text-navy-600"> · {config.operator.contactHours}</span>}
          </p>
        </div>
      </div>
    </section>
  );
}
