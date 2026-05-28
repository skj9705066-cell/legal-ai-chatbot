"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { LawyerRow } from "@/lib/supabase-types";

const SPECIALTIES = [
  "형사", "민사", "이혼", "부동산", "상속", "노동",
  "교통사고", "의료", "기업법무", "지식재산", "세무", "행정",
];

type SortKey = "rating" | "experience" | "recent";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "rating", label: "평점순" },
  { value: "experience", label: "경력순" },
  { value: "recent", label: "최신순" },
];

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="text-[#F59E0B] text-[13px]">
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(5 - full - (half ? 1 : 0))}
    </span>
  );
}

function LawyerCard({ lawyer }: { lawyer: LawyerRow }) {
  const initials = lawyer.name.slice(0, 2);
  return (
    <Link
      href={`/lawyers/${lawyer.id}`}
      className="bg-white rounded-2xl p-5 shadow-[0_1px_2px_rgba(25,31,40,0.04),0_4px_12px_rgba(25,31,40,0.05)] hover:shadow-[0_4px_20px_rgba(25,31,40,0.12)] transition-shadow duration-200 flex gap-4 items-start"
    >
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#4338CA] to-[#6366F1] flex items-center justify-center text-white text-[18px] font-bold shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[15px] font-bold text-[#191F28]">{lawyer.name} 변호사</p>
            <p className="text-[12px] text-[#8B95A1] font-medium mt-0.5 truncate">{lawyer.firm ?? "개인사무소"}</p>
          </div>
          <div className="text-right shrink-0">
            <StarRating rating={lawyer.rating ?? 0} />
            <p className="text-[11px] text-[#8B95A1] mt-0.5">({lawyer.review_count ?? 0})</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-2.5">
          {(lawyer.specialty ?? []).slice(0, 4).map((s) => (
            <span key={s} className="text-[11px] font-medium px-2 h-5 leading-5 rounded-full bg-[#EEF2FF] text-[#4338CA]">
              {s}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-2.5 text-[12px] text-[#4E5968] font-medium">
          <span>경력 {lawyer.experience_years ?? 0}년</span>
          <span className="text-[#E5E8EB]">|</span>
          <span>상담 {lawyer.review_count ?? 0}건</span>
        </div>

        {lawyer.one_liner && (
          <p className="mt-2 text-[12px] text-[#4E5968] leading-relaxed line-clamp-1">
            {lawyer.one_liner}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function LawyersPage() {
  const [lawyers, setLawyers] = useState<LawyerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("rating");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("lawyers").select("*").eq("status", "approved");
    const { data } = await q;
    setLawyers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = lawyers
    .filter((l) => {
      if (selectedSpecialty && !(l.specialty ?? []).includes(selectedSpecialty)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          (l.firm ?? "").toLowerCase().includes(q) ||
          (l.specialty ?? []).some((s) => s.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      if (sort === "experience") return (b.experience_years ?? 0) - (a.experience_years ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <main className="min-h-screen bg-[#F4F5F7] pb-24 page-enter">
      <header className="bg-white border-b border-[#E5E8EB] sticky top-0 z-20 pt-safe-top">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          <h1 className="text-[20px] font-bold text-[#191F28] tracking-tight">변호사 찾기</h1>
          <p className="text-[13px] text-[#8B95A1] font-medium mt-0.5">전문 분야별 변호사를 찾아보세요</p>

          <div className="mt-3 relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B95A1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름, 소속, 전문분야 검색"
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-[#E5E8EB] bg-[#F4F5F7] text-[14px] font-medium text-[#191F28] placeholder:text-[#8B95A1] focus:outline-none focus:border-[#4338CA] transition-colors"
            />
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setSelectedSpecialty(null)}
            className={`shrink-0 text-[12px] font-semibold px-3 h-7 rounded-full border transition-colors duration-200 ${
              selectedSpecialty === null
                ? "bg-[#4338CA] text-white border-[#4338CA]"
                : "bg-white text-[#4E5968] border-[#E5E8EB] hover:border-[#4338CA] hover:text-[#4338CA]"
            }`}
          >
            전체
          </button>
          {SPECIALTIES.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSpecialty(s === selectedSpecialty ? null : s)}
              className={`shrink-0 text-[12px] font-semibold px-3 h-7 rounded-full border transition-colors duration-200 ${
                selectedSpecialty === s
                  ? "bg-[#4338CA] text-white border-[#4338CA]"
                  : "bg-white text-[#4E5968] border-[#E5E8EB] hover:border-[#4338CA] hover:text-[#4338CA]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] text-[#8B95A1] font-medium">
            {loading ? "조회 중..." : `${filtered.length}명의 변호사`}
          </p>
          <div className="flex gap-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className={`text-[12px] font-semibold px-2.5 h-7 rounded-lg transition-colors duration-200 ${
                  sort === opt.value
                    ? "bg-[#191F28] text-white"
                    : "bg-white text-[#8B95A1] hover:text-[#191F28] border border-[#E5E8EB]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 h-[120px] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[15px] text-[#8B95A1] font-medium">
              {search || selectedSpecialty ? "검색 결과가 없습니다" : "등록된 변호사가 없습니다"}
            </p>
            {(search || selectedSpecialty) && (
              <button
                onClick={() => { setSearch(""); setSelectedSpecialty(null); }}
                className="mt-3 text-[13px] font-semibold text-[#4338CA]"
              >
                필터 초기화
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((l) => <LawyerCard key={l.id} lawyer={l} />)}
          </div>
        )}
      </div>
    </main>
  );
}
