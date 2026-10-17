import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAppMode } from "@/lib/config";
import { getSessionSecret } from "@/lib/session";
import { getStaffSession } from "@/lib/server/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { Logo, LogoMark } from "@/components/site/Logo";

export const metadata: Metadata = { title: "관리자 로그인", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getStaffSession()) redirect("/admin");
  const mode = getAppMode();
  const setupIssues: string[] = [];
  if (!getSessionSecret()) setupIssues.push("APP_SECRET(32자 이상)");
  if (mode === "demo" && !process.env.DEMO_ADMIN_PASSWORD) setupIssues.push("DEMO_ADMIN_PASSWORD");
  if (mode !== "demo" && (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY)) setupIssues.push("SUPABASE_URL / SUPABASE_ANON_KEY");

  return (
    <main id="main" className="grid min-h-[100svh] bg-navy-50 lg:grid-cols-[1fr_1.1fr]">
      <div className="hidden flex-col justify-between bg-navy p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-9 w-9 ring-1 ring-white/15" />
          <span className="text-[18px] font-extrabold tracking-[-0.02em]">내보험 통합 점검 CRM</span>
        </div>
        <div>
          <p className="text-[34px] font-extrabold leading-[1.3] tracking-[-0.03em]">
            동의 범위 안에서만,
            <br />
            기록이 남는 상담 관리
          </p>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-navy-300">
            연락처 원문 열람·상태 변경·내보내기는 모두 감사로그에 기록됩니다. 보장 분석 영업은 별도 동의한 고객에게만 진행합니다.
          </p>
        </div>
        <p className="text-[14px] text-navy-300">권한이 부여된 담당자만 접근할 수 있습니다.</p>
      </div>
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="rounded-[28px] bg-white p-7 shadow-card ring-1 ring-navy-100 sm:p-9">
            <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-navy">상담 관리자 로그인</h1>
            <p className="mt-1.5 text-[15px] text-navy-600">권한이 부여된 담당자만 접근할 수 있습니다.</p>
            <LoginForm mode={mode} setupIssues={setupIssues} />
          </div>
        </div>
      </div>
    </main>
  );
}
