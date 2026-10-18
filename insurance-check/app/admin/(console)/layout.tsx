import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAppMode } from "@/lib/config";
import { trialMode } from "@/lib/types";
import { getStaffSession } from "@/lib/server/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: "상담 CRM", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  return (
    <AdminShell session={session} trial={trialMode(getAppMode())}>
      {children}
    </AdminShell>
  );
}
