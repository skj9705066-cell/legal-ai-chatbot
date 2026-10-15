import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/server/auth";
import { repo } from "@/lib/server/repo";
import { can } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";

export default async function AuditPage() {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  if (!can(session.role, "viewAudit")) {
    return <Alert tone="error" title="감사로그는 관리자만 열람할 수 있습니다." />;
  }
  const logs = await repo().listAudit({ limit: 300 });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-navy">감사로그</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-navy-600">로그인, 목록·상세 열람, 연락처 원문 열람, 상태 변경, CSV 내보내기, 철회·삭제 처리 이력 (최근 300건)</p>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-card ring-1 ring-navy-100">
        <table className="w-full min-w-[800px] text-left text-[14px]">
          <thead className="border-b border-navy-100 bg-navy-50/70 text-[13px] font-semibold text-navy-600">
            <tr>
              <th scope="col" className="px-4 py-3">일시</th>
              <th scope="col" className="px-4 py-3">주체</th>
              <th scope="col" className="px-4 py-3">역할</th>
              <th scope="col" className="px-4 py-3">행위</th>
              <th scope="col" className="px-4 py-3">대상</th>
              <th scope="col" className="px-4 py-3">내용</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-4 py-3 text-navy-600">{formatDateTime(l.at)}</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-navy">{l.actor}</td>
                <td className="px-4 py-3 text-navy-600">{l.role}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] text-navy-700">{l.action}</td>
                <td className="max-w-[140px] truncate px-4 py-3 font-mono text-[13px] text-navy-600" title={l.target ?? ""}>
                  {l.target ?? "-"}
                </td>
                <td className="px-4 py-3 text-navy-600">{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
