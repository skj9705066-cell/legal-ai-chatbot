"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    if (!code) {
      setError("인증 코드가 없습니다. 카카오 로그인을 다시 시도해주세요.");
      return;
    }

    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const redirectUri = `${base}/auth/kakao/callback`;

    async function run() {
      // 1. 서버에서 카카오 코드 교환 → 이메일·이름·kakaoId 획득
      const res = await fetch("/api/auth/kakao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirectUri }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "카카오 로그인에 실패했습니다.");
        return;
      }

      const { email, name, kakaoId } = data as {
        email: string;
        name: string;
        kakaoId: string;
      };

      // kakaoId 기반 결정론적 비밀번호 (카카오 전용 계정 식별자)
      const password = `kakao_${kakaoId}`;

      // 2. 기존 카카오 계정 로그인 시도
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInErr) {
        // 기존 사용자 — 닉네임 최신값으로 프로필 업데이트
        const { data: session } = await supabase.auth.getSession();
        if (session.session?.user.id) {
          await supabase
            .from("profiles")
            .update({ name })
            .eq("id", session.session.user.id);
        }
        router.replace("/");
        return;
      }

      // 3. 신규 사용자 — 회원가입
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });

      if (signUpErr) {
        // 같은 이메일로 이미 이메일 가입한 경우
        if (/User already registered/i.test(signUpErr.message)) {
          setError(
            "이미 이메일로 가입된 계정이 있습니다.\n이메일 로그인을 이용하거나 비밀번호 찾기를 해주세요.",
          );
        } else {
          setError("계정 생성에 실패했습니다: " + signUpErr.message);
        }
        return;
      }

      if (!signUpData.user) {
        setError("계정 생성에 실패했습니다.");
        return;
      }

      // 프로필 삽입 (중복 무시)
      await supabase.from("profiles").insert({
        id: signUpData.user.id,
        name,
        email,
        role: "user",
      });

      // signUp이 세션을 바로 발급한 경우 (Supabase 이메일 확인 비활성화)
      if (signUpData.session) {
        router.replace("/");
        return;
      }

      // 이메일 확인 없이 로그인 가능한지 재시도
      const { error: reSignInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (reSignInErr) {
        // Supabase에서 이메일 확인이 활성화된 경우
        setError(
          "가입이 완료됐습니다!\n카카오 이메일로 발송된 확인 링크를 클릭한 뒤 다시 로그인해주세요.\n\n(관리자: Supabase → Authentication → Email Auth → Confirm email 해제 권장)",
        );
        return;
      }

      router.replace("/");
    }

    run().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    });
  }, [params, router]);

  if (error) {
    return (
      <main className="min-h-screen bg-[#F4F5F7] flex flex-col items-center justify-center px-5 gap-5">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <p className="text-[15px] text-[#4E5968] font-medium text-center max-w-[320px] leading-relaxed whitespace-pre-line">
          {error}
        </p>
        <button
          onClick={() => router.push("/login")}
          className="h-11 px-6 rounded-xl bg-[#4338CA] text-white font-semibold text-[14px] hover:bg-[#6366F1] transition-colors"
        >
          로그인으로 돌아가기
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F5F7] flex flex-col items-center justify-center gap-4">
      <div className="w-11 h-11 border-4 border-[#FEE500] border-t-transparent rounded-full animate-spin" />
      <p className="text-[15px] text-[#4E5968] font-medium">카카오 로그인 처리 중...</p>
    </main>
  );
}

export default function KakaoCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
