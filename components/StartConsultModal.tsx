"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateId, listConsultations } from "@/lib/storage";
import { getMatchingSession } from "@/lib/matching-storage";
import { formatRelativeTime } from "@/lib/markdown";
import type { Consultation } from "@/lib/types";

/**
 * 진행 중인 AI 상담이 있으면 "이어하기 vs 새로 시작" 선택 시트를 띄우는 훅.
 *
 * 배경: 홈 검색창·"AI 법률 상담" 카드·하단 CTA·하단탭이 모두 generateId()로
 * 매번 새 방을 만들어, 같은 사람이 진행 중인 상담을 두고 계속 새 상담을 쌓았다.
 * 주제를 고른 진입(인기 카드·분야 칩)은 새 주제이므로 대상이 아니고,
 * 일반 "상담 시작" 진입에서만 이어하기를 제안한다.
 */

// 이어하기 대상: 실제 대화(user 메시지 1개+)가 있고 아직 매칭 단계로 넘어가지
// 않은 가장 최근 상담. (매칭중/매칭완료는 AI 채팅으로 되돌리는 게 부자연스러움)
function findResumable(): Consultation | null {
  const items = listConsultations(); // updatedAt 내림차순
  for (const c of items) {
    if (!c.messages.some((m) => m.role === "user")) continue;
    const s = getMatchingSession(c.id);
    if (s && (s.status === "matching" || s.status === "selected")) continue;
    return c;
  }
  return null;
}

export function useStartConsult() {
  const router = useRouter();
  const [recent, setRecent] = useState<Consultation | null>(null);

  const goNew = useCallback(() => {
    router.push(`/chat/${generateId()}`);
  }, [router]);

  /**
   * 일반 상담 진입점에서 호출한다.
   * - seed/quick 이 있으면(주제 선택) 항상 새 상담으로 간다.
   * - 없으면 이어하기 대상이 있을 때만 선택 시트를 띄운다.
   */
  const start = useCallback(
    (opts?: { seed?: string; quick?: string }) => {
      if (opts?.quick) {
        router.push(`/chat/${generateId()}?quick=${opts.quick}`);
        return;
      }
      if (opts?.seed) {
        router.push(`/chat/${generateId()}?seed=${encodeURIComponent(opts.seed)}`);
        return;
      }
      const resumable = findResumable();
      if (resumable) {
        setRecent(resumable);
        return;
      }
      goNew();
    },
    [router, goNew],
  );

  const close = useCallback(() => setRecent(null), []);

  const modal = (
    <StartConsultSheet
      recent={recent}
      onClose={close}
      onContinue={() => {
        if (recent) router.push(`/chat/${recent.id}`);
        setRecent(null);
      }}
      onNew={() => {
        setRecent(null);
        goNew();
      }}
    />
  );

  return { start, modal };
}

function StartConsultSheet({
  recent,
  onClose,
  onContinue,
  onNew,
}: {
  recent: Consultation | null;
  onClose: () => void;
  onContinue: () => void;
  onNew: () => void;
}) {
  const open = recent !== null;

  // 열려 있는 동안 배경 스크롤 잠금 + ESC 닫기
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !recent) return null;

  const userMsgCount = recent.messages.filter((m) => m.role === "user").length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="상담 시작 방식 선택"
    >
      {/* 배경 */}
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />

      {/* 시트 */}
      <div className="relative w-full max-w-[480px] md:max-w-[420px] bg-white rounded-t-[24px] md:rounded-[24px] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] md:shadow-[0_20px_60px_rgba(0,0,0,0.25)] px-6 pt-6 pb-6 banner-slide-up">
        {/* 모바일 드래그 핸들 */}
        <div className="md:hidden w-10 h-1 rounded-full bg-[#E5E8EB] mx-auto mb-5" />

        <h2 className="text-[19px] font-extrabold text-[#111827] leading-snug">
          진행 중인 상담이 있어요
        </h2>
        <p className="mt-1.5 text-[14px] text-[#6B7280] leading-relaxed">
          이어서 계속할까요, 새로 시작할까요?
        </p>

        {/* 최근 상담 미리보기 */}
        <div className="mt-4 rounded-2xl border border-[#EEF2FF] bg-[#F8FAFF] px-4 py-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            {recent.category && (
              <span className="text-[11px] font-bold px-2 h-5 leading-5 rounded-full bg-[#EEF2FF] text-[#4338CA]">
                {recent.category}
              </span>
            )}
            <span className="text-[11px] text-[#9CA3AF] ml-auto">
              {formatRelativeTime(recent.updatedAt)}
            </span>
          </div>
          <p className="text-[14px] font-bold text-[#111827] leading-snug line-clamp-1">
            {recent.title || "제목 없는 상담"}
          </p>
          <p className="mt-1 text-[12px] text-[#9CA3AF]">
            내가 보낸 메시지 {userMsgCount}개
          </p>
        </div>

        {/* 액션 */}
        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={onContinue}
            className="w-full h-[52px] rounded-[14px] bg-[#4338CA] text-white text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-[#3730A3] active:scale-[0.98] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
            이어서 상담하기
          </button>
          <button
            type="button"
            onClick={onNew}
            className="w-full h-[52px] rounded-[14px] bg-white border border-[#E5E8EB] text-[#4E5968] text-[15px] font-bold flex items-center justify-center gap-2 hover:border-[#4338CA] hover:text-[#4338CA] active:scale-[0.98] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            새 상담 시작하기
          </button>
        </div>

        {/* iOS 하단 안전영역 */}
        <div className="md:hidden h-safe-bottom" />
      </div>
    </div>
  );
}
