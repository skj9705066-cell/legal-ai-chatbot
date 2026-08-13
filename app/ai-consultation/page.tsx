"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { generateId, listConsultations } from "@/lib/storage";
import { getMatchingSession } from "@/lib/matching-storage";
import { formatRelativeTime } from "@/lib/markdown";
import type { Consultation } from "@/lib/types";

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#4338CA] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// 이어하기 대상: 실제 대화가 있고 아직 매칭 단계로 넘어가지 않은 최근 상담.
function findResumable(): Consultation | null {
  const items = listConsultations();
  for (const c of items) {
    if (!c.messages.some((m) => m.role === "user")) continue;
    const s = getMatchingSession(c.id);
    if (s && (s.status === "matching" || s.status === "selected")) continue;
    return c;
  }
  return null;
}

function Redirect() {
  const router = useRouter();
  const params = useSearchParams();
  const [choice, setChoice] = useState<Consultation | null>(null);

  useEffect(() => {
    const seed = params.get("seed");
    // 주제를 명시했으면 항상 새 상담.
    if (seed) {
      router.replace(`/chat/${generateId()}?seed=${encodeURIComponent(seed)}`);
      return;
    }
    // 진행 중인 상담이 있으면 이어하기/새로 시작 선택지를 보여주고, 없으면 바로 새 상담.
    const resumable = findResumable();
    if (resumable) {
      setChoice(resumable);
    } else {
      router.replace(`/chat/${generateId()}`);
    }
  }, [router, params]);

  if (!choice) return <Spinner />;

  const userMsgCount = choice.messages.filter((m) => m.role === "user").length;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] px-5">
      <div className="w-full max-w-[420px] bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.12)] px-6 py-7">
        <h1 className="text-[19px] font-extrabold text-[#111827] leading-snug">
          진행 중인 상담이 있어요
        </h1>
        <p className="mt-1.5 text-[14px] text-[#6B7280] leading-relaxed">
          이어서 계속할까요, 새로 시작할까요?
        </p>

        <div className="mt-4 rounded-2xl border border-[#EEF2FF] bg-[#F8FAFF] px-4 py-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            {choice.category && (
              <span className="text-[11px] font-bold px-2 h-5 leading-5 rounded-full bg-[#EEF2FF] text-[#4338CA]">
                {choice.category}
              </span>
            )}
            <span className="text-[11px] text-[#9CA3AF] ml-auto">
              {formatRelativeTime(choice.updatedAt)}
            </span>
          </div>
          <p className="text-[14px] font-bold text-[#111827] leading-snug line-clamp-1">
            {choice.title || "제목 없는 상담"}
          </p>
          <p className="mt-1 text-[12px] text-[#9CA3AF]">
            내가 보낸 메시지 {userMsgCount}개
          </p>
        </div>

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={() => router.push(`/chat/${choice.id}`)}
            className="w-full h-[52px] rounded-[14px] bg-[#4338CA] text-white text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-[#3730A3] active:scale-[0.98] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
            이어서 상담하기
          </button>
          <button
            type="button"
            onClick={() => router.push(`/chat/${generateId()}`)}
            className="w-full h-[52px] rounded-[14px] bg-white border border-[#E5E8EB] text-[#4E5968] text-[15px] font-bold flex items-center justify-center gap-2 hover:border-[#4338CA] hover:text-[#4338CA] active:scale-[0.98] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            새 상담 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AIConsultationPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Redirect />
    </Suspense>
  );
}
