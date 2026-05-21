"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const isLogin = pathname === "/admin/login";

  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    getAdminSession().then((session) => {
      if (!mounted) return;
      if (!session && !isLogin) {
        router.replace("/admin/login");
        return;
      }
      if (session && isLogin) {
        router.replace("/admin");
        return;
      }
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [isLogin, router]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  if (isLogin) {
    return <>{children}</>;
  }

  if (!ready) {
    return <div className="min-h-screen bg-[#F4F5F7]" />;
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-[#E5E8EB]">
        <div className="px-4 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] text-[#191F28]"
            aria-label="메뉴 열기"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <p className="text-[16px] font-bold tracking-tight text-[#191F28]">
            법률<span className="text-[#4338CA]">AI</span> 관리자
          </p>
          <div className="w-10" aria-hidden />
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40 animate-fade-in"
            aria-hidden
          />
          <div className="relative h-full">
            <AdminSidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block lg:w-64 lg:shrink-0">
          <div className="sticky top-0 h-screen">
            <AdminSidebar />
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 lg:p-8">
          <div className="max-w-[1200px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
