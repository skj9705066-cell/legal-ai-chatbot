"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const [path, query] = href.split("?");
  const active = path === pathname && (query ? sp.toString().includes(query) : pathname !== "/admin" || sp.get("view") !== "sales");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-medium",
        active ? "bg-navy text-white" : "text-navy-600 hover:bg-navy-50 hover:text-navy",
      )}
    >
      {children}
    </Link>
  );
}
