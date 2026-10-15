import { CheckCircle2, HandCoins, Hospital, Lock, SearchCheck, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/site/Logo";

/**
 * 히어로 비주얼: '내 보험 점검' 화면을 연상시키는 UI 일러스트.
 * 금액·개인정보·보험사 로고·인증 마크를 넣지 않는다(오인 방지). 장식이므로 보조기기에서는 숨긴다.
 */
const ROWS = [
  { icon: Hospital, title: "미청구 보험금", status: "청구 방법 안내", tone: "mint" },
  { icon: SearchCheck, title: "숨은 보험금", status: "공식 조회 연결", tone: "blue" },
  { icon: HandCoins, title: "과오납·환급금", status: "확인 방법 안내", tone: "navy" },
] as const;

const TONE = {
  mint: "bg-mint-50 text-mint-700",
  blue: "bg-blue-50 text-blue-700",
  navy: "bg-navy-100 text-navy-700",
};

export function HeroVisual() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[480px] select-none">
      <div className="relative overflow-hidden rounded-[32px] bg-navy-50 px-5 pb-8 pt-10 sm:px-8 sm:pb-12 sm:pt-14">
        <svg className="absolute -right-24 -top-24 h-[360px] w-[360px] text-navy-100" viewBox="0 0 360 360" fill="none">
          <circle cx="180" cy="180" r="179" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="180" cy="180" r="130" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="180" cy="180" r="80" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        <div className="relative mx-auto max-w-[360px] rounded-[28px] bg-white p-5 shadow-lift ring-1 ring-navy-100 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-9 w-9" />
              <div>
                <p className="text-[17px] font-bold leading-tight text-navy">내 보험 점검</p>
                <p className="text-[14px] text-navy-500">3가지 항목을 확인해요</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-1.5">
            <span className="h-1.5 flex-1 rounded-full bg-blue" />
            <span className="h-1.5 flex-1 rounded-full bg-blue" />
            <span className="h-1.5 flex-1 rounded-full bg-navy-100" />
          </div>

          <ul className="mt-5 space-y-2.5">
            {ROWS.map(({ icon: Icon, title, status, tone }) => (
              <li key={title} className="flex items-center gap-3 rounded-2xl border border-navy-100 px-3.5 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{title}</span>
                <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold min-[400px]:inline ${TONE[tone]}`}>{status}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex h-12 items-center justify-center rounded-2xl bg-blue text-[16px] font-semibold text-white">점검 시작하기</div>
        </div>

        <div className="absolute right-3 top-4 hidden items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-lift ring-1 ring-navy-100 sm:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-50 text-navy">
            <Lock className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[14px] font-bold text-navy">필요한 정보만</span>
            <span className="block text-[13px] text-navy-500">이름·연락처·희망 시간</span>
          </span>
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-lift ring-1 ring-navy-100 sm:bottom-5 sm:left-5">
          <ShieldCheck className="h-5 w-5 text-mint" />
          <span className="text-[14px] font-bold text-navy">보험 가입 의무 없음</span>
          <CheckCircle2 className="hidden h-4 w-4 text-mint sm:block" />
        </div>
      </div>
    </div>
  );
}
