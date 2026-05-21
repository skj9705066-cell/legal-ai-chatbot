"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-static";

export default function OfflinePage() {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    function onOnline() {
      window.location.reload();
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  function retry() {
    setRetrying(true);
    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-white page-enter flex flex-col items-center justify-center px-6 py-20 relative">
      <div className="absolute inset-0 bg-dots opacity-50 pointer-events-none" />
      <div className="relative w-full max-w-md text-center">
        <div className="relative w-20 h-20 mx-auto mb-9">
          <span className="absolute inset-0 rounded-full bg-surface-subtle" />
          <span className="absolute inset-0 flex items-center justify-center text-navy-900">
            <svg
              className="w-9 h-9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path
                d="M1 8.5a16 16 0 0 1 22 0"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.35"
              />
              <path
                d="M4 12.5a11 11 0 0 1 16 0"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.65"
              />
              <path
                d="M7 16.5a6 6 0 0 1 10 0"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="20" r="1.4" fill="currentColor" />
              <line
                x1="3"
                y1="3"
                x2="21"
                y2="21"
                strokeLinecap="round"
                strokeWidth="2"
                stroke="#dc2626"
              />
            </svg>
          </span>
        </div>

        <p className="text-caption text-gold mb-3">OFFLINE</p>
        <h1 className="text-h2">인터넷 연결을 확인해주세요</h1>
        <p className="text-body-muted leading-[1.8] mt-4">
          네트워크에 연결되어 있지 않아 페이지를 불러올 수 없습니다.
          <br />
          연결이 복구되면 자동으로 새로고침됩니다.
        </p>

        <button
          onClick={retry}
          disabled={retrying}
          className="mt-9 w-full h-12 rounded-2xl btn-navy text-[15px] tracking-luxe disabled:opacity-60"
        >
          {retrying ? "다시 시도 중..." : "다시 시도"}
        </button>

        <div className="mt-7 rounded-2xl bg-surface-subtle px-5 py-5 text-left text-[13px] text-navy-700 space-y-1.5 font-medium">
          <p className="text-navy-900 text-[14px] font-semibold">
            오프라인에서도 가능한 것
          </p>
          <p className="text-text-muted">
            · 이전에 진행한 상담 내역 보기 (마이페이지)
          </p>
          <p className="text-text-muted">· 저장된 매칭 결과 확인</p>
        </div>
      </div>
    </main>
  );
}
