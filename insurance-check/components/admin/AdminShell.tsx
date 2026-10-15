import Link from "next/link";
import { BarChart3, ClipboardList, FileClock, Settings, ShieldCheck, Target } from "lucide-react";
import type { StaffSession } from "@/lib/session";
import { can } from "@/lib/session";
import { STAFF_ROLE_LABEL } from "@/lib/types";
import { LogoMark } from "@/components/site/Logo";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "./LogoutButton";
import { NavLink } from "./NavLink";

export function AdminShell({ session, demo, children }: { session: StaffSession; demo: boolean; children: React.ReactNode }) {
  const nav = [
    { href: "/admin", label: "상담 DB", icon: ClipboardList, show: true },
    { href: "/admin?view=sales", label: "보장 분석 영업 대상", icon: Target, show: true },
    { href: "/admin/performance", label: "광고 성과", icon: BarChart3, show: true },
    { href: "/admin/privacy", label: "철회·삭제 요청", icon: ShieldCheck, show: true },
    { href: "/admin/audit", label: "감사로그", icon: FileClock, show: can(session.role, "viewAudit") },
    { href: "/admin/settings", label: "환경설정·배포 체크", icon: Settings, show: can(session.role, "viewSettings") },
  ].filter((n) => n.show);

  return (
    <div className="min-h-[100svh] bg-navy-50/60 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-navy-200 bg-white lg:sticky lg:top-0 lg:h-[100svh] lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2 px-4 py-4 lg:block lg:px-5 lg:py-6">
          <Link href="/admin" className="flex items-center gap-2">
            <LogoMark className="h-7 w-7" />
            <span className="text-[15px] font-extrabold text-navy">점검 CRM</span>
            {demo && <Badge variant="demo">데모</Badge>}
          </Link>
          <div className="text-right lg:mt-5 lg:text-left">
            <p className="text-[13px] font-semibold text-navy">{session.name}</p>
            <p className="text-[12px] text-navy-500">{STAFF_ROLE_LABEL[session.role]}</p>
          </div>
        </div>
        <nav aria-label="관리자 메뉴" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3">
          {nav.map((n) => (
            <NavLink key={n.href} href={n.href}>
              <n.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-3 lg:block">
          <LogoutButton />
        </div>
      </aside>
      <div className="min-w-0">
        <main id="main" className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <div className="px-4 pb-8 lg:hidden">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
