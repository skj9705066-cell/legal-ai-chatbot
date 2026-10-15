import { FlaskConical } from "lucide-react";

export function DemoBanner() {
  return (
    <div role="note" className="border-b border-caution-200 bg-caution-50">
      <p className="container flex items-start gap-2 py-2.5 text-[13px] leading-snug text-caution sm:items-center">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" aria-hidden="true" />
        <span>
          <strong className="font-bold">데모 모드</strong> · 실제로 접수되지 않으며 상담 연락이 가지 않습니다. 실제 개인정보를 입력하지
          마세요.
        </span>
      </p>
    </div>
  );
}
