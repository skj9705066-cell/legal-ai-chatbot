import type { Metadata } from "next";
import { getPublicConfig } from "@/lib/config";
import { ApplyShell } from "@/components/apply/ApplyShell";
import { CompleteView } from "@/components/apply/CompleteView";

export const metadata: Metadata = { title: "신청 완료", robots: { index: false } };

export default function CompletePage() {
  const config = getPublicConfig();
  return (
    <ApplyShell config={config} journey={1}>
      <CompleteView contactPhone={config.operator.contactPhone} contactHours={config.operator.contactHours} />
    </ApplyShell>
  );
}
