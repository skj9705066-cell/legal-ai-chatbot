"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "./AuthProvider";
import BottomNav from "./BottomNav";
import TopNav from "./TopNav";

const BOTTOM_NAV_ROUTES = [
  /^\/$/,
  /^\/mypage(\?|$|\/)/,
  /^\/lawyer\/dashboard/,
  /^\/lawyers(\/|$)/,
  /^\/chat\/rooms(\/|$)/,
  /^\/blog(\/|$)/,
];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const isAdmin = pathname.startsWith("/admin");
  const showBottomNav =
    !isAdmin && BOTTOM_NAV_ROUTES.some((r) => r.test(pathname));

  if (isAdmin) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  const isHome = pathname === "/";

  return (
    <AuthProvider>
      {!isHome && <TopNav />}
      <div className={showBottomNav ? "pb-20" : undefined}>
        {children}
      </div>
      {showBottomNav && <BottomNav />}
    </AuthProvider>
  );
}
