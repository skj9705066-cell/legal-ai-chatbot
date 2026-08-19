"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { returnPathFrom } from "@/lib/safe-redirect";
import { useAuth } from "./AuthProvider";
import type { Account } from "@/lib/types";

interface AuthFormProps {
  mode: "login" | "signup";
  onSuccess?: (account: Account) => void;
  hideHeading?: boolean;
}

export default function AuthForm({
  mode,
  onSuccess,
  hideHeading = false,
}: AuthFormProps) {
  const {
    signInWithKakao,
    signInEmail,
    signUpEmail,
  } = useAuth();

  // OAuth는 페이지를 떠났다 돌아오므로, 모달에서 시작해도 제자리로 복귀시킨다.
  const pathname = usePathname();
  const oauthNext = returnPathFrom(pathname);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handle(promise: () => Promise<Account | void>) {
    setError(null);
    setSubmitting(true);
    try {
      const acc = await promise();
      if (acc) onSuccess?.(acc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup") {
      if (!email.trim() || !password || !name.trim()) {
        setError("이메일, 비밀번호, 이름은 필수 항목입니다.");
        return;
      }
      void handle(() =>
        signUpEmail({ email, password, name, phone: phone || undefined }),
      );
    } else {
      if (!email.trim() || !password) {
        setError("이메일과 비밀번호를 입력해주세요.");
        return;
      }
      void handle(() => signInEmail({ email, password }));
    }
  }

  return (
    <div className="space-y-4">
      {!hideHeading && (
        <div className="text-center">
          <p className="text-caption text-gold mb-3">
            {mode === "login" ? "SIGN IN" : "JOIN"}
          </p>
          <h2 className="text-h2">
            {mode === "login" ? "환영합니다" : "1분이면 끝나요"}
          </h2>
        </div>
      )}

      <button
        type="button"
        onClick={() => void handle(() => signInWithKakao(oauthNext))}
        disabled={submitting}
        className="w-full h-14 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2.5 transition-all duration-500 ease-luxe hover:brightness-95 active:scale-[0.97] disabled:opacity-50"
        style={{ backgroundColor: "#FEE500", color: "#191919" }}
      >
        <KakaoIcon />
        카카오로 시작하기
      </button>

      <div className="flex items-center gap-3 pt-1">
        <div className="flex-1 h-px bg-surface-line" />
        <span className="text-[12px] text-text-muted font-medium tracking-luxe">
          또는
        </span>
        <div className="flex-1 h-px bg-surface-line" />
      </div>

      {!showEmailForm ? (
        <button
          type="button"
          onClick={() => setShowEmailForm(true)}
          className="w-full h-12 rounded-2xl btn-ghost font-semibold text-[15px] tracking-luxe"
        >
          이메일로 {mode === "login" ? "로그인" : "가입"}
        </button>
      ) : (
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {mode === "signup" && (
            <div className="field-float">
              <input
                id="af-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=" "
                required
              />
              <label htmlFor="af-name">이름</label>
            </div>
          )}
          <div className="field-float">
            <input
              id="af-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              required
            />
            <label htmlFor="af-email">이메일</label>
          </div>
          <div className="field-float">
            <input
              id="af-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
              required
            />
            <label htmlFor="af-pw">비밀번호 (6자 이상)</label>
          </div>
          {mode === "signup" && (
            <div className="field-float">
              <input
                id="af-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder=" "
              />
              <label htmlFor="af-phone">휴대폰 (선택)</label>
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-2xl btn-primary text-[15px] tracking-luxe disabled:opacity-50"
          >
            {submitting
              ? "처리 중..."
              : mode === "login"
                ? "로그인"
                : "가입 완료"}
          </button>
        </form>
      )}

      {error && (
        <div className="text-[13px] text-danger bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
          {error}
        </div>
      )}

      <div className="pt-2 text-center text-[14px] text-text-muted space-y-2">
        {mode === "login" ? (
          <>
            <p>
              아직 회원이 아니신가요?{" "}
              <Link
                href="/signup"
                className="text-navy-900 font-semibold hover:underline"
              >
                회원가입
              </Link>
            </p>
            <p>
              변호사이신가요?{" "}
              <Link
                href="/lawyer/register"
                className="text-navy-900 font-semibold hover:underline"
              >
                파트너 등록
              </Link>
            </p>
          </>
        ) : (
          <p>
            이미 회원이신가요?{" "}
            <Link
              href="/login"
              className="text-navy-900 font-semibold hover:underline"
            >
              로그인
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3C6.477 3 2 6.477 2 10.762c0 2.793 1.829 5.243 4.578 6.65l-1.157 4.243a.5.5 0 0 0 .766.557l4.95-3.276c.282.026.572.04.863.04 5.523 0 10-3.477 10-7.762S17.523 3 12 3z" />
    </svg>
  );
}
