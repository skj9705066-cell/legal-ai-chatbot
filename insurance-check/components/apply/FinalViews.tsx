"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { OfficialLink } from "@/components/site/OfficialLink";
import { useReceipt } from "./useReceipt";
import { LoadingView, MissingReceiptView, RefNo, SuccessMark } from "./StateViews";

export function CoverageDoneView() {
  const [receipt] = useReceipt();
  if (receipt === undefined) return <LoadingView />;
  if (receipt === null || receipt.coverage !== "opted_in") return <MissingReceiptView />;
  return (
    <section aria-labelledby="cov-done" className="rounded-[28px] bg-white px-6 py-9 text-center shadow-card sm:px-10 sm:py-11">
      <SuccessMark tone="blue" />
      <h1 id="cov-done" className="mt-5 text-balance text-[26px] font-bold leading-snug tracking-[-0.03em] text-navy sm:text-[30px]">
        보장 분석 상담도 함께 신청되었습니다
      </h1>
      <p className="mt-3 text-[16px] leading-relaxed text-navy-600 sm:text-[17px]">
        보험금 점검 안내와 보장 분석 상담은 각각 진행돼요. 선택하신 방법과 시간에 담당 설계사가 연락드립니다.
      </p>
      <RefNo refNo={receipt.refNo} demo={receipt.demo} />
      <div className="mt-7 rounded-2xl bg-navy-50 p-5 text-left text-[15px] leading-relaxed text-navy-600">
        상담 후 보험 가입 의무는 없으며, 계약이나 환급을 보장하지 않습니다. 보장 분석 동의는 언제든{" "}
        <Link href="/privacy/withdraw" className="font-semibold text-blue-700 underline underline-offset-2">
          철회
        </Link>
        할 수 있고, 철회하면 바로 연락 대상에서 빠져요.
      </div>
      <Link href="/" className={buttonVariants({ variant: "outline", size: "lg", className: "mt-7 w-full sm:w-auto" })}>
        처음 화면으로
      </Link>
    </section>
  );
}

export function ClaimOnlyDoneView() {
  const [receipt] = useReceipt();
  if (receipt === undefined) return <LoadingView />;
  if (receipt === null) return <MissingReceiptView />;
  return (
    <section aria-labelledby="claim-done" className="rounded-[28px] bg-white px-6 py-9 text-center shadow-card sm:px-10 sm:py-11">
      <SuccessMark />
      <h1 id="claim-done" className="mt-5 text-balance text-[26px] font-bold leading-snug tracking-[-0.03em] text-navy sm:text-[30px]">
        보험금 점검 안내만 진행합니다
      </h1>
      <p className="mt-3 text-[16px] leading-relaxed text-navy-600 sm:text-[17px]">
        보장 분석이나 보험 상품 안내 연락은 드리지 않아요. 희망하신 시간에 보험금 점검 안내 연락만 드립니다.
      </p>
      <RefNo refNo={receipt.refNo} demo={receipt.demo} />
      <div className="mt-8 flex flex-col items-center gap-3">
        <OfficialLink className="text-[16px] font-semibold text-blue-700 underline-offset-4 hover:underline">기다리는 동안 숨은보험금 공식 조회하기</OfficialLink>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full sm:w-auto" })}>
          처음 화면으로
        </Link>
      </div>
    </section>
  );
}
