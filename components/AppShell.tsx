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

  return (
    <AuthProvider>
      <TopNav />
      <div className={showBottomNav ? "pb-20 lg:pb-0" : undefined}>
        {children}
      </div>
      {showBottomNav && (
        <div className="lg:hidden">
          <BottomNav />
        </div>
      )}
    </AuthProvider>
  );
}
