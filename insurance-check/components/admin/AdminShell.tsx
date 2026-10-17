import Link from "next/link";
import { BarChart3, ClipboardList, FileClock, MessageSquareQuote, Settings, ShieldCheck, Target } from "lucide-react";
import type { StaffSession } from "@/lib/session";
import { can } from "@/lib/session";
import { STAFF_ROLE_LABEL, TRIAL_LABEL, type TrialMode } from "@/lib/types";
import { LogoMark } from "@/components/site/Logo";
import { LogoutButton } from "./LogoutButton";
import { NavLink } from "./NavLink";

export function AdminShell({ session, trial, children }: { session: StaffSession; trial: TrialMode; children: React.ReactNode }) {
  const nav = [
    { href: "/admin", label: "상담 DB", icon: ClipboardList, show: true },
    { href: "/admin?view=sales", label: "보장 분석 영업 대상", icon: Target, show: true },
    { href: "/admin/performance", label: "광고 성과", icon: BarChart3, show: true },
    { href: "/admin/reviews", label: "후기·지급 사례", icon: MessageSquareQuote, show: true },
    { href: "/admin/privacy", label: "철회·삭제 요청", icon: ShieldCheck, show: true },
    { href: "/admin/audit", label: "감사로그", icon: FileClock, show: can(session.role, "viewAudit") },
    { href: "/admin/settings", label: "환경설정·배포 체크", icon: Settings, show: can(session.role, "viewSettings") },
  ].filter((n) => n.show);

  return (
    <div className="min-h-[100svh] bg-navy-50 lg:grid lg:grid-cols-[256px_minmax(0,1fr)] lg:bg-[linear-gradient(to_right,#102B4E_256px,#F4F7FB_256px)]">
      <aside className="bg-navy text-white lg:sticky lg:top-0 lg:flex lg:h-[100svh] lg:flex-col">
        <div className="flex items-center justify-between gap-2 px-4 py-4 lg:block lg:px-6 lg:pb-6 lg:pt-7">
          <Link prefetch={false} href="/admin" className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8 rounded-[10px] ring-1 ring-white/15" />
            <span className="text-[17px] font-extrabold tracking-[-0.02em]">점검 CRM</span>
            {trial && <span className="rounded-full bg-caution-50 px-2 py-0.5 text-[13px] font-bold text-caution">{TRIAL_LABEL[trial]}</span>}
          </Link>
          <div className="text-right lg:hidden">
            <p className="text-[14px] font-semibold">{session.name}</p>
            <p className="text-[13px] text-navy-300">{STAFF_ROLE_LABEL[session.role]}</p>
          </div>
        </div>
        <nav aria-label="관리자 메뉴" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:px-3 lg:pb-0">
          {nav.map((n) => (
            <NavLink key={n.href} href={n.href}>
              <n.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 px-4 py-5 lg:block">
          <div className="flex items-center gap-3 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[15px] font-bold" aria-hidden="true">
              {session.name.replace("데모 ", "").slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{session.name}</p>
              <p className="text-[13px] text-navy-300">{STAFF_ROLE_LABEL[session.role]}</p>
            </div>
          </div>
          <LogoutButton className="mt-3 text-navy-300 hover:bg-white/10 hover:text-white" />
        </div>
      </aside>
      <div className="min-w-0">
        <main id="main" className="mx-auto max-w-[1520px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
        <div className="px-4 pb-8 lg:hidden">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
