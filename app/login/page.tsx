"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

function KakaoIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3C6.477 3 2 6.477 2 10.762c0 2.793 1.829 5.243 4.578 6.65l-1.157 4.243a.5.5 0 0 0 .766.557l4.95-3.276c.282.026.572.04.863.04 5.523 0 10-3.477 10-7.762S17.523 3 12 3z" />
    </svg>
  );
}

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}

function safeRedirect(raw: string | null): string {
  if (!raw) return "/";
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
  } catch {
    // ignore malformed encoding
  }
  return "/";
}

function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeRedirect(params.get("next"));
  const { signInEmail, signInWithKakao } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    const e = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("error")
      : null;
    if (e === "oauth_failed") return "소셜 로그인 처리 중 오류가 발생했습니다.";
    if (e === "oauth_denied") return "카카오 로그인을 취소했습니다.";
    return null;
  });
  const [submitting, setSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const acc = await signInEmail({ email, password });
      if (acc.type === "lawyer") {
        router.replace("/lawyer/dashboard");
      } else {
        router.replace(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F5F7] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-[420px]">
        <Link
          href="/"
          className="block text-center text-[22px] font-bold tracking-tight text-[#191F28] mb-8"
        >
          법률<span className="text-[#4338CA]">AI</span>
        </Link>

        <div className="bg-white rounded-2xl p-7 lg:p-8 shadow-[0_1px_2px_rgba(25,31,40,0.04),0_8px_24px_rgba(25,31,40,0.06)]">
          <h1 className="text-[22px] font-bold text-[#191F28] tracking-tight">
            로그인
          </h1>
          <p className="mt-1.5 text-[14px] text-[#8B95A1] font-medium">
            이메일과 비밀번호를 입력하세요
          </p>

          {/* 카카오 로그인 */}
          <div className="mt-7">
            <button
              type="button"
              onClick={async () => {
                try {
                  await signInWithKakao();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "카카오 로그인에 실패했습니다.");
                }
              }}
              className="w-full h-12 rounded-xl flex items-center justify-center gap-2.5 font-semibold text-[15px] transition-all duration-200 hover:brightness-95 active:scale-[0.98]"
              style={{ backgroundColor: "#FEE500", color: "#191919" }}
            >
              <KakaoIcon />
              카카오로 로그인
            </button>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <div className="flex-1 h-px bg-[#E5E8EB]" />
            <span className="text-[12px] text-[#B0B8C1] font-medium">또는</span>
            <div className="flex-1 h-px bg-[#E5E8EB]" />
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-2.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              autoComplete="email"
              required
              className="w-full h-12 px-4 rounded-xl border border-[#E5E8EB] focus:border-[#4338CA] focus:outline-none focus:ring-4 focus:ring-[#4338CA]/14 text-[15px] font-medium text-[#191F28] placeholder:text-[#8B95A1] transition-all duration-200"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
              required
              className="w-full h-12 px-4 rounded-xl border border-[#E5E8EB] focus:border-[#4338CA] focus:outline-none focus:ring-4 focus:ring-[#4338CA]/14 text-[15px] font-medium text-[#191F28] placeholder:text-[#8B95A1] transition-all duration-200"
            />

            {error && (
              <p className="text-[13px] text-[#EF4444] font-medium pt-1">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-[#4338CA] hover:bg-[#6366F1] active:bg-[#3730A3] disabled:bg-[#E5E8EB] disabled:text-[#B0B8C1] text-white font-semibold text-[15px] transition-colors duration-200 mt-2"
            >
              {submitting ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-[#F2F4F6] space-y-3">
            <div className="flex items-center justify-between text-[13px]">
              <Link
                href="/signup"
                className="font-semibold text-[#4338CA] hover:text-[#6366F1] transition-colors duration-200"
              >
                회원가입
              </Link>
              <button
                type="button"
                onClick={() => setForgotSent(true)}
                className="font-medium text-[#8B95A1] hover:text-[#191F28] transition-colors duration-200"
              >
                비밀번호 찾기
              </button>
            </div>
            {forgotSent && (
              <p className="text-[13px] text-[#4338CA] font-medium bg-[#EEF2FF] rounded-lg px-3 py-2.5">
                비밀번호 재설정 기능은 준비 중입니다. contact@legal-ai.kr로 문의해주세요.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
