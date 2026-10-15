import type { Metadata } from "next";
import { getPublicConfig } from "@/lib/config";
import { ApplyShell } from "@/components/apply/ApplyShell";
import { ClaimOnlyDoneView } from "@/components/apply/FinalViews";

export const metadata: Metadata = { title: "신청 완료", robots: { index: false } };

export default function DonePage() {
  return (
    <ApplyShell config={getPublicConfig()} journey={1}>
      <ClaimOnlyDoneView />
    </ApplyShell>
  );
}
