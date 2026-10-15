import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/server/auth";
import { repo, toPrivacyRequest } from "@/lib/server/repo";
import { recordStaffAudit } from "@/lib/server/service";
import { can } from "@/lib/session";
import { PRIVACY_REQUEST_STATUS_LABEL, PRIVACY_REQUEST_TYPE_LABEL } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PrivacyRequestActions } from "@/components/admin/PrivacyRequestActions";

export default async function PrivacyRequestsPage() {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  const requests = (await repo().listPrivacyRequests()).map(toPrivacyRequest);
  await recordStaffAudit(session, "privacy.list", `철회·삭제 요청 목록 조회 ${requests.length}건`);
  const canHandle = can(session.role, "handlePrivacy");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-navy">동의 철회 · 삭제 요청</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-navy-600">
          마케팅·보장 분석 동의 철회는 접수 즉시 자동 반영됩니다. 삭제 요청은 즉시 연락 대상에서 제외되며, 본인 확인 후 &lsquo;완료&rsquo; 처리하면 식별
          정보가 파기됩니다.
        </p>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white shadow-card ring-1 ring-navy-100">
        <table className="w-full min-w-[960px] text-left text-[14px]">
          <thead className="border-b border-navy-100 bg-navy-50/70 text-[13px] font-semibold text-navy-600">
            <tr>
              <th scope="col" className="px-4 py-3">접수일시</th>
              <th scope="col" className="px-4 py-3">요청 유형</th>
              <th scope="col" className="px-4 py-3">요청자</th>
              <th scope="col" className="px-4 py-3">일치 신청</th>
              <th scope="col" className="px-4 py-3">상태</th>
              <th scope="col" className="px-4 py-3">처리자 / 메모</th>
              <th scope="col" className="px-4 py-3">처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-navy-500">
                  접수된 요청이 없습니다.
                </td>
              </tr>
            )}
            {requests.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-navy-600">{formatDateTime(r.createdAt)}</td>
                <td className="px-4 py-3 font-semibold text-navy">{PRIVACY_REQUEST_TYPE_LABEL[r.type]}</td>
                <td className="whitespace-nowrap px-4 py-3 text-navy-700">
                  {r.name} <span className="font-mono text-navy-500">{r.phoneMasked}</span>
                </td>
                <td className="px-4 py-3 text-navy-600">{r.matchedLeadIds.length}건</td>
                <td className="px-4 py-3">
                  <Badge variant={r.status === "completed" ? "mint" : r.status === "rejected" ? "default" : "caution"}>
                    {PRIVACY_REQUEST_STATUS_LABEL[r.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-navy-600">
                  {r.handledBy ?? "-"} {r.handledAt ? `· ${formatDateTime(r.handledAt)}` : ""}
                  <div className="text-[13px] text-navy-600">{r.note}</div>
                </td>
                <td className="px-4 py-3">
                  {canHandle ? <PrivacyRequestActions id={r.id} status={r.status} type={r.type} /> : <span className="text-navy-500">관리자 전용</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
