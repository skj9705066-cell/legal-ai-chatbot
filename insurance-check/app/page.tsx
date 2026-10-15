import { getPublicConfig } from "@/lib/config";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { ApplyProvider } from "@/components/landing/ApplyContext";
import { Hero } from "@/components/landing/Hero";
import { StatsSection } from "@/components/landing/StatsSection";
import { StorySection } from "@/components/landing/StorySection";
import { ServiceTypes } from "@/components/landing/ServiceTypes";
import { Process } from "@/components/landing/Process";
import { ApplySection } from "@/components/landing/ApplySection";
import { Trust } from "@/components/landing/Trust";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { MobileStickyCta } from "@/components/landing/MobileStickyCta";

export default function LandingPage() {
  const config = getPublicConfig();
  const demo = config.mode === "demo";
  return (
    <ApplyProvider>
      {demo && <DemoBanner />}
      <SiteHeader demo={demo} />
      <main id="main">
        <Hero />
        <StatsSection />
        <StorySection />
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
