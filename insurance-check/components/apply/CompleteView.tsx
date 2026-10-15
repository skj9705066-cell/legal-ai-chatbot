"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, Layers, RefreshCcw, ShieldPlus } from "lucide-react";
import { SERVICE_CONTENT } from "@/lib/content";
import { saveReceipt, track, trackOnce } from "@/lib/analytics";
import { Button, buttonVariants } from "@/components/ui/button";
import { useReceipt } from "./useReceipt";
import { LoadingView, MissingReceiptView, RefNo } from "./StateViews";

const COVERAGE_POINTS = [
  { icon: Layers, label: "중복 보장" },
  { icon: ShieldPlus, label: "부족한 보장" },
  { icon: RefreshCcw, label: "갱신 조건" },
];

/** 8. 신청 완료 + 9. 보장 분석 별도 제안 (신청 완료 후에만 노출) */
export function CompleteView() {
  const router = useRouter();
  const [receipt] = useReceipt();
  const offer = receipt && receipt.coverage === "offered" && receipt.receiptToken;

  useEffect(() => {
    if (offer) trackOnce("coverage_offer_view", { serviceType: receipt.serviceType }, `:${receipt.refNo}`);
  }, [offer, receipt]);

  if (receipt === undefined) return <LoadingView />;
  if (receipt === null) return <MissingReceiptView />;

  const decline = () => {
    track("coverage_decline", { serviceType: receipt.serviceType });
    // 영업 DB로 넘기지 않는다: 서버 호출 없음 + 이 탭의 추가 신청 토큰 폐기
    saveReceipt({ ...receipt, receiptToken: null, coverage: "declined" });
    router.push("/apply/done");
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="done-title" className="rounded-3xl border border-navy-200/80 bg-white p-6 text-center shadow-card sm:p-10">
        <CheckCircle2 className="mx-auto h-14 w-14 text-mint" aria-hidden="true" />
        <h1 id="done-title" className="mt-4 text-[24px] font-extrabold text-navy sm:text-[28px]">
          보험금 점검 신청이 접수되었습니다
        </h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-navy-600">
          {SERVICE_CONTENT[receipt.serviceType].title} 신청이 접수되었습니다.
          <br className="hidden sm:block" /> 선택하신 희망 시간에 담당자가 연락드립니다.
        </p>
        <RefNo refNo={receipt.refNo} demo={receipt.demo} />
        <ul className="mx-auto mt-6 max-w-md space-y-2 text-left text-[14px] leading-relaxed text-navy-600">
          <li className="flex gap-2">
            <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-navy-400" aria-hidden="true" />
            진료비 영수증·세부내역서 등 가지고 계신 자료를 미리 준비해 두시면 상담이 빨라집니다.
          </li>
          <li className="flex gap-2">
            <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-navy-400" aria-hidden="true" />
            보험금 지급 여부는 보험사의 약관과 심사에 따라 결정됩니다.
          </li>
        </ul>
      </section>

      {offer ? (
        <section aria-labelledby="offer-title" className="rounded-3xl border border-blue-100 bg-white p-6 shadow-card sm:p-8">
          <p className="text-[13px] font-bold text-blue">선택 사항</p>
          <h2 id="offer-title" className="mt-1.5 text-[20px] font-extrabold leading-snug text-navy sm:text-[22px]">
            현재 가입하신 보험, 보장도 함께 확인해 보시겠어요?
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-navy-600">
            기존 보험의 중복 보장, 부족한 보장, 갱신 조건 등을 별도로 점검해 드립니다. 추가 상담은 선택사항이며 보험 가입 의무는 없습니다.
          </p>
          <ul className="mt-5 grid grid-cols-3 gap-2">
            {COVERAGE_POINTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex flex-col items-center gap-1.5 rounded-xl bg-blue-50 px-2 py-3 text-[13px] font-semibold text-navy-700">
                <Icon className="h-5 w-5 text-blue" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link href="/apply/coverage" className={buttonVariants({ size: "lg", className: "w-full" })}>
              무료 보장 분석 상담 신청
            </Link>
            <Button variant="outline" size="lg" className="w-full" onClick={decline}>
              보험금 점검만 이용할게요
            </Button>
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-navy-500">
            보장 분석 상담을 신청해도 보험 계약이나 보험금·환급금 지급을 보장하지 않습니다. 신청하지 않아도 보험금 점검 안내는 그대로 진행됩니다.
          </p>
        </section>
      ) : (
        <div className="text-center">
          <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
            처음 화면으로
          </Link>
        </div>
      )}
    </div>
  );
}
