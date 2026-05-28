"use client";

import { useId } from "react";

interface LawselIconProps {
  size?: number;
}

export function LawselIcon({ size = 28 }: LawselIconProps) {
  const uid = useId().replace(/:/g, "");
  const gid = `lg-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="2" y1="4" x2="30" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#3730A3" />
        </linearGradient>
      </defs>

      {/* ── 저울 빔 (가로대) ── */}
      <line x1="5" y1="10" x2="27" y2="10"
        stroke={`url(#${gid})`} strokeWidth="1.9" strokeLinecap="round" />

      {/* ── 중심 기둥 ── */}
      <line x1="16" y1="10" x2="16" y2="26"
        stroke={`url(#${gid})`} strokeWidth="1.9" strokeLinecap="round" />

      {/* ── 받침대 ── */}
      <line x1="9" y1="26" x2="23" y2="26"
        stroke={`url(#${gid})`} strokeWidth="1.9" strokeLinecap="round" />

      {/* ── 왼쪽 줄 ── */}
      <line x1="6" y1="10" x2="6" y2="15"
        stroke={`url(#${gid})`} strokeWidth="1.4" strokeLinecap="round" />

      {/* ── 오른쪽 줄 ── */}
      <line x1="26" y1="10" x2="26" y2="15"
        stroke={`url(#${gid})`} strokeWidth="1.4" strokeLinecap="round" />

      {/* ── 왼쪽 저울판 (호) ── */}
      <path d="M2 15 A4 3 0 0 1 10 15"
        stroke={`url(#${gid})`} strokeWidth="1.4" strokeLinecap="round" fill="none" />

      {/* ── 오른쪽 저울판 (호) ── */}
      <path d="M22 15 A4 3 0 0 1 30 15"
        stroke={`url(#${gid})`} strokeWidth="1.4" strokeLinecap="round" fill="none" />

      {/* ── 골드 피벗 포인트 (핵심 테크 포인트) ── */}
      <circle cx="16" cy="10" r="3" fill="#F59E0B" />
      <circle cx="16" cy="10" r="1.4" fill="#FFFFFF" opacity="0.6" />

      {/* ── 우측 패널 테크 도트 ── */}
      <circle cx="27" cy="17.5" r="1.4" fill="#F59E0B" opacity="0.85" />
    </svg>
  );
}

interface LawselLogoProps {
  iconSize?: number;
  textClass?: string;
  className?: string;
}

export default function LawselLogo({
  iconSize = 28,
  textClass = "text-[22px]",
  className = "",
}: LawselLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LawselIcon size={iconSize} />
      <span className={`font-bold tracking-tight text-[#191F28] ${textClass}`}>
        로<span className="text-[#4338CA]">셀</span>
      </span>
    </span>
  );
}
