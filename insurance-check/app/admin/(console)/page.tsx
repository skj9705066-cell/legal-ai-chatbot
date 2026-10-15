import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Copy, Download } from "lucide-react";
import { getStaffSession } from "@/lib/server/auth";
import { listLeadsForStaff } from "@/lib/server/service";
import { isSalesEligible } from "@/lib/server/repo/filter";
import { parseLeadQuery } from "@/lib/lead-query";
import { can } from "@/lib/session";
import { SERVICE_CONTENT } from "@/lib/content";
import {
  CLAIM_STATUSES,
  CLAIM_STATUS_LABEL,
  COVERAGE_ACTIVE_STATUSES,
  COVERAGE_STATUSES,
  COVERAGE_STATUS_LABEL,
  PREFERRED_TIME_LABEL,
  PRIVACY_STATUSES,
  PRIVACY_STATUS_LABEL,
  SERVICE_TYPES,
} from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StatusSelect } from "@/components/admin/StatusSelect";

type SP = Promise<Record<string, string | string[] | undefined>>;

const selectCls =
  "h-10 rounded-lg border border-navy-200 bg-white px-2.5 text-[14px] text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-blue";

export default async function LeadsPage({ searchParams }: { searchParams: SP }) {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  const sp = await searchParams;
  const query = parseLeadQuery(sp);
  const leads = await listLeadsForStaff(session, query);
  const canEdit = can(session.role, "edit");
  const sales = !!query.salesOnly;

  const exportQs = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && v ? [[k, v]] : [])),
  ).toString();
  const today = new Date().toISOString().slice(0, 10);
  const stats = [
    { label: "조회 결과", value: leads.length },
    { label: "신규 접수", value: leads.filter((l) => l.claimStatus === "new").length },
    { label: "오늘 연락 예정", value: leads.filter((l) => l.nextContactAt?.slice(0, 10) === today).length },
    { label: "보장 분석 동의", value: leads.filter((l) => isSalesEligible(l)).length },
    { label: "중복 의심", value: leads.filter((l) => l.duplicateOf).length },
    { label: "철회·삭제 요청", value: leads.filter((l) => l.privacyStatus !== "none").length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-navy">{sales ? "보장 분석 영업 대상" : "상담 DB"}</h1>
          <p className="mt-1 text-[13.5px] text-navy-500">
            {sales
              ? "보장 분석에 별도 동의했고 철회·삭제 요청이 없는 고객만 표시됩니다. 미동의 고객은 자동 등록되지 않습니다."
              : "연락처는 마스킹되어 표시되며, 원문 열람은 상세 화면에서 권한자만 가능하고 기록됩니다."}
          </p>
        </div>
        {can(session.role, "exportCsv") && (
          <a href={`/api/admin/export${exportQs ? `?${exportQs}` : ""}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Download className="h-4 w-4" aria-hidden="true" />
            CSV 내보내기
          </a>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-navy-200 bg-white px-4 py-3">
            <dt className="text-[12.5px] font-medium text-navy-500">{s.label}</dt>
            <dd className="mt-0.5 text-[22px] font-extrabold tabular-nums text-navy">{s.value}</dd>
          </div>
        ))}
      </dl>

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-xl border border-navy-200 bg-white p-3" aria-label="필터">
        {sales && <input type="hidden" name="view" value="sales" />}
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[12.5px] font-semibold text-navy-600">
          검색 (이름·신청번호·전화번호)
          <input name="q" defaultValue={query.q ?? ""} className={selectCls} placeholder="예) 데모고객 / IC- / 010-..." />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-navy-600">
          점검 유형
          <select name="type" defaultValue={query.serviceType ?? ""} className={selectCls}>
            <option value="">전체</option>
            {SERVICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {SERVICE_CONTENT[t].shortTitle}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-navy-600">
          점검 상태
          <select name="claim" defaultValue={query.claimStatus ?? ""} className={selectCls}>
            <option value="">전체</option>
            {CLAIM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CLAIM_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-navy-600">
          보장 분석 상태
          <select name="coverage" defaultValue={query.coverageStatus ?? ""} className={selectCls}>
            <option value="">전체</option>
            {COVERAGE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {COVERAGE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-navy-600">
          개인정보 요청
          <select name="privacy" defaultValue={query.privacyStatus ?? ""} className={selectCls}>
            <option value="">전체</option>
            {PRIVACY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "none" ? "요청 없음" : PRIVACY_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px] font-semibold text-navy-600">
          정렬
          <select name="sort" defaultValue={query.sort ?? "newest"} className={selectCls}>
            <option value="newest">최신 접수순</option>
            <option value="oldest">오래된 접수순</option>
            <option value="next_contact">다음 연락 일정순</option>
          </select>
        </label>
        <label className="flex h-10 items-center gap-2 px-1 text-[13.5px] font-medium text-navy">
          <input type="checkbox" name="dup" value="1" defaultChecked={query.duplicatesOnly} className="h-4 w-4 accent-blue" />
          중복만
        </label>
        <button type="submit" className={buttonVariants({ variant: "navy", size: "sm", className: "h-10" })}>
          적용
        </button>
        <Link href={sales ? "/admin?view=sales" : "/admin"} className={buttonVariants({ variant: "ghost", size: "sm", className: "h-10" })}>
          초기화
        </Link>
      </form>

      <div className="overflow-x-auto rounded-xl border border-navy-200 bg-white">
        <table className="w-full min-w-[1400px] text-left text-[13px]">
          <caption className="sr-only">신청 목록 {leads.length}건</caption>
          <thead className="border-b border-navy-200 bg-navy-50 text-[12px] font-bold text-navy-600">
            <tr>
              {[
                "신청번호",
                "접수일",
                "유입 채널/UTM",
                "점검 유형",
                "고객명",
                "연락처",
                "희망 시간",
                "보험금 점검 상태",
                "보장 분석 동의",
                "보장 분석 상태",
                "다음 연락",
                "담당자",
                "처리 메모",
              ].map((h) => (
                <th key={h} scope="col" className="whitespace-nowrap px-3 py-2.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {leads.length === 0 && (
              <tr>
                <td colSpan={13} className="px-3 py-12 text-center text-navy-500">
                  조건에 맞는 신청이 없습니다.
                </td>
              </tr>
            )}
            {leads.map((l) => {
              const eligible = isSalesEligible(l);
              return (
                <tr key={l.id} className="align-top hover:bg-navy-50/50">
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <Link href={`/admin/leads/${l.id}`} className="font-mono font-semibold text-blue hover:underline">
                      {l.refNo}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {l.duplicateOf && (
                        <Badge variant="caution" title={`최초 신청 ${l.duplicateOf}`}>
                          <Copy className="h-3 w-3" aria-hidden="true" />
                          중복
                        </Badge>
                      )}
                      {l.privacyStatus !== "none" && (
                        <Badge variant="danger">
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                          {PRIVACY_STATUS_LABEL[l.privacyStatus]}
                        </Badge>
                      )}
                      {l.isDemo && <Badge variant="demo">데모</Badge>}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-navy-600">{formatDateTime(l.createdAt)}</td>
                  <td className="px-3 py-2.5 text-navy-600">
                    <div className="font-semibold text-navy">{l.attribution.utmSource ?? "(direct)"}</div>
                    <div className="text-[12px]">
                      {[l.attribution.utmMedium, l.attribution.utmCampaign].filter(Boolean).join(" / ") || "-"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">{SERVICE_CONTENT[l.serviceType].shortTitle}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-navy">{l.name}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-navy-600">{l.phoneMasked}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-navy-600">{PREFERRED_TIME_LABEL[l.preferredTime]}</td>
                  <td className="px-3 py-2.5">
                    {canEdit ? (
                      <StatusSelect
                        leadId={l.id}
                        field="claimStatus"
                        value={l.claimStatus}
                        label={`${l.refNo} 보험금 점검 상태`}
                        options={CLAIM_STATUSES.map((s) => ({ value: s, label: CLAIM_STATUS_LABEL[s] }))}
                      />
                    ) : (
                      CLAIM_STATUS_LABEL[l.claimStatus]
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {l.coverageConsent ? <Badge variant="mint">동의 {formatDate(l.coverageConsentAt)}</Badge> : <Badge>미동의</Badge>}
                  </td>
                  <td className="px-3 py-2.5">
                    {canEdit && eligible ? (
                      <StatusSelect
                        leadId={l.id}
                        field="coverageStatus"
                        value={l.coverageStatus}
                        label={`${l.refNo} 보장 분석 상태`}
                        options={COVERAGE_ACTIVE_STATUSES.map((s) => ({
                          value: s,
                          label: COVERAGE_STATUS_LABEL[s],
                          disabled: s === "contracted" && session.role !== "admin",
                        }))}
                      />
                    ) : (
                      <span className="text-navy-500">{COVERAGE_STATUS_LABEL[l.coverageStatus]}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-navy-600">{formatDate(l.nextContactAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-navy-600">{l.assignee ?? "-"}</td>
                  <td className="max-w-[220px] truncate px-3 py-2.5 text-navy-600" title={l.notes}>
                    {l.notes || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
