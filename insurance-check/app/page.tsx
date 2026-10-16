import { getPublicConfig } from "@/lib/config";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { ApplyProvider } from "@/components/landing/ApplyContext";
import { Hero } from "@/components/landing/Hero";
import { StatsSection } from "@/components/landing/StatsSection";
import { CasesSection } from "@/components/landing/CasesSection";
import { RealReviews } from "@/components/landing/RealReviews";
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
        {/* 광고 유입 동선: 호기심(히어로) → 사회적 증거(공식 통계) → 자기 연관성(공감 카드) → (실제 후기: 동의·승인된 것만)
            → 행동(유형 선택 → 신청). 공감 카드·유형 카드는 바로 신청 폼으로 이어진다 */}
        <StatsSection />
        <CasesSection />
        <RealReviews reviews={reviews} metrics={metrics} />
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
