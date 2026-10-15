import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAppMode } from "@/lib/config";
import { getSessionSecret } from "@/lib/session";
import { getStaffSession } from "@/lib/server/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { Logo } from "@/components/site/Logo";

export const metadata: Metadata = { title: "관리자 로그인", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getStaffSession()) redirect("/admin");
  const mode = getAppMode();
  const setupIssues: string[] = [];
  if (!getSessionSecret()) setupIssues.push("APP_SECRET(32자 이상)");
  if (mode === "demo" && !process.env.DEMO_ADMIN_PASSWORD) setupIssues.push("DEMO_ADMIN_PASSWORD");
  if (mode === "production" && (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)) setupIssues.push("SUPABASE_URL / SUPABASE_ANON_KEY");

  return (
    <main id="main" className="flex min-h-[100svh] items-center justify-center bg-navy-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-navy-200 bg-white p-6 shadow-card">
          <h1 className="text-[20px] font-extrabold text-navy">상담 관리자 로그인</h1>
          <p className="mt-1 text-[13.5px] text-navy-500">권한이 부여된 담당자만 접근할 수 있습니다.</p>
          <LoginForm mode={mode} setupIssues={setupIssues} />
        </div>
      </div>
    </main>
  );
}
