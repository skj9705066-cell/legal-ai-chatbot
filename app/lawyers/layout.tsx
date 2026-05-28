import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "검증된 변호사 찾기 | 법률AI",
  description:
    "형사·민사·이혼·부동산·노동 등 분야별 검증된 전문 변호사를 찾아보세요. AI 상담 후 바로 연결됩니다.",
  keywords: ["변호사 찾기", "변호사 추천", "법률 전문가", "변호사 매칭", "온라인 변호사"],
  openGraph: {
    title: "검증된 변호사 찾기 | 법률AI",
    description:
      "형사·민사·이혼·부동산·노동 등 분야별 전문 변호사를 찾아보세요.",
    url: "https://legal-ai-chatbot-five.vercel.app/lawyers",
  },
  alternates: {
    canonical: "https://legal-ai-chatbot-five.vercel.app/lawyers",
  },
};

export default function LawyersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
