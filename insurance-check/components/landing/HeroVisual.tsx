import { Check, ChevronRight, HandCoins, Hospital, SearchCheck, ShieldCheck, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/site/Logo";

/**
 * 히어로 비주얼: '보험금 점검' 앱 화면을 담은 스마트폰 목업 (CSS로 구성).
 * 조회 결과처럼 보이는 금액·개인정보·보험사 로고·인증 마크는 넣지 않는다. 장식이므로 보조기기에서는 숨긴다.
 */
const ITEMS = [
  { icon: Hospital, title: "미청구 보험금", sub: "청구 방법 안내" },
  { icon: SearchCheck, title: "숨은 보험금", sub: "공식 조회 방법 안내" },
  { icon: HandCoins, title: "과오납 보험료", sub: "반환 가능 여부 안내" },
];

const STEPS = [
  { label: "유형 선택", state: "done" },
  { label: "정보 입력", state: "done" },
  { label: "상담 연결", state: "current" },
  { label: "청구 안내", state: "todo" },
] as const;

export function HeroVisual() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[560px] select-none py-6">
      {/* 은은한 배경 원 */}
      <div className="absolute left-1/2 top-1/2 h-[88%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(8,102,245,0.14),rgba(8,102,245,0)_68%)]" />
      <div className="absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-100" />

      {/* 스마트폰 */}
      <div className="relative mx-auto w-[248px] rounded-[44px] bg-deep p-[9px] shadow-[0_40px_80px_-30px_rgba(11,36,69,0.55)] ring-1 ring-black/5 sm:w-[290px] lg:w-[300px]">
        <div className="relative overflow-hidden rounded-[36px] bg-navy-50">
          <div className="absolute left-1/2 top-2.5 z-10 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-deep" />
          <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[12px] font-semibold text-navy">
            <span>9:41</span>
            <span className="flex gap-1">
              <span className="h-2 w-3.5 rounded-sm bg-navy/70" />
              <span className="h-2 w-2 rounded-full bg-navy/70" />
            </span>
          </div>

          <div className="px-4 pb-5 pt-5">
            <div className="flex items-center gap-2">
              <LogoMark className="h-7 w-7" />
              <p className="text-[18px] font-extrabold tracking-[-0.02em] text-navy">보험금 점검</p>
            </div>

            {/* 진행 상태 */}
            <div className="mt-4 rounded-2xl bg-white p-3.5 shadow-card">
              <p className="text-[12px] font-bold text-navy-600">점검 신청 진행 상태</p>
              <ol className="mt-3 grid grid-cols-4 gap-1">
                {STEPS.map((s, i) => (
                  <li key={s.label} className="relative flex flex-col items-center gap-1.5">
                    {i > 0 && (
                      <span className={`absolute right-1/2 top-[11px] h-[2px] w-full ${s.state === "todo" ? "bg-navy-100" : "bg-blue"}`} />
                    )}
                    <span
                      className={`relative z-[1] flex h-6 w-6 items-center justify-center rounded-full ${
                        s.state === "done"
                          ? "bg-blue text-white"
                          : s.state === "current"
                            ? "bg-white text-blue ring-2 ring-blue"
                            : "bg-navy-100 text-navy-400"
                      }`}
                    >
                      {s.state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className={`h-2 w-2 rounded-full ${s.state === "current" ? "animate-pulse bg-blue" : "bg-navy-300"}`} />}
                    </span>
                    <span className={`whitespace-nowrap text-[11px] font-semibold ${s.state === "todo" ? "text-navy-500" : "text-navy"}`}>{s.label}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* 점검 항목 */}
            <div className="mt-3 rounded-2xl bg-white p-1.5 shadow-card">
              {ITEMS.map(({ icon: Icon, title, sub }, i) => (
                <div key={title} className={`flex items-center gap-3 px-2.5 py-2.5 ${i > 0 ? "border-t border-navy-100" : ""}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold leading-tight text-navy">{title}</span>
                    <span className="mt-0.5 block text-[12px] text-navy-500">{sub}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-navy-300" />
                </div>
              ))}
            </div>

            <div className="mt-3 flex h-11 items-center justify-center rounded-xl bg-blue text-[14px] font-bold text-white">무료 점검 상담 신청</div>
          </div>
        </div>
      </div>

      {/* 떠 있는 안내 카드 (데스크톱) */}
      <div className="absolute right-0 top-0 hidden items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-lift ring-1 ring-navy-100 sm:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint-50 text-mint-700">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[14px] font-bold text-navy">보험 가입 의무 없음</span>
          <span className="block text-[13px] text-navy-500">점검 안내는 무료</span>
        </span>
      </div>
      <div className="absolute bottom-0 left-0 hidden items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-lift ring-1 ring-navy-100 sm:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue">
          <Sparkles className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[14px] font-bold text-navy">필요한 정보만</span>
          <span className="block text-[13px] text-navy-500">이름 · 연락처 · 점검 유형</span>
        </span>
      </div>
    </div>
  );
}
