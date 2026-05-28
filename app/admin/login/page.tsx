"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInAdmin } from "@/lib/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInAdmin(email, password);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-[400px] bg-white rounded-2xl p-8 shadow-[0_1px_2px_rgba(25,31,40,0.04),0_8px_24px_rgba(25,31,40,0.08)]">
        <p className="text-[22px] font-bold tracking-tight text-[#191F28]">
          로<span className="text-[#4338CA]">셀</span> 관리자
        </p>
        <p className="mt-1.5 text-[14px] text-[#8B95A1] font-medium">
          관리자 권한이 부여된 계정으로 로그인하세요
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-2.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            autoComplete="email"
            autoFocus
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
            <p className="text-[13px] text-[#EF4444] font-medium pt-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-[#4338CA] hover:bg-[#6366F1] active:bg-[#3730A3] disabled:bg-[#E5E8EB] disabled:text-[#B0B8C1] text-white font-semibold text-[15px] transition-colors duration-200 mt-2"
          >
            {submitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="mt-5 px-3 py-2.5 rounded-lg bg-[#F4F5F7]">
          <p className="text-[12px] text-[#8B95A1] font-medium leading-[1.6]">
            관리자 권한은 Supabase에서 직접 부여됩니다. 일반 회원가입 후{" "}
            <span className="font-bold text-[#4E5968]">
              update profiles set role = &apos;admin&apos;
            </span>{" "}
            쿼리로 승격하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
