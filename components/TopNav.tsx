"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AuthButtons from "./AuthButtons";
import LawselLogo from "./LawselLogo";
import { generateId } from "@/lib/storage";

interface NavItem {
  key: string;
  label: string;
  href: string;
  match: (p: string, search: string) => boolean;
  action?: "newChat";
}

const ITEMS: NavItem[] = [
  { key: "home", label: "홈", href: "/", match: (p) => p === "/" },
  {
    key: "chat",
    label: "AI 상담",
    href: "/chat/new",
    match: (p) => p.startsWith("/chat"),
    action: "newChat",
  },
  {
    key: "matching",
    label: "매칭",
    href: "/mypage?tab=matching",
    match: (p, s) =>
      p.startsWith("/matching") ||
      (p.startsWith("/mypage") && s.includes("tab=matching")),
  },
  {
    key: "blog",
    label: "블로그",
    href: "/blog",
    match: (p) => p.startsWith("/blog"),
  },
  {
    key: "mypage",
    label: "마이",
    href: "/mypage",
    match: (p, s) => p.startsWith("/mypage") && !s.includes("tab=matching"),
  },
];

export default function TopNav() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const search = typeof window !== "undefined" ? window.location.search : "";

  function handleClick(e: React.MouseEvent, item: NavItem) {
    if (item.action === "newChat") {
      e.preventDefault();
      router.push(`/chat/${generateId()}`);
    }
  }

  return (
    <header className="hidden lg:block sticky top-0 z-40 pt-safe-top bg-white border-b border-[#E5E8EB]">
      <div className="max-w-screen-xl mx-auto px-8 h-16 flex items-center justify-between gap-8">
        <Link href="/" className="shrink-0">
          <LawselLogo iconSize={28} textClass="text-[22px]" />
        </Link>

        <nav className="flex-1 flex items-center justify-center gap-1">
          {ITEMS.map((item) => {
            const active = item.match(pathname, search);
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={(e) => handleClick(e, item)}
                className={`relative px-5 h-16 flex items-center text-[15px] font-medium tracking-tight transition-colors duration-200 ${
                  active ? "text-[#4338CA] font-semibold" : "text-[#4E5968] hover:text-[#191F28]"
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute left-5 right-5 bottom-0 h-[2px] bg-[#4338CA] rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <AuthButtons size="md" />
        </div>
      </div>
    </header>
  );
}
