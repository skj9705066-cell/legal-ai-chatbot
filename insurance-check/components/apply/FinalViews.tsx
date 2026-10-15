"use client";

import Link from "next/link";
import { CalendarCheck2, CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { OfficialLink } from "@/components/site/OfficialLink";
import { useReceipt } from "./useReceipt";
import { LoadingView, MissingReceiptView, RefNo } from "./StateViews";

export function CoverageDoneView() {
  const [receipt] = useReceipt();
  if (receipt === undefined) return <LoadingView />;
  if (receipt === null || receipt.coverage !== "opted_in") return <MissingReceiptView />;
  return (
    <section aria-labelledby="cov-done" className="rounded-3xl border border-navy-200/80 bg-white p-6 text-center shadow-card sm:p-10">
      <CalendarCheck2 className="mx-auto h-14 w-14 text-blue" aria-hidden="true" />
      <h1 id="cov-done" className="mt-4 text-[24px] font-extrabold text-navy sm:text-[28px]">
        보장 분석 상담도 함께 신청되었습니다
      </h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-navy-600">
        보험금 점검 안내와 보장 분석 상담은 각각 진행됩니다. 선택하신 방법과 시간에 담당 설계사가 연락드립니다.
      </p>
      <RefNo refNo={receipt.refNo} demo={receipt.demo} />
      <p className="mx-auto mt-6 max-w-md text-[13px] leading-relaxed text-navy-500">
        상담 후 보험 가입 의무는 없으며, 계약이나 환급을 보장하지 않습니다. 보장 분석 동의는 언제든{" "}
        <Link href="/privacy/withdraw" className="font-semibold text-blue underline underline-offset-2">
          철회
        </Link>
        할 수 있고, 철회 즉시 연락 대상에서 제외됩니다.
      </p>
      <Link href="/" className={buttonVariants({ variant: "outline", size: "lg", className: "mt-8" })}>
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
    <section aria-labelledby="claim-done" className="rounded-3xl border border-navy-200/80 bg-white p-6 text-center shadow-card sm:p-10">
      <CheckCircle2 className="mx-auto h-14 w-14 text-mint" aria-hidden="true" />
      <h1 id="claim-done" className="mt-4 text-[24px] font-extrabold text-navy sm:text-[28px]">
        보험금 점검 안내만 진행합니다
      </h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-navy-600">
        보장 분석이나 보험 상품 안내 연락은 드리지 않습니다. 희망하신 시간에 보험금 점검 안내 연락만 드립니다.
      </p>
      <RefNo refNo={receipt.refNo} demo={receipt.demo} />
      <div className="mt-8 flex flex-col items-center gap-3">
        <OfficialLink className="text-[15px] font-semibold text-blue underline-offset-4 hover:underline">
          기다리는 동안 숨은보험금 공식 조회하기
        </OfficialLink>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          처음 화면으로
        </Link>
      </div>
    </section>
  );
}
