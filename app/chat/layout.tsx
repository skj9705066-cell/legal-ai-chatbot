import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 법률 상담 | 법률AI",
  description: "AI와 함께하는 24시간 무료 법률 상담. 법령·판례를 실시간으로 검색합니다.",
  robots: { index: false, follow: false },
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
