import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CalendarClock, Copy, Download, Handshake, Inbox, Search, ShieldAlert, Users } from "lucide-react";
import { getStaffSession } from "@/lib/server/auth";
import { getLeadForStaff, listLeadsForStaff } from "@/lib/server/service";
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
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { LeadPanel } from "@/components/admin/LeadPanel";
import { ClaimStatusBadge, CoverageStatusBadge, fieldCls, Kpi, PageHeader, Panel, tableCell, tableHead } from "@/components/admin/ui";

type SP = Promise<Record<string, string | string[] | undefined>>;

function hrefWith(sp: Record<string, string | string[] | undefined>, patch: Record<string, string | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) q.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) q.delete(k);
    else q.set(k, v);
  }
  const s = q.toString();
  return s ? `/admin?${s}` : "/admin";
}

export default async function LeadsPage({ searchParams }: { searchParams: SP }) {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  const sp = await searchParams;
  const query = parseLeadQuery(sp);
  const leads = await listLeadsForStaff(session, query);
  const canEdit = can(session.role, "edit");
  const sales = !!query.salesOnly;
  const selectedId = typeof sp.lead === "string" ? sp.lead : null;
  const selected = selectedId ? await getLeadForStaff(session, selectedId) : null;

  const exportQs = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && v && k !== "lead" ? [[k, v]] : [])),
  ).toString();
  const today = new Date().toISOString().slice(0, 10);
  const kpis = [
    { label: "조회 결과", value: leads.length, icon: <Users className="h-5 w-5" />, tone: "navy" as const },
    { label: "신규 접수", value: leads.filter((l) => l.claimStatus === "new").length, icon: <Inbox className="h-5 w-5" />, tone: "blue" as const },
    { label: "오늘 연락 예정", value: leads.filter((l) => l.nextContactAt?.slice(0, 10) === today).length, icon: <CalendarClock className="h-5 w-5" />, tone: "caution" as const },
    { label: "보장 분석 동의", value: leads.filter((l) => isSalesEligible(l)).length, icon: <Handshake className="h-5 w-5" />, tone: "mint" as const },
    { label: "중복 의심", value: leads.filter((l) => l.duplicateOf).length, icon: <Copy className="h-5 w-5" />, tone: "navy" as const },
    { label: "철회·삭제 요청", value: leads.filter((l) => l.privacyStatus !== "none").length, icon: <ShieldAlert className="h-5 w-5" />, tone: "danger" as const },
  ];
  const chips: { label: string; value: string | null }[] = [{ label: "전체", value: null }, ...CLAIM_STATUSES.map((s) => ({ label: CLAIM_STATUS_LABEL[s], value: s }))];

  return (
    <div className="space-y-6">
      <PageHeader
        title={sales ? "보장 분석 영업 대상" : "상담 DB"}
        description={
          sales
            ? "보장 분석에 별도 동의했고 철회·삭제 요청이 없는 고객만 표시됩니다. 미동의 고객은 자동 등록되지 않습니다."
            : "연락처는 마스킹되어 표시되며, 원문 열람은 권한자만 가능하고 모두 기록됩니다."
        }
        actions={
          can(session.role, "exportCsv") ? (
            <a href={`/api/admin/export${exportQs ? `?${exportQs}` : ""}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Download className="h-4 w-4" aria-hidden="true" />
              CSV 내보내기
            </a>
          ) : undefined
        }
      />

      <ul aria-label="주요 지표" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </ul>

      <Panel className="p-4 sm:p-5">
        <nav aria-label="보험금 점검 상태 필터" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {chips.map((c) => {
            const active = (query.claimStatus ?? null) === c.value;
            return (
              <Link prefetch={false}
                key={c.label}
                href={hrefWith(sp, { claim: c.value, lead: null })}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-[14px] font-semibold transition-colors",
                  active ? "bg-navy text-white" : "bg-navy-50 text-navy-600 hover:bg-navy-100",
                )}
              >
                {c.label}
              </Link>
            );
          })}
        </nav>
        <form method="get" className="mt-4 flex flex-wrap items-end gap-3 border-t border-navy-100 pt-4" aria-label="상세 필터">
          {sales && <input type="hidden" name="view" value="sales" />}
          {query.claimStatus && <input type="hidden" name="claim" value={query.claimStatus} />}
          <label className="flex min-w-[220px] flex-[2] flex-col gap-1.5 text-[13px] font-semibold text-navy-600">
            검색
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden="true" />
              <input name="q" defaultValue={query.q ?? ""} className={cn(fieldCls, "w-full pl-9")} placeholder="이름 · 신청번호 · 전화번호" />
            </span>
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-[13px] font-semibold text-navy-600">
            점검 유형
            <select name="type" defaultValue={query.serviceType ?? ""} className={cn(fieldCls, "select-chevron appearance-none pr-9")}>
              <option value="">전체</option>
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SERVICE_CONTENT[t].shortTitle}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-[13px] font-semibold text-navy-600">
            보장 분석 상태
            <select name="coverage" defaultValue={query.coverageStatus ?? ""} className={cn(fieldCls, "select-chevron appearance-none pr-9")}>
              <option value="">전체</option>
              {COVERAGE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {COVERAGE_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-[13px] font-semibold text-navy-600">
            개인정보 요청
            <select name="privacy" defaultValue={query.privacyStatus ?? ""} className={cn(fieldCls, "select-chevron appearance-none pr-9")}>
              <option value="">전체</option>
              {PRIVACY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "none" ? "요청 없음" : PRIVACY_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-[13px] font-semibold text-navy-600">
            정렬
            <select name="sort" defaultValue={query.sort ?? "newest"} className={cn(fieldCls, "select-chevron appearance-none pr-9")}>
              <option value="newest">최신 접수순</option>
              <option value="oldest">오래된 접수순</option>
              <option value="next_contact">다음 연락 일정순</option>
            </select>
          </label>
          <label className="flex h-11 items-center gap-2 px-1 text-[14px] font-medium text-ink">
            <input type="checkbox" name="dup" value="1" defaultChecked={query.duplicatesOnly} className="h-[18px] w-[18px] accent-blue" />
            중복만
          </label>
          <div className="flex gap-2">
            <button type="submit" className={buttonVariants({ variant: "navy", size: "sm", className: "h-11" })}>
              적용
            </button>
            <Link prefetch={false} href={sales ? "/admin?view=sales" : "/admin"} className={buttonVariants({ variant: "ghost", size: "sm", className: "h-11" })}>
              초기화
            </Link>
          </div>
        </form>
      </Panel>

      <div className={cn("grid gap-5", selected && "xl:grid-cols-[minmax(0,1fr)_380px]")}>
        {selected && (
          <div className="xl:order-2">
            <LeadPanel lead={selected} role={session.role} closeHref={hrefWith(sp, { lead: null })} />
          </div>
        )}
        <Panel className="min-w-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1360px]">
              <caption className="sr-only">신청 목록 {leads.length}건</caption>
              <thead className="border-b border-navy-100 bg-navy-50/70">
                <tr>
                  {["신청번호", "접수일", "유입 채널/UTM", "점검 유형", "고객명", "연락처", "희망 시간", "보험금 점검 상태", "보장 분석 동의", "보장 분석 상태", "다음 연락", "담당자", "처리 메모"].map((h) => (
                    <th key={h} scope="col" className={tableHead}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-16 text-center text-[15px] text-navy-500">
                      조건에 맞는 신청이 없습니다.
                    </td>
                  </tr>
                )}
                {leads.map((l) => {
                  const eligible = isSalesEligible(l);
                  const isSelected = selected?.id === l.id;
                  return (
                    <tr key={l.id} className={cn("transition-colors hover:bg-navy-50/60", isSelected && "bg-blue-50/60 hover:bg-blue-50/60")}>
                      <td className={cn(tableCell, "whitespace-nowrap")}>
                        <Link prefetch={false} href={`/admin/leads/${l.id}`} className="font-mono text-[14px] font-semibold text-blue-700 hover:underline">
                          {l.refNo}
                        </Link>
                        <div className="mt-1.5 flex flex-wrap gap-1">
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
                      <td className={cn(tableCell, "whitespace-nowrap text-navy-600")}>{formatDateTime(l.createdAt)}</td>
                      <td className={tableCell}>
                        <div className="font-semibold text-ink">{l.attribution.utmSource ?? "(direct)"}</div>
                        <div className="whitespace-nowrap text-[13px] text-navy-600">{[l.attribution.utmMedium, l.attribution.utmCampaign].filter(Boolean).join(" / ") || "-"}</div>
                      </td>
                      <td className={cn(tableCell, "whitespace-nowrap text-ink")}>{SERVICE_CONTENT[l.serviceType].shortTitle}</td>
                      <td className={cn(tableCell, "whitespace-nowrap")}>
                        <Link prefetch={false}
                          href={hrefWith(sp, { lead: l.id })}
                          scroll={false}
                          aria-label={`${l.name} 상세 패널 열기`}
                          className="font-semibold text-navy underline-offset-4 hover:text-blue-700 hover:underline"
                        >
                          {l.name}
                        </Link>
                      </td>
                      <td className={cn(tableCell, "whitespace-nowrap font-mono text-navy-600")}>{l.phoneMasked}</td>
                      <td className={cn(tableCell, "whitespace-nowrap text-navy-600")}>{PREFERRED_TIME_LABEL[l.preferredTime]}</td>
                      <td className={tableCell}>
                        {canEdit ? (
                          <StatusSelect
                            key={`${l.id}-${l.claimStatus}`}
                            leadId={l.id}
                            field="claimStatus"
                            value={l.claimStatus}
                            label={`${l.refNo} 보험금 점검 상태`}
                            options={CLAIM_STATUSES.map((s) => ({ value: s, label: CLAIM_STATUS_LABEL[s] }))}
                          />
                        ) : (
                          <ClaimStatusBadge status={l.claimStatus} />
                        )}
                      </td>
                      <td className={cn(tableCell, "whitespace-nowrap")}>
                        {l.coverageConsent ? <Badge variant="mint">동의 {formatDate(l.coverageConsentAt)}</Badge> : <Badge>미동의</Badge>}
                      </td>
                      <td className={tableCell}>
                        {canEdit && eligible ? (
                          <StatusSelect
                            key={`${l.id}-${l.coverageStatus}`}
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
                          <CoverageStatusBadge status={l.coverageStatus} />
                        )}
                      </td>
                      <td className={cn(tableCell, "whitespace-nowrap text-navy-600")}>{formatDate(l.nextContactAt)}</td>
                      <td className={cn(tableCell, "whitespace-nowrap text-navy-600")}>{l.assignee ?? "-"}</td>
                      <td className={cn(tableCell, "max-w-[220px] truncate text-navy-600")} title={l.notes}>
                        {l.notes || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
