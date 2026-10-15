import { redirect } from "next/navigation";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { getReadiness } from "@/lib/config";
import { getStaffSession } from "@/lib/server/auth";
import { notifyStatus } from "@/lib/server/notify";
import { can } from "@/lib/session";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const GROUP_LABEL = { operator: "운영 주체·고지 정보", infra: "인프라·보안", approvals: "소속 GA 승인 기록" } as const;

/** 값 자체(특히 비밀키)는 화면에 내보내지 않고 설정 여부만 보여준다. */
export default async function SettingsPage() {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  if (!can(session.role, "viewSettings")) return <Alert tone="error" title="환경설정은 관리자만 열람할 수 있습니다." />;
  const { mode, items, ready } = getReadiness();
  const notify = notifyStatus();
  const done = items.filter((i) => i.ok).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-navy">환경설정 · 배포 체크리스트</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-navy-600">
          설정은 서버 환경변수로 관리합니다(.env.example 참고). 이 화면은 설정 여부만 표시하며 값·비밀키는 노출하지 않습니다.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white shadow-card ring-1 ring-navy-100 p-4">
          <p className="text-[13px] text-navy-600">현재 모드</p>
          <p className="mt-1 text-[18px] font-extrabold text-navy">{mode === "demo" ? "데모" : "운영"}</p>
        </div>
        <div className="rounded-2xl bg-white shadow-card ring-1 ring-navy-100 p-4">
          <p className="text-[13px] text-navy-600">운영 준비</p>
          <p className="mt-1 text-[18px] font-extrabold text-navy">
            {done} / {items.length}
          </p>
        </div>
        <div className="rounded-2xl bg-white shadow-card ring-1 ring-navy-100 p-4">
          <p className="text-[13px] text-navy-600">담당자 알림(문자·알림톡)</p>
          <p className="mt-1 text-[17px] font-bold text-navy">{notify.provider ? `${notify.provider} (어댑터 미구현 — 발송 안 함)` : "미설정 — 발송 안 함"}</p>
        </div>
      </div>

      {mode === "production" && !ready && (
        <Alert tone="error" title="운영 모드지만 필수 항목이 비어 있어 신청 접수가 잠겨 있습니다.">
          아래 미완료 항목을 채운 뒤 재배포하세요. 소속 GA의 광고·개인정보 사전 승인 전에는 운영 배포를 하지 마세요.
        </Alert>
      )}
      {mode === "demo" && (
        <Alert tone="caution" title="데모 모드">
          가짜 데이터로만 동작합니다. 운영 전환은 APP_MODE=production + 아래 모든 항목 완료 + <code>npm run check:deploy</code> 통과가 조건입니다.
        </Alert>
      )}

      {(["approvals", "operator", "infra"] as const).map((g) => (
        <section key={g} aria-labelledby={`g-${g}`} className="rounded-2xl bg-white shadow-card ring-1 ring-navy-100">
          <h2 id={`g-${g}`} className="border-b border-navy-100 px-4 py-3 text-[17px] font-bold text-navy">
            {GROUP_LABEL[g]}
          </h2>
          <ul className="divide-y divide-navy-100">
            {items
              .filter((i) => i.group === g)
              .map((i) => (
                <li key={i.key} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[14px]">
                  {i.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-mint-700" aria-label="완료" />
                  ) : (
                    <CircleDashed className="h-4 w-4 text-caution" aria-label="미완료" />
                  )}
                  <span className="min-w-[200px] flex-1 text-navy">{i.label}</span>
                  <code className="text-[13px] text-navy-600">{i.key}</code>
                  {!i.ok && <Badge variant="caution">{i.hint}</Badge>}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
