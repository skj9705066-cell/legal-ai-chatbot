import { getPublicConfig } from "@/lib/config";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { ApplyProvider } from "@/components/landing/ApplyContext";
import { Hero } from "@/components/landing/Hero";
import { StatsSection } from "@/components/landing/StatsSection";
import { CasesSection } from "@/components/landing/CasesSection";
import { ReviewGallery } from "@/components/landing/ReviewGallery";
import { getPublicMetrics, getPublicReviews } from "@/lib/server/reviews";
import { ServiceTypes } from "@/components/landing/ServiceTypes";
import { Process } from "@/components/landing/Process";
import { ApplySection } from "@/components/landing/ApplySection";
import { Trust } from "@/components/landing/Trust";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { MobileStickyCta } from "@/components/landing/MobileStickyCta";

// 후기 공개 승인 시 revalidatePath("/")로 즉시 갱신, 그 외에는 5분마다 재생성
export const revalidate = 300;

export default async function LandingPage() {
  const config = getPublicConfig();
  const [reviews, metrics] = await Promise.all([getPublicReviews(), getPublicMetrics()]);
  const demo = config.mode === "demo";
  return (
    <ApplyProvider>
      {demo && <DemoBanner />}
      <SiteHeader demo={demo} />
      <main id="main">
        <Hero />
        {/* 설득 흐름: 공식 통계 → 전국 지급 건수 → 상황별 사례 → 실제 고객 후기(없으면 '준비 중') → 유형 선택 → 절차 → 신청 */}
        <StatsSection />
        <CasesSection />
        <ReviewGallery reviews={reviews} metrics={metrics} />
        <ServiceTypes />
        <Process />
        <ApplySection config={config} />
        <Trust operator={config.operator} />
        <Faq contactPhone={config.operator.contactPhone} />
        <FinalCta />
      </main>
      <SiteFooter operator={config.operator} demo={demo} />
      {/* 모바일 고정 CTA 높이만큼 여백 — 푸터 마지막 줄을 가리지 않도록 */}
      <div aria-hidden="true" className="h-24 bg-navy-50 lg:hidden" />
      <MobileStickyCta />
    </ApplyProvider>
  );
}
