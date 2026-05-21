"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOutAdmin } from "@/lib/admin-auth";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/admin", label: "대시보드", icon: "📊", exact: true },
  { href: "/admin/lawyers", label: "변호사 관리", icon: "👨‍⚖️" },
  { href: "/admin/consultations", label: "상담 관리", icon: "💬" },
  { href: "/admin/matchings", label: "매칭 관리", icon: "🤝" },
  { href: "/admin/users", label: "회원 관리", icon: "👥" },
  { href: "/admin/settings", label: "설정", icon: "⚙️" },
];

export default function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  function handleLogout() {
    signOutAdmin();
    onNavigate?.();
    router.replace("/admin/login");
  }

  return (
    <aside className="w-64 bg-white border-r border-[#E5E8EB] flex flex-col h-full">
      <div className="px-6 py-6 border-b border-[#E5E8EB]">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="block text-[18px] font-bold tracking-tight text-[#191F28]"
        >
          법률<span className="text-[#4338CA]">AI</span>{" "}
          <span className="text-[#8B95A1] text-[13px] font-semibold align-middle">
            관리자
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 h-11 rounded-lg text-[14px] font-medium transition-colors duration-200 ${
                active
                  ? "bg-[#EEF2FF] text-[#4338CA]"
                  : "text-[#4E5968] hover:bg-[#F4F5F7]"
              }`}
            >
              <span className="text-[18px] leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[#E5E8EB]">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 h-11 rounded-lg text-[14px] font-medium text-[#4E5968] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors duration-200"
        >
          <span className="text-[18px] leading-none">🚪</span>
          로그아웃
        </button>
      </div>
    </aside>
  );
}
