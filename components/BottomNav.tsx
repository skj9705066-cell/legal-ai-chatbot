"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { generateId } from "@/lib/storage";
import { useAuth } from "./AuthProvider";
import LoginPromptModal from "./LoginPromptModal";

interface NavTab {
  key: string;
  label: string;
  href: string;
  match: (path: string) => boolean;
  action?: "newChat" | "mypage";
  icon: React.ReactNode;
}

const Icon = {
  blog: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 6h16M4 10h16M4 14h10M4 18h7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  aiChat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  lawyers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="9" cy="7" r="3.2" strokeLinejoin="round" />
      <circle cx="17" cy="7" r="3.2" strokeLinejoin="round" />
      <path d="M3 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1M14 14h4a3 3 0 0 1 3 3v1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="8" r="4" strokeLinejoin="round" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const USER_TABS: NavTab[] = [
  {
    key: "home",
    label: "홈",
    href: "/",
    match: (p) => p === "/",
    icon: Icon.home,
  },
  {
    key: "aiChat",
    label: "AI 상담",
    href: "/chat/new",
    match: (p) => p.startsWith("/chat") && !p.startsWith("/chat/rooms"),
    action: "newChat",
    icon: Icon.aiChat,
  },
  {
    key: "lawyers",
    label: "변호사",
    href: "/lawyers",
    match: (p) => p.startsWith("/lawyers") || p.startsWith("/matching"),
    icon: Icon.lawyers,
  },
  {
    key: "blog",
    label: "블로그",
    href: "/blog",
    match: (p) => p.startsWith("/blog"),
    icon: Icon.blog,
  },
  {
    key: "mypage",
    label: "마이",
    href: "/mypage",
    match: (p) => p.startsWith("/mypage"),
    action: "mypage",
    icon: Icon.user,
  },
];

const LAWYER_TABS: NavTab[] = [
  {
    key: "home",
    label: "홈",
    href: "/",
    match: (p) => p === "/",
    icon: Icon.home,
  },
  {
    key: "dashboard",
    label: "사건",
    href: "/lawyer/dashboard",
    match: (p) => p.startsWith("/lawyer/dashboard"),
    icon: Icon.lawyers,
  },
  {
    key: "chatRooms",
    label: "채팅",
    href: "/chat/rooms",
    match: (p) => p.startsWith("/chat/rooms"),
    icon: Icon.chat,
  },
  {
    key: "mypage",
    label: "마이",
    href: "/mypage",
    match: (p) => p.startsWith("/mypage") || p.startsWith("/lawyer/register"),
    action: "mypage",
    icon: Icon.user,
  },
];

export default function BottomNav() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { account, loading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const isLawyer = account?.type === "lawyer";
  const TABS = isLawyer ? LAWYER_TABS : USER_TABS;

  const myTabHref = !account
    ? "/login?next=/mypage"
    : isLawyer
      ? "/lawyer/dashboard"
      : "/mypage";
  const myTabLabel = !account ? "로그인" : "마이";

  function handleClick(e: React.MouseEvent, tab: NavTab) {
    if (tab.action === "newChat") {
      e.preventDefault();
      // 비로그인 시 모달 표시
      if (!account && !loading) {
        setShowLoginModal(true);
        return;
      }
      router.push(`/chat/${generateId()}`);
      return;
    }
    if (tab.action === "mypage") {
      e.preventDefault();
      if (loading) return;
      router.push(myTabHref);
    }
  }

  return (
    <>
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-surface-line" aria-label="주요 메뉴">
      <ul className="max-w-md mx-auto px-2 grid grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const isMyTab = tab.key === "mypage";
          const href = isMyTab ? myTabHref : tab.href;
          const label = isMyTab ? myTabLabel : tab.label;
          return (
            <li key={tab.key} className="relative">
              {active && (
                <span className="absolute left-1/2 -translate-x-1/2 top-0 h-[2px] w-8 bg-[#4338CA] rounded-full" />
              )}
              <Link
                href={href}
                onClick={(e) => handleClick(e, tab)}
                className={`flex flex-col items-center justify-center gap-1 pt-3 pb-2.5 transition-colors duration-200 ${active ? "text-[#4338CA]" : "text-[#8B95A1] hover:text-[#191F28]"}`}
              >
                <span className="relative w-6 h-6">
                  {tab.icon}
                  {isMyTab && !account && !loading && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#4338CA]" />
                  )}
                </span>
                <span className="text-[12px] font-semibold tracking-luxe">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-safe-bottom bg-white" />
    </nav>
    <LoginPromptModal
      isOpen={showLoginModal}
      onClose={() => setShowLoginModal(false)}
    />
    </>
  );
}
