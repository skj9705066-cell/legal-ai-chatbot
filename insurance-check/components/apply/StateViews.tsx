import Link from "next/link";
import { Loader2, SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function LoadingView() {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-24 text-[16px] text-navy-500">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      확인 중입니다…
    </div>
  );
}

export function MissingReceiptView() {
  return (
    <div className="rounded-[28px] bg-white p-8 text-center shadow-card sm:p-10">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy-500">
        <SearchX className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-[24px] font-bold tracking-[-0.025em] text-navy">신청 정보를 찾을 수 없습니다</h1>
      <p className="mt-3 text-[16px] leading-relaxed text-navy-600">
        이 화면은 신청 직후 같은 브라우저 창에서만 볼 수 있어요. 이미 신청하셨다면 남겨주신 번호로 연락드립니다.
      </p>
      <Link href="/#apply" className={buttonVariants({ size: "lg", className: "mt-7 w-full sm:w-auto" })}>
        처음 화면으로
      </Link>
    </div>
  );
}

export function RefNo({ refNo, demo }: { refNo: string; demo: boolean }) {
  return (
    <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-navy-50 px-4 py-3 text-[15px]">
      <span className="text-navy-600">신청번호</span>
      <strong className="font-mono text-[16px] font-bold tracking-wide text-navy">{refNo}</strong>
      {demo && <span className="rounded-full bg-caution-50 px-2 py-0.5 text-[13px] font-bold text-caution">데모</span>}
    </div>
  );
}

export function SuccessMark({ tone = "mint" }: { tone?: "mint" | "blue" }) {
  return (
    <span
      aria-hidden="true"
      className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${tone === "mint" ? "bg-mint-50 text-mint" : "bg-blue-50 text-blue"}`}
    >
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}
