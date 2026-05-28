import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "변호사 파트너 등록",
  description:
    "법률AI 파트너 변호사로 등록하고 AI가 분석한 사건을 연결받으세요. 무료 등록, 사건별 선택 수임.",
  keywords: ["변호사 등록", "파트너 변호사", "변호사 플랫폼", "수임 연결"],
  openGraph: {
    title: "변호사 파트너 등록",
    description:
      "AI가 분석한 사건을 연결받는 변호사 플랫폼. 지금 파트너로 등록하세요.",
    url: "https://legal-ai-chatbot-five.vercel.app/lawyer/register",
  },
  alternates: {
    canonical: "https://legal-ai-chatbot-five.vercel.app/lawyer/register",
  },
};

export default function LawyerRegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
