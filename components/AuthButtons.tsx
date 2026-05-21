"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

interface Props {
  size?: "sm" | "md";
}

export default function AuthButtons({ size = "sm" }: Props) {
  const { account, signOut, loading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [open]);

  if (loading) return <div className="h-8 w-24" />;

  const pad = size === "md" ? "px-4 h-10" : "px-3 h-9";

  if (!account) {
    return (
      <div className="flex items-center gap-1">
        <Link
          href="/login"
          className={`${pad} flex items-center text-[15px] text-[#4E5968] hover:text-[#191F28] font-medium tracking-tight transition-colors duration-200`}
        >
          로그인
        </Link>
        <Link
          href="/signup"
          className={`${pad} flex items-center text-[15px] rounded-xl btn-indigo tracking-tight`}
        >
          회원가입
        </Link>
      </div>
    );
  }

  const isLawyer = account.type === "lawyer";
  const initial = account.name.slice(0, 1).toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full hover:bg-surface-subtle transition-colors duration-500 ease-luxe"
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold ${
            isLawyer
              ? "bg-navy-900 text-gold"
              : "bg-navy-900 text-white"
          }`}
        >
          {initial}
        </div>
        <span className="flex items-center gap-2 max-w-[180px]">
          <span className="text-[14px] font-semibold text-navy-900 truncate">
            {account.name}
            {isLawyer && (
              <span className="hidden sm:inline text-text-muted"> 변호사</span>
            )}
          </span>
          {isLawyer && (
            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gold-100 text-gold-700 tracking-eyebrow leading-none">
              파트너
            </span>
          )}
        </span>
        <svg
          className={`w-3 h-3 text-text-muted transition-transform duration-500 ease-luxe ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-elevated overflow-hidden animate-fade-in">
          <div className="px-4 py-4 border-b border-surface-line">
            <div className="text-caption text-gold">ACCOUNT</div>
            <div className="text-[15px] font-semibold text-navy-900 truncate mt-1.5">
              {account.name}
              {isLawyer && <span className="text-text-muted"> 변호사</span>}
            </div>
            <div className="text-[13px] text-text-muted truncate mt-1">
              {account.email}
            </div>
            {isLawyer && (
              <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-gold-50 text-gold-700 tracking-luxe">
                {account.approvalStatus === "approved"
                  ? "승인된 파트너"
                  : account.approvalStatus === "pending"
                    ? "심사 중"
                    : "반려됨"}
              </div>
            )}
          </div>

          {isLawyer ? (
            <>
              <MenuLink
                href="/lawyer/dashboard"
                label="대시보드"
                onClick={() => setOpen(false)}
              />
              <MenuLink
                href="/lawyer/dashboard"
                label="사건 관리"
                onClick={() => setOpen(false)}
              />
              <MenuLink
                href="/lawyer/register"
                label="프로필 수정"
                onClick={() => setOpen(false)}
              />
            </>
          ) : (
            <>
              <MenuLink
                href="/mypage"
                label="마이페이지"
                onClick={() => setOpen(false)}
              />
              <MenuLink
                href="/mypage?tab=all"
                label="상담 내역"
                onClick={() => setOpen(false)}
              />
            </>
          )}

          <button
            onClick={() => {
              setOpen(false);
              signOut();
              router.push("/");
            }}
            className="block w-full text-left px-4 py-3 text-[15px] font-medium text-text-muted hover:text-danger hover:bg-surface-subtle border-t border-surface-line transition-colors duration-500 ease-luxe"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-3 text-[15px] font-medium text-navy-900 hover:text-gold hover:bg-surface-subtle transition-colors duration-500 ease-luxe"
    >
      {label}
    </Link>
  );
}
