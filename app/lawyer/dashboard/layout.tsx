import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "변호사 대시보드 | 법률AI",
  robots: { index: false, follow: false },
};

export default function LawyerDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
