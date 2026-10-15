import type { Metadata } from "next";
import { getPublicConfig } from "@/lib/config";
import { ApplyShell } from "@/components/apply/ApplyShell";
import { CoverageDoneView } from "@/components/apply/FinalViews";

export const metadata: Metadata = { title: "보장 분석 신청 완료", robots: { index: false } };

export default function CoverageCompletePage() {
  return (
    <ApplyShell config={getPublicConfig()}>
      <CoverageDoneView />
    </ApplyShell>
  );
}
