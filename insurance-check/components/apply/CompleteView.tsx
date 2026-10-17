"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, RefreshCcw, ShieldPlus } from "lucide-react";
import { SERVICE_CONTENT } from "@/lib/content";
import { saveReceipt, track, trackOnce } from "@/lib/analytics";
import { Button, buttonVariants } from "@/components/ui/button";
import { useReceipt } from "./useReceipt";
import { LoadingView, MissingReceiptView, RefNo, SuccessMark } from "./StateViews";

const COVERAGE_POINTS = [
  { icon: Layers, label: "중복 보장" },
  { icon: ShieldPlus, label: "부족한 보장" },
  { icon: RefreshCcw, label: "갱신 조건" },
];

const NEXT = ["남겨주신 번호로 담당자가 연락드려요", "확인할 항목과 필요한 서류를 안내해 드려요", "보험사에 직접 청구하시면 보험사가 지급을 결정해요"];

/**
 * 신청 완료 + 보장 분석 별도 제안. 서버 저장에 성공한 경우에만 영수증이 생기므로(ApplyForm), 이 화면은 실제 접수 후에만 보인다.
 * 자동 조회·지급 완료처럼 보이는 표현을 쓰지 않는다.
 */
export function CompleteView({ contactPhone, contactHours }: { contactPhone: string | null; contactHours: string | null }) {
  const router = useRouter();
  const [receipt] = useReceipt();
  const offer = receipt && receipt.coverage === "offered" && receipt.receiptToken;

  useEffect(() => {
    if (offer) trackOnce("coverage_offer_view", { serviceType: receipt.serviceType }, `:${receipt.refNo}`);
  }, [offer, receipt]);

  if (receipt === undefined) return <LoadingView />;
  if (receipt === null) return <MissingReceiptView />;

  // 데모·테스트 접수에서만 빠진 설정을 '[설정 필요]'로 알린다(운영 접수는 trial이 없다)
  const setupHint = Boolean(receipt.trial);

  const decline = () => {
    track("coverage_decline", { serviceType: receipt.serviceType });
    // 영업 DB로 넘기지 않는다: 서버 호출 없음 + 이 탭의 추가 신청 토큰 폐기
    saveReceipt({ ...receipt, receiptToken: null, coverage: "declined" });
    router.push("/apply/done");
  };

  return (
    <div className="space-y-4">
      <section aria-labelledby="done-title" className="rounded-[28px] bg-white px-6 py-9 text-center shadow-card sm:px-10 sm:py-11">
        <SuccessMark />
        <h1 id="done-title" className="mt-5 text-balance text-[26px] font-bold leading-snug tracking-[-0.03em] text-navy sm:text-[30px]">
          무료 점검 상담 신청이 접수되었습니다.
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-navy-600 sm:text-[17px]">
          남겨주신 정보를 바탕으로 상담 안내를 도와드리겠습니다.
          <br />
          <span className="font-semibold text-navy">{SERVICE_CONTENT[receipt.serviceType].cardTitle}</span> 점검으로 접수했어요.
        </p>
        <RefNo refNo={receipt.refNo} trial={receipt.trial ?? null} />
        {receipt.trial === "demo" && (
          <p className="mx-auto mt-3 max-w-sm rounded-xl bg-caution-50 px-4 py-3 text-[14px] leading-relaxed text-caution" data-testid="demo-receipt-note">
            데모 모드입니다. 실제 상담 신청으로 접수되지 않았으며, 데모 저장소에만 임시로 기록되어 서버가 다시 시작되면 사라집니다.
          </p>
        )}
        {receipt.trial === "staging" && (
          <p className="mx-auto mt-3 max-w-sm rounded-xl bg-caution-50 px-4 py-3 text-[14px] leading-relaxed text-caution" data-testid="test-receipt-note">
            테스트 모드입니다. 실제 상담으로 진행되지 않으며, 테스트 신청으로 저장되어 운영 지표에서 제외됩니다.
          </p>
        )}
        <ol className="mx-auto mt-8 max-w-sm space-y-3.5 text-left">
          {NEXT.map((t, i) => (
            <li key={t} className="flex gap-3 text-[16px] leading-snug text-ink">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-100 text-[13px] font-bold text-navy" aria-hidden="true">
                {i + 1}
              </span>
              {t}
            </li>
          ))}
        </ol>
        <p className="mx-auto mt-6 max-w-sm rounded-2xl bg-navy-50 px-4 py-3 text-[15px] leading-relaxed text-navy-700" data-testid="contact-info">
          연락 방식: 전화{" "}
          {contactPhone ? (
            <>
              · 문의 <strong className="font-semibold text-navy">{contactPhone}</strong>
            </>
          ) : (
            setupHint && <span className="text-caution">· [설정 필요: 대표 연락처]</span>
          )}
          {/* 운영시간은 선택 설정이라 운영 화면에서는 값이 있을 때만 보여 준다 */}
          {(contactHours || setupHint) && (
            <>
              <br />
              운영시간: {contactHours ?? <span className="text-caution">[설정 필요: 운영시간]</span>}
            </>
          )}
        </p>
      </section>

      {offer ? (
        <section aria-labelledby="offer-title" className="rounded-[28px] bg-white p-6 shadow-card sm:p-9">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[14px] font-bold text-blue-700">선택 사항</span>
          <h2 id="offer-title" className="mt-4 text-balance text-[22px] font-bold leading-snug tracking-[-0.025em] text-navy sm:text-[24px]">
            현재 가입하신 보험, <br />
            보장도 함께 확인해 보시겠어요?
          </h2>
          <p className="mt-3 text-[16px] leading-[1.7] text-navy-600">
            기존 보험의 중복 보장, 부족한 보장, 갱신 조건 등을 별도로 점검해 드립니다.
            <br />
            <strong className="font-semibold text-navy">보험 가입 의무는 없습니다.</strong>
          </p>
          <ul className="mt-6 grid grid-cols-3 gap-2.5">
            {COVERAGE_POINTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex flex-col items-center gap-2 whitespace-nowrap rounded-2xl bg-navy-50 px-1 py-4 text-center text-[15px] font-semibold text-navy">
                <Icon className="h-6 w-6 text-blue" strokeWidth={1.8} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
          <div className="mt-7 grid gap-2.5">
            <Link href="/apply/coverage" className={buttonVariants({ size: "lg", className: "w-full" })}>
              무료 보장 분석 상담 신청
            </Link>
            <Button variant="outline" size="lg" className="w-full" onClick={decline}>
              보험금 점검만 이용할게요
            </Button>
          </div>
          <p className="mt-5 text-[14px] leading-relaxed text-navy-500">
            보장 분석 상담을 신청해도 보험 계약이나 보험금·환급금 지급을 보장하지 않습니다. 신청하지 않아도 보험금 점검 안내는 그대로 진행돼요.
          </p>
        </section>
      ) : (
        <div className="pt-2 text-center">
          <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
            처음 화면으로
          </Link>
        </div>
      )}
    </div>
  );
}
