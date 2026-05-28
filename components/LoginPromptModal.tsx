"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function ScaleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <line x1="5"  y1="10" x2="27" y2="10" stroke="#4338CA" strokeWidth="2"   strokeLinecap="round"/>
      <line x1="16" y1="10" x2="16" y2="26" stroke="#4338CA" strokeWidth="2"   strokeLinecap="round"/>
      <line x1="9"  y1="26" x2="23" y2="26" stroke="#4338CA" strokeWidth="2"   strokeLinecap="round"/>
      <line x1="6"  y1="10" x2="6"  y2="15" stroke="#4338CA" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="26" y1="10" x2="26" y2="15" stroke="#4338CA" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M2 15 A4 3 0 0 1 10 15"  stroke="#4338CA" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M22 15 A4 3 0 0 1 30 15" stroke="#4338CA" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="16" cy="10" r="3"   fill="#F59E0B"/>
      <circle cx="16" cy="10" r="1.4" fill="white" opacity="0.6"/>
    </svg>
  );
}

export default function LoginPromptModal({ isOpen, onClose }: Props) {
  const [shouldRender, setShouldRender] = useState(false);
  const [visible, setVisible]           = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // 두 번의 rAF: 마운트 후 CSS transition 시작 보장
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      const t = setTimeout(() => setShouldRender(false), 350);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ESC 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        className={`fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm
                    transition-opacity duration-300
                    ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      {/* 모바일: 하단 슬라이드업 / PC: 중앙 페이드인 */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[201]
                    transition-transform duration-300 ease-out
                    md:inset-0 md:flex md:items-center md:justify-center
                    ${visible ? "translate-y-0" : "translate-y-full md:translate-y-0"}`}
      >
        <div
          onClick={e => e.stopPropagation()}
          className={`relative bg-white rounded-t-[28px] md:rounded-[24px]
                      w-full md:w-[420px] mx-auto px-6 pt-5 pb-8
                      shadow-[0_-8px_40px_rgba(0,0,0,0.12)]
                      md:shadow-[0_8px_48px_rgba(0,0,0,0.22)]
                      transition-all duration-300
                      ${visible ? "md:opacity-100 md:scale-100" : "md:opacity-0 md:scale-95"}`}
        >
          {/* 모바일 핸들 바 */}
          <div className="w-10 h-1 bg-[#E5E7EB] rounded-full mx-auto mb-5 md:hidden" />

          {/* 닫기 버튼 */}
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center
                       rounded-full text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151] transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>

          {/* 저울 아이콘 */}
          <div className="w-[60px] h-[60px] bg-[#EEF2FF] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ScaleIcon />
          </div>

          {/* 제목 */}
          <h2 className="text-[20px] font-extrabold text-[#111827] text-center leading-snug mb-2.5">
            무료 AI 법률 상담을<br />받아보세요
          </h2>

          {/* 설명 */}
          <p className="text-[14px] text-[#6B7280] text-center leading-relaxed mb-6">
            회원가입하면 AI 법률 상담을 무료로 이용할 수 있습니다.
            <br />
            30초면 가입 완료!
          </p>

          {/* 버튼 */}
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              onClick={onClose}
              className="btn-indigo flex items-center justify-center w-full h-12 rounded-xl text-[15px] font-bold"
            >
              회원가입하고 무료 상담받기
            </Link>
            <Link
              href="/login"
              onClick={onClose}
              className="flex items-center justify-center w-full h-12 rounded-xl
                         border-2 border-[#4338CA] text-[#4338CA]
                         text-[15px] font-bold hover:bg-[#EEF2FF] transition-colors"
            >
              이미 회원이에요 — 로그인
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
