"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { generateId } from "@/lib/storage";
import { useAuth } from "@/components/AuthProvider";
import type { LawyerRow } from "@/lib/supabase-types";

const METHOD_LABEL: Record<string, string> = {
  phone: "전화상담",
  video: "화상상담",
  inperson: "대면상담",
  chat: "채팅상담",
};

function StarFull({ n, max = 5 }: { n: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} className={`w-4 h-4 ${i < Math.round(n) ? "text-[#F59E0B]" : "text-[#E5E8EB]"}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function LawyerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { account } = useAuth();
  const [lawyer, setLawyer] = useState<LawyerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase.from("lawyers").select("*").eq("id", id).maybeSingle().then(({ data }: { data: LawyerRow | null }) => {
      if (!data) setNotFound(true);
      else setLawyer(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#4338CA] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (notFound || !lawyer) {
    return (
      <main className="min-h-screen bg-[#F4F5F7] flex flex-col items-center justify-center px-5 gap-4">
        <p className="text-[16px] font-bold text-[#191F28]">변호사를 찾을 수 없습니다</p>
        <Link href="/lawyers" className="text-[14px] font-semibold text-[#4338CA]">목록으로 돌아가기</Link>
      </main>
    );
  }

  const initials = lawyer.name.slice(0, 2);
  const methods = (lawyer.consultation_methods ?? []) as string[];

  function handleStartConsult() {
    const chatId = generateId();
    router.push(`/chat/${chatId}?seed=${encodeURIComponent(lawyer!.name + " 변호사와 상담을 시작합니다.")}`);
  }

  return (
    <main className="min-h-screen bg-[#F4F5F7] pb-24 page-enter">
      <header className="bg-white border-b border-[#E5E8EB] pt-safe-top">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-lg hover:bg-[#F4F5F7] flex items-center justify-center text-[#4E5968] transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-[16px] font-bold text-[#191F28]">변호사 프로필</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {/* Hero card */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(25,31,40,0.04),0_4px_12px_rgba(25,31,40,0.05)]">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4338CA] to-[#6366F1] flex items-center justify-center text-white text-[26px] font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[20px] font-bold text-[#191F28]">{lawyer.name} 변호사</h1>
              <p className="text-[13px] text-[#8B95A1] font-medium mt-0.5">{lawyer.firm ?? "개인사무소"}</p>
              {lawyer.bar_number && (
                <p className="text-[12px] text-[#8B95A1] mt-0.5">등록번호 {lawyer.bar_number}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1.5">
                <StarFull n={lawyer.rating ?? 0} />
                <span className="text-[13px] font-bold text-[#191F28]">{(lawyer.rating ?? 0).toFixed(1)}</span>
                <span className="text-[12px] text-[#8B95A1]">({lawyer.review_count ?? 0}건)</span>
              </div>
            </div>
          </div>

          {lawyer.one_liner && (
            <p className="mt-4 text-[14px] text-[#4E5968] leading-relaxed bg-[#F4F5F7] rounded-xl px-4 py-3">
              "{lawyer.one_liner}"
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "경력", value: `${lawyer.experience_years ?? 0}년` },
            { label: "상담 건수", value: `${(lawyer.review_count ?? 0).toLocaleString("ko-KR")}건` },
            { label: "평점", value: `${(lawyer.rating ?? 0).toFixed(1)} / 5.0` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl p-4 shadow-[0_1px_2px_rgba(25,31,40,0.04)] text-center">
              <p className="text-[11px] text-[#8B95A1] font-semibold">{label}</p>
              <p className="text-[16px] font-bold text-[#191F28] mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Specialties */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(25,31,40,0.04)]">
          <h2 className="text-[14px] font-bold text-[#191F28] mb-3">전문분야</h2>
          <div className="flex flex-wrap gap-2">
            {(lawyer.specialty ?? []).map((s) => (
              <span key={s} className="text-[13px] font-semibold px-3 h-8 leading-8 rounded-full bg-[#EEF2FF] text-[#4338CA]">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Bio */}
        {lawyer.bio && (
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(25,31,40,0.04)]">
            <h2 className="text-[14px] font-bold text-[#191F28] mb-3">변호사 소개</h2>
            <p className="text-[14px] text-[#4E5968] leading-relaxed whitespace-pre-wrap">{lawyer.bio}</p>
          </div>
        )}

        {/* Consultation methods */}
        {methods.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(25,31,40,0.04)]">
            <h2 className="text-[14px] font-bold text-[#191F28] mb-3">상담 방식</h2>
            <div className="flex flex-wrap gap-2">
              {methods.map((m) => (
                <span key={m} className="text-[13px] font-medium px-3 h-8 leading-8 rounded-full bg-[#F4F5F7] text-[#4E5968] border border-[#E5E8EB]">
                  {METHOD_LABEL[m] ?? m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Fee */}
        {(lawyer.base_fee_manwon ?? 0) > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(25,31,40,0.04)]">
            <h2 className="text-[14px] font-bold text-[#191F28] mb-1">기본 상담료</h2>
            <p className="text-[20px] font-bold text-[#4338CA]">{lawyer.base_fee_manwon}만원 ~</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[#E5E8EB] px-4 py-3 safe-area-bottom">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleStartConsult}
            className="w-full h-12 rounded-xl bg-[#4338CA] hover:bg-[#6366F1] text-white font-semibold text-[15px] transition-colors duration-200"
          >
            AI 상담 시작하기
          </button>
          <p className="text-center text-[11px] text-[#8B95A1] font-medium mt-1.5">
            AI 상담 완료 후 변호사 매칭을 요청할 수 있습니다
          </p>
        </div>
      </div>
    </main>
  );
}
