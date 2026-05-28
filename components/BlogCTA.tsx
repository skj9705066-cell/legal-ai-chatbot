"use client";

import { useRouter } from "next/navigation";
import { generateId } from "@/lib/storage";

export default function BlogCTA() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/chat/${generateId()}`)}
      className="w-full text-left bg-gradient-to-r from-[#4338CA] to-[#6366F1] rounded-2xl p-6 lg:p-7 flex items-center justify-between gap-4 hover:opacity-95 transition-opacity duration-200"
    >
      <div>
        <p className="text-[16px] lg:text-[18px] font-bold text-white leading-[1.4] mb-1">
          이 문제, AI에게 무료로 물어보세요
        </p>
        <p className="text-[13px] lg:text-[14px] text-white/80 font-medium">
          24시간 무료 AI 법률 상담 · 전문 변호사 연결
        </p>
      </div>
      <span className="shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
        <svg
          className="w-5 h-5 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}
