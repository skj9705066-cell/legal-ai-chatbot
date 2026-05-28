import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "변호사 매칭 | 법률AI",
  description: "AI 분석 결과를 바탕으로 적합한 전문 변호사와 연결됩니다.",
  robots: { index: false, follow: false },
};

export default function MatchingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
