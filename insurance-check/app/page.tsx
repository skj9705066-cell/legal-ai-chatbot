import { getPublicConfig } from "@/lib/config";
import { trialMode } from "@/lib/types";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { ApplyProvider } from "@/components/landing/ApplyContext";
import { Hero } from "@/components/landing/Hero";
import { MoneySection } from "@/components/landing/MoneySection";
import { VisitProcess } from "@/components/landing/VisitProcess";
import { Counselor } from "@/components/landing/Counselor";
import { RealReviews } from "@/components/landing/RealReviews";
import { getPublicMetrics, getPublicReviews } from "@/lib/server/reviews";
import { Faq } from "@/components/landing/Faq";
import { ApplySection } from "@/components/landing/ApplySection";
import { OperatorNotice } from "@/components/landing/OperatorNotice";
import { MobileStickyCta } from "@/components/landing/MobileStickyCta";

// 후기 공개 승인 시 revalidatePath("/")로 즉시 갱신, 그 외에는 5분마다 재생성
export const revalidate = 300;

/**
 * 광고 → 랜딩 → 무료 점검 신청 → 전화 연락 → 방문 예약 → 대면 점검 → (원하실 때만) 보장분석.
 * 섹션 순서(2026-11): 1 후킹 → 2 카드포인트·미청구 보험금 → 3 방문 점검 과정 → 4 상담사 → 5 실제 후기(있을 때만)
 *                     → 6 자주 묻는 질문 → 7 신청서 → 8 운영자 정보·개인정보. 모든 CTA는 같은 신청서(#apply)로 간다.
 */
export default async function LandingPage() {
  const config = getPublicConfig();
  const [reviews, metrics] = await Promise.all([getPublicReviews(), getPublicMetrics()]);
  const trial = trialMode(config.mode);
  const phone = config.operator.contactPhone;
  return (
    <ApplyProvider>
      {trial && <DemoBanner trial={trial} />}
      <SiteHeader trial={trial} contactPhone={phone} />
      <main id="main">
        <Hero contactPhone={phone} />
        <MoneySection />
        <VisitProcess />
        <Counselor operator={config.operator} />
        <RealReviews reviews={reviews} metrics={metrics} />
        <Faq contactPhone={phone} />
        <ApplySection config={config} />
        <OperatorNotice config={config} />
      </main>
      <SiteFooter operator={config.operator} trial={trial} />
      {/* 모바일 고정 CTA 높이만큼 여백 — 푸터 마지막 줄을 가리지 않도록 */}
      <div aria-hidden="true" className="h-24 bg-navy-50 lg:hidden" />
      <MobileStickyCta />
    </ApplyProvider>
  );
}
