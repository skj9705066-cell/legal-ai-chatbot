import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인",
  description: "법률AI에 로그인하고 AI 법률 상담과 변호사 매칭 서비스를 이용하세요.",
  openGraph: {
    title: "로그인",
    description: "법률AI에 로그인하고 AI 법률 상담을 시작하세요.",
    url: "https://legal-ai-chatbot-five.vercel.app/login",
  },
  robots: { index: false, follow: false },
  alternates: {
    canonical: "https://legal-ai-chatbot-five.vercel.app/login",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
