import { FlaskConical } from "lucide-react";
import type { TrialMode } from "@/lib/types";

/** 실제 운영이 아님을 알리는 띠. 데모: 메모리 저장 / 테스트: 실제 DB에 테스트 신청으로 저장 */
export function DemoBanner({ trial = "demo" }: { trial?: Exclude<TrialMode, null> }) {
  return (
    <div role="note" className="bg-caution-50">
      <p className="container flex items-center gap-2 py-2.5 text-[14px] leading-snug text-caution">
        <FlaskConical className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {trial === "staging" ? (
            <>
              <strong className="font-bold">테스트 모드</strong> · 테스트 데이터만 입력하세요. 실제 개인정보를 입력하지 마세요.
            </>
          ) : (
            <>
              <strong className="font-bold">데모 모드</strong> · 실제로 접수되지 않아요. 실제 개인정보를 입력하지 마세요.
            </>
          )}
        </span>
      </p>
    </div>
  );
}
