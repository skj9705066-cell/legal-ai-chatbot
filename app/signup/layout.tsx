import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원가입",
  description: "법률AI 회원가입 후 AI 법률 상담과 변호사 매칭 서비스를 무료로 이용하세요.",
  openGraph: {
    title: "회원가입",
    description: "법률AI 회원가입 후 무료 AI 법률 상담을 시작하세요.",
    url: "https://legal-ai-chatbot-five.vercel.app/signup",
  },
  robots: { index: false, follow: false },
  alternates: {
    canonical: "https://legal-ai-chatbot-five.vercel.app/signup",
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
