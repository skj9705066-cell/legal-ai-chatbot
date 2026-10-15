import { getPublicConfig } from "@/lib/config";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";
import { ApplyProvider } from "@/components/landing/ApplyContext";
import { Hero } from "@/components/landing/Hero";
import { StatsSection } from "@/components/landing/StatsSection";
import { ServiceTypes } from "@/components/landing/ServiceTypes";
import { Process } from "@/components/landing/Process";
import { CheckCases } from "@/components/landing/CheckCases";
import { Faq } from "@/components/landing/Faq";
import { ApplySection } from "@/components/landing/ApplySection";
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
        <ServiceTypes />
        <Process />
        <CheckCases />
        <Faq />
        <ApplySection config={config} />
      </main>
      <SiteFooter operator={config.operator} demo={demo} />
      <MobileStickyCta />
    </ApplyProvider>
  );
}
