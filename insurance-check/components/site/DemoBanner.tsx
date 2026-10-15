import { FlaskConical } from "lucide-react";

export function DemoBanner() {
  return (
    <div role="note" className="bg-caution-50">
      <p className="container flex items-center gap-2 py-2.5 text-[14px] leading-snug text-caution">
        <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-bold">데모 모드</strong> · 실제로 접수되지 않아요. 실제 개인정보를 입력하지 마세요.
        </span>
      </p>
    </div>
  );
}
