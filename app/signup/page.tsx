"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { LawyerSpecialty } from "@/lib/types";

const SPECIALTIES: LawyerSpecialty[] = [
  "형사",
  "민사",
  "이혼",
  "부동산",
  "상속",
  "노동",
  "교통사고",
  "의료",
  "기업법무",
  "지식재산",
  "세무",
  "행정",
];

type Tab = "user" | "lawyer";

export default function SignupPage() {
  const router = useRouter();
  const { signUpEmail, registerLawyer } = useAuth();

  const [tab, setTab] = useState<Tab>("user");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const [firm, setFirm] = useState("");
  const [specialties, setSpecialties] = useState<LawyerSpecialty[]>([]);
  const [years, setYears] = useState("");
  const [barNumber, setBarNumber] = useState("");

  function toggleSpecialty(s: LawyerSpecialty) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError("이름, 이메일, 비밀번호는 필수 입력입니다.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      if (tab === "user") {
        await signUpEmail({
          name,
          email,
          password,
          phone: phone || undefined,
        });
        router.replace("/");
      } else {
        if (!firm.trim() || !barNumber.trim() || specialties.length === 0) {
          setError("소속·전문분야·등록번호를 모두 입력해주세요.");
          setSubmitting(false);
          return;
        }
        const yearsNum = Number(years) || 0;
        const bucket =
          yearsNum < 5
            ? "5년 미만"
            : yearsNum < 10
              ? "5~10년"
              : yearsNum < 20
                ? "10~20년"
                : "20년 이상";
        await registerLawyer({
          name,
          email,
          password,
          phone: phone || "",
          firm,
          specialties,
          experienceBucket: bucket,
          barNumber,
          oneLiner: "",
          bio: "",
          consultationMethods: [],
          baseFeeManwon: 0,
        });
        router.replace("/lawyer/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "가입에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F5F7] px-5 py-10 lg:py-14">
      <div className="max-w-[480px] mx-auto">
        <Link
          href="/"
          className="block text-center text-[22px] font-bold tracking-tight text-[#191F28] mb-7"
        >
          법률<span className="text-[#4338CA]">AI</span>
        </Link>

        <div className="bg-white rounded-2xl p-7 lg:p-8 shadow-[0_1px_2px_rgba(25,31,40,0.04),0_8px_24px_rgba(25,31,40,0.06)]">
          <h1 className="text-[22px] font-bold text-[#191F28] tracking-tight">
            회원가입
          </h1>
          <p className="mt-1.5 text-[14px] text-[#8B95A1] font-medium">
            가입 유형을 선택하고 정보를 입력하세요
          </p>

          <div className="mt-6 bg-[#F4F5F7] rounded-xl p-1 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setTab("user")}
              className={`h-10 rounded-lg text-[14px] font-semibold transition-colors duration-200 ${
                tab === "user"
                  ? "bg-white text-[#4338CA] shadow-sm"
                  : "text-[#8B95A1] hover:text-[#191F28]"
              }`}
            >
              일반 사용자
            </button>
            <button
              type="button"
              onClick={() => setTab("lawyer")}
              className={`h-10 rounded-lg text-[14px] font-semibold transition-colors duration-200 ${
                tab === "lawyer"
                  ? "bg-white text-[#4338CA] shadow-sm"
                  : "text-[#8B95A1] hover:text-[#191F28]"
              }`}
            >
              변호사
            </button>
          </div>

          {tab === "lawyer" && (
            <div className="mt-4 px-3.5 py-3 rounded-lg bg-[#FFF7ED] text-[13px] text-[#9A3412] font-medium leading-[1.6]">
              ⓘ 변호사 가입은 관리자 승인 후 활동이 가능합니다.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <Input
              label="이름"
              value={name}
              onChange={setName}
              placeholder="홍길동"
              required
            />
            <Input
              type="email"
              label="이메일"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              required
            />
            <Input
              type="password"
              label="비밀번호 (6자 이상)"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
            />
            <Input
              type="tel"
              label={tab === "user" ? "전화번호 (선택)" : "전화번호"}
              value={phone}
              onChange={setPhone}
              placeholder="010-0000-0000"
              required={tab === "lawyer"}
            />

            {tab === "lawyer" && (
              <>
                <Input
                  label="소속"
                  value={firm}
                  onChange={setFirm}
                  placeholder="법무법인 ○○"
                  required
                />
                <div>
                  <label className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">
                    전문분야 (복수 선택)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SPECIALTIES.map((s) => {
                      const active = specialties.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSpecialty(s)}
                          className={`text-[13px] font-medium px-3 h-9 rounded-full border transition-colors duration-200 ${
                            active
                              ? "bg-[#4338CA] text-white border-[#4338CA]"
                              : "bg-white text-[#4E5968] border-[#E5E8EB] hover:border-[#4338CA] hover:text-[#4338CA]"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Input
                  type="number"
                  label="경력 (년)"
                  value={years}
                  onChange={setYears}
                  placeholder="5"
                  required
                />
                <Input
                  label="변호사 등록번호"
                  value={barNumber}
                  onChange={setBarNumber}
                  placeholder="제00000호"
                  required
                />
              </>
            )}

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
              {submitting ? "가입 중..." : "가입하기"}
            </button>
          </form>

          <p className="mt-5 text-center text-[13px] text-[#8B95A1]">
            이미 회원이신가요?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#4338CA] hover:text-[#6366F1] transition-colors duration-200"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-[#4E5968] mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full h-12 px-4 rounded-xl border border-[#E5E8EB] focus:border-[#4338CA] focus:outline-none focus:ring-4 focus:ring-[#4338CA]/14 text-[15px] font-medium text-[#191F28] placeholder:text-[#8B95A1] transition-all duration-200"
      />
    </label>
  );
}
