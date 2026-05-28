"use client";

import { useEffect, useRef, useState } from "react";

function ScaleIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 32 32" fill="none" aria-hidden>
      <line x1="5"  y1="10" x2="27" y2="10" stroke="white" strokeWidth="2"   strokeLinecap="round" opacity="0.95"/>
      <line x1="16" y1="10" x2="16" y2="26" stroke="white" strokeWidth="2"   strokeLinecap="round" opacity="0.95"/>
      <line x1="9"  y1="26" x2="23" y2="26" stroke="white" strokeWidth="2"   strokeLinecap="round" opacity="0.95"/>
      <line x1="6"  y1="10" x2="6"  y2="15" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.9"/>
      <line x1="26" y1="10" x2="26" y2="15" stroke="white" strokeWidth="1.6" strokeLinecap="round" opacity="0.9"/>
      <path d="M2 15 A4 3 0 0 1 10 15"  stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.9"/>
      <path d="M22 15 A4 3 0 0 1 30 15" stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.9"/>
      <circle cx="16" cy="10" r="3"   fill="#F59E0B"/>
      <circle cx="16" cy="10" r="1.4" fill="white" opacity="0.6"/>
      <circle cx="27" cy="17.5" r="1.4" fill="#F59E0B" opacity="0.85"/>
    </svg>
  );
}

export default function SplashScreen() {
  const [show,    setShow]    = useState(false);
  const [fadeIn,  setFadeIn]  = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // 세션당 1회만 표시
    if (sessionStorage.getItem("lawsel_splash")) return;
    sessionStorage.setItem("lawsel_splash", "1");

    setShow(true);
    // 다음 틱에서 fade-in 트리거 (transition 시작용)
    const t1 = setTimeout(() => setFadeIn(true), 30);
    // 1.5s 후 fade-out 시작
    const t2 = setTimeout(() => setFadeOut(true), 1500);
    // fade-out 500ms 후 완전 제거
    const t3 = setTimeout(() => setShow(false), 2000);
    timerRef.current = [t1, t2, t3];
    return () => timerRef.current.forEach(clearTimeout);
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none transition-opacity duration-500 ${fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      style={{ background: "linear-gradient(135deg, #4338CA 0%, #6366F1 100%)" }}
      aria-hidden="true"
    >
      {/* 로고 (fade-up) */}
      <div
        className={`flex flex-col items-center gap-3 transition-all duration-700 ${fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
      >
        <ScaleIcon />
        <p className="text-[52px] font-extrabold text-white tracking-tight leading-none">
          로<span style={{ color: "#F59E0B" }}>셀</span>
        </p>
      </div>

      {/* 슬로건 (약간 지연 fade-in) */}
      <p
        className={`absolute bottom-24 text-[14px] text-white/70 font-medium tracking-tight transition-all duration-700 delay-300 ${fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
      >
        법률 고민, 로셀이 골라드립니다
      </p>
    </div>
  );
}
