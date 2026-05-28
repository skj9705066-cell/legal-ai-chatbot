import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "마이페이지",
  description: "나의 AI 상담 내역과 변호사 매칭 현황을 확인하세요.",
  robots: { index: false, follow: false },
};

export default function MypageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
