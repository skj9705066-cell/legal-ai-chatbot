import { getPublicConfig } from "@/lib/config";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { ApplyProvider } from "@/components/landing/ApplyContext";
import { Hero } from "@/components/landing/Hero";
import { StatsSection } from "@/components/landing/StatsSection";
import { StoryCards } from "@/components/landing/StoryScenes";
import { RealReviews } from "@/components/landing/RealReviews";
import { getPublicMetrics, getPublicReviews } from "@/lib/server/reviews";
import { Process } from "@/components/landing/Process";
import { ApplySection } from "@/components/landing/ApplySection";
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
        {/* 광고 클릭 → 호기심(히어로) → 자기 경험 회상(스토리 카드) → 신뢰(공식 통계·실제 후기) → 무료 점검 신청.
            모든 CTA의 목적지는 같은 신청 폼이며, 고른 점검 유형을 유지한다 */}
        <StoryCards />
        <StatsSection />
        <RealReviews reviews={reviews} metrics={metrics} />
        <Process />
        <ApplySection config={config} />
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
