import Link from "next/link";
import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function LoadingView() {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-24 text-navy-500">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      확인 중입니다…
    </div>
  );
}

export function MissingReceiptView() {
  return (
    <div className="rounded-3xl border border-navy-200/80 bg-white p-8 text-center shadow-card">
      <h1 className="text-[22px] font-extrabold text-navy">신청 정보를 찾을 수 없습니다</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-navy-600">
        이 화면은 신청 직후 같은 브라우저 창에서만 볼 수 있습니다. 이미 신청하셨다면 희망 시간에 연락드립니다.
      </p>
      <Link href="/#apply" className={buttonVariants({ size: "lg", className: "mt-6" })}>
        처음 화면으로
      </Link>
    </div>
  );
}

export function RefNo({ refNo, demo }: { refNo: string; demo: boolean }) {
  return (
    <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-xl bg-navy-50 px-4 py-2.5 text-[14px]">
      <span className="text-navy-500">신청번호</span>
      <strong className="font-mono font-bold tracking-wide text-navy">{refNo}</strong>
      {demo && <span className="rounded-full bg-caution-50 px-2 py-0.5 text-xs font-bold text-caution">데모</span>}
    </div>
  );
}
