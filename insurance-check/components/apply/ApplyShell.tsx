import type { PublicConfig } from "@/lib/config";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DemoBanner } from "@/components/site/DemoBanner";

export function ApplyShell({ config, children }: { config: PublicConfig; children: React.ReactNode }) {
  const demo = config.mode === "demo";
  return (
    <>
      {demo && <DemoBanner />}
      <SiteHeader demo={demo} />
      <main id="main" className="bg-gradient-to-b from-blue-50/70 to-white">
        <div className="container max-w-2xl py-10 sm:py-16">{children}</div>
      </main>
      <SiteFooter operator={config.operator} demo={demo} />
    </>
  );
}
