import type { Metadata } from "next";
import { getPublicConfig } from "@/lib/config";
import { ApplyShell } from "@/components/apply/ApplyShell";
import { CoverageForm } from "@/components/apply/CoverageForm";

export const metadata: Metadata = { title: "보장 분석 상담 신청", robots: { index: false } };

export default function CoveragePage() {
  const config = getPublicConfig();
  return (
    <ApplyShell config={config}>
      <CoverageForm config={config} />
    </ApplyShell>
  );
}
