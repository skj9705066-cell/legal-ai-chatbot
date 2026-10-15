import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { SERVICE_CONTENT } from "@/lib/content";
import { isSalesEligible } from "@/lib/server/repo/filter";
import { can } from "@/lib/session";
import {
  CLAIM_STATUSES,
  CLAIM_STATUS_LABEL,
  CONTACT_METHOD_LABEL,
  COVERAGE_ACTIVE_STATUSES,
  COVERAGE_STATUS_LABEL,
  PREFERRED_TIME_LABEL,
  type Lead,
  type StaffRole,
} from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { RevealPhone } from "./LeadEditor";
import { StatusSelect } from "./StatusSelect";
import { CoverageStatusBadge, Panel } from "./ui";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <dt className="text-[13px] font-medium text-navy-600">{label}</dt>
      <dd className="mt-1 text-[15px] text-ink">{children}</dd>
    </div>
  );
}

/** 목록에서 고객명을 누르면 열리는 상세 정보 패널 (열람은 감사로그에 기록). */
export function LeadPanel({ lead, role, closeHref }: { lead: Lead; role: StaffRole; closeHref: string }) {
  const eligible = isSalesEligible(lead);
  const canEdit = can(role, "edit");
  const a = lead.attribution;
  return (
    <Panel className="xl:sticky xl:top-8" aria-labelledby="lead-panel-title">
      <div className="flex items-start justify-between gap-3 border-b border-navy-100 px-5 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[13px] font-semibold text-navy-600">{lead.refNo}</p>
          <h2 id="lead-panel-title" className="mt-0.5 text-[20px] font-bold text-navy">
            {lead.name}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="blue">{SERVICE_CONTENT[lead.serviceType].shortTitle}</Badge>
            {lead.duplicateOf && <Badge variant="caution">중복 · {lead.duplicateOf}</Badge>}
            {lead.isDemo && <Badge variant="demo">데모</Badge>}
          </div>
        </div>
        <Link prefetch={false} href={closeHref} scroll={false} aria-label="패널 닫기" className="rounded-lg p-1.5 text-navy-500 hover:bg-navy-50 hover:text-navy">
          <X className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
      <dl className="divide-y divide-navy-100 px-5">
        <Row label="연락처">
          <RevealPhone leadId={lead.id} masked={lead.phoneMasked} allowed={can(role, "revealPhone")} />
        </Row>
        <Row label="접수 · 희망 시간">
          {formatDateTime(lead.createdAt)} · {PREFERRED_TIME_LABEL[lead.preferredTime]}
        </Row>
        <Row label="유입">
          {a.utmSource ?? "(direct)"} / {a.utmMedium ?? "-"} / {a.utmCampaign ?? "-"}
        </Row>
        <Row label="보험금 점검 상태">
          {canEdit ? (
            <StatusSelect
              key={lead.claimStatus}
              leadId={lead.id}
              field="claimStatus"
              value={lead.claimStatus}
              label="보험금 점검 상태"
              options={CLAIM_STATUSES.map((s) => ({ value: s, label: CLAIM_STATUS_LABEL[s] }))}
            />
          ) : (
            CLAIM_STATUS_LABEL[lead.claimStatus]
          )}
        </Row>
        <Row label="보장 분석 (별도 동의)">
          {lead.coverageConsent ? (
            <span className="mb-2 block text-[14px] text-navy-600">
              동의 {formatDateTime(lead.coverageConsentAt)}
              {lead.coverageContactMethod && ` · ${CONTACT_METHOD_LABEL[lead.coverageContactMethod]}`}
            </span>
          ) : null}
          {canEdit && eligible ? (
            <StatusSelect
              key={lead.coverageStatus}
              leadId={lead.id}
              field="coverageStatus"
              value={lead.coverageStatus}
              label="보장 분석 상태"
              options={COVERAGE_ACTIVE_STATUSES.map((s) => ({ value: s, label: COVERAGE_STATUS_LABEL[s], disabled: s === "contracted" && role !== "admin" }))}
            />
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <CoverageStatusBadge status={lead.coverageStatus} />
              {!eligible && <span className="text-[13px] text-navy-600">영업 대상 아님</span>}
            </span>
          )}
        </Row>
        <Row label="상담 메모">{lead.memo || "-"}</Row>
        <Row label="처리 메모">
          <span className="line-clamp-3 whitespace-pre-line">{lead.notes || "-"}</span>
        </Row>
      </dl>
      <div className="border-t border-navy-100 p-4">
        <Link prefetch={false} href={`/admin/leads/${lead.id}`} className={buttonVariants({ variant: "navy", size: "sm", className: "w-full" })}>
          전체 상세·처리 화면
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </Panel>
  );
}
