import { Check } from "lucide-react";
import { PROCESS } from "@/lib/content";
import { StepArt, type StepArtKind } from "@/components/illustrations/Art";
import type { PublicConfig } from "@/lib/config";
import { ApplyForm } from "./ApplyForm";

const ASSURE = ["이름·연락처만", "주민번호·병력 안 받아요", "가입 의무 없음"];

/** 신청 — 제목 + 한 줄 설명 + 폼 하나. 모바일에서는 폼을 카드로 감싸지 않고 입력에만 집중시킨다. */
export function ApplySection({ config }: { config: PublicConfig }) {
  return (
    <section id="apply" aria-labelledby="apply-title" className="scroll-mt-16 bg-navy-50 py-12 sm:py-20 lg:py-24">
      <div className="container grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-x-16">
        <div className="lg:pt-6">
          <h2 id="apply-title" className="text-balance text-[26px] font-extrabold leading-[1.32] tracking-[-0.03em] text-navy sm:text-[32px] lg:text-[40px]">
            이제 내 보험도 확인해 볼까요?
          </h2>
          <p className="mt-2.5 text-[16px] leading-[1.6] text-navy-600 sm:text-[17px]">필요한 정보만 남기고 무료 상담을 신청하세요.</p>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="신청 안내">
            {ASSURE.map((t) => (
              <li key={t} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[13.5px] font-semibold text-navy ring-1 ring-navy-100">
                <Check className="h-3.5 w-3.5 text-mint-700" strokeWidth={3} aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
          {/* 데스크톱 왼쪽 여백: 신청 후 흐름을 그림으로 */}
          <ol className="mt-10 hidden space-y-5 lg:block" aria-label="신청 후 진행">
            {PROCESS.steps.map((st) => (
              <li key={st.title} className="flex items-center gap-4">
                <StepArt kind={st.art as StepArtKind} idPrefix="apply-step" className="h-14 w-14 shrink-0" />
                <div>
                  <p className="text-[18px] font-bold text-navy">{st.title}</p>
                  <p className="text-[15px] text-navy-600">{st.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <ApplyForm config={config} />
      </div>
    </section>
  );
}
