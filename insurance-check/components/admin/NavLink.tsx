"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * 관리자 화면의 모든 Link는 prefetch={false}.
 * 프로덕션 프리페치가 서버 렌더를 일으키면 실제로 열지 않은 화면이 '열람'으로 감사로그에 남는다.
 */
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const [path, query] = href.split("?");
  const sales = sp.get("view") === "sales";
  const active = path === pathname && (query ? sales : pathname !== "/admin" || !sales);
  return (
    <Link prefetch={false}
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-colors",
        active ? "bg-white/10 text-white" : "text-navy-300 hover:bg-white/5 hover:text-white",
      )}
    >
      {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 hidden w-[3px] rounded-full bg-blue-300 lg:block" />}
      {children}
    </Link>
  );
}
