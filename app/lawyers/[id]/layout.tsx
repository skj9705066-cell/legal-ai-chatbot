import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "변호사 프로필",
  description: "전문 변호사의 경력, 전문 분야, 상담 비용을 확인하고 바로 상담을 시작하세요.",
  openGraph: {
    title: "변호사 프로필",
    description: "전문 변호사의 경력, 전문 분야, 상담 비용을 확인하세요.",
  },
  alternates: {
    canonical: "https://legal-ai-chatbot-five.vercel.app/lawyers",
  },
};

export default function LawyerProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
