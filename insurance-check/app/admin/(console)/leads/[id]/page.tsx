import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getStaffSession } from "@/lib/server/auth";
import { getLeadForStaff } from "@/lib/server/service";
import { isSalesEligible } from "@/lib/server/repo/filter";
import { repo } from "@/lib/server/repo";
import { can } from "@/lib/session";
import { SERVICE_CONTENT } from "@/lib/content";
import {
  CLAIM_STATUS_LABEL,
  CONTACT_METHOD_LABEL,
  COVERAGE_STATUS_LABEL,
  PREFERRED_TIME_LABEL,
  PRIVACY_STATUS_LABEL,
  STAFF_ROLE_LABEL,
} from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LeadEditor, RevealPhone } from "@/components/admin/LeadEditor";

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 text-[15px] sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-navy-600">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  const { id } = await params;
  const lead = await getLeadForStaff(session, id);
  if (!lead) notFound();
  const history = await repo().listAudit({ target: id, limit: 50 });
  const eligible = isSalesEligible(lead);
  const a = lead.attribution;

  return (
    <div className="space-y-6">
      <Link prefetch={false} href="/admin" className="inline-flex items-center gap-1 text-[14px] font-medium text-navy-600 hover:text-navy">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        상담 DB
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-mono text-[26px] font-extrabold tracking-[-0.03em] text-navy">{lead.refNo}</h1>
        {lead.isDemo && <Badge variant="demo">데모</Badge>}
        {lead.isTest && <Badge>테스트 · 지표 제외</Badge>}
        {lead.duplicateOf && <Badge variant="caution">중복 · 최초 {lead.duplicateOf}</Badge>}
        {lead.privacyStatus !== "none" && <Badge variant="danger">{PRIVACY_STATUS_LABEL[lead.privacyStatus]}</Badge>}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl p-6">
          <h2 className="text-[17px] font-bold text-navy">신청 정보</h2>
          <dl className="mt-2 divide-y divide-navy-100">
            <Item label="접수일시">{formatDateTime(lead.createdAt)}</Item>
            <Item label="점검 유형">{SERVICE_CONTENT[lead.serviceType].title}</Item>
            <Item label="고객명">{lead.name}</Item>
            <Item label="연락처">
              <RevealPhone leadId={lead.id} masked={lead.phoneMasked} allowed={can(session.role, "revealPhone")} />
            </Item>
            <Item label="상담 희망 시간">{PREFERRED_TIME_LABEL[lead.preferredTime]}</Item>
            <Item label="상담 메모">{lead.memo || "-"}</Item>
            <Item label="유입">
              {a.utmSource ?? "(direct)"} / {a.utmMedium ?? "-"} / {a.utmCampaign ?? "-"}
              {a.utmContent || a.utmTerm ? ` / ${a.utmContent ?? "-"} / ${a.utmTerm ?? "-"}` : ""}
              <div className="text-[13px] text-navy-600">
                referrer: {a.referrer ?? "-"} · landing: {a.landingPath ?? "-"}
              </div>
            </Item>
          </dl>
        </Card>
        <Card className="rounded-2xl p-6">
          <h2 className="text-[17px] font-bold text-navy">동의 내역</h2>
          <dl className="mt-2 divide-y divide-navy-100">
            <Item label="개인정보(필수)">동의 · {lead.privacyConsentVersion}</Item>
            <Item label="광고성 정보(선택)">{lead.marketingConsent ? "동의" : "미동의/철회"}</Item>
            <Item label="보장 분석(별도)">
              {lead.coverageConsent ? (
                <>
                  동의 · {formatDateTime(lead.coverageConsentAt)} · {lead.coverageConsentVersion}
                  <div className="text-[13px] text-navy-600">
                    연락 방법: {lead.coverageContactMethod ? CONTACT_METHOD_LABEL[lead.coverageContactMethod] : "-"}
                  </div>
                </>
              ) : (
                <span className="text-navy-500">{COVERAGE_STATUS_LABEL[lead.coverageStatus]} — 영업 대상 아님</span>
              )}
            </Item>
            <Item label="현재 상태">
              점검: {CLAIM_STATUS_LABEL[lead.claimStatus]} · 보장 분석: {COVERAGE_STATUS_LABEL[lead.coverageStatus]}
            </Item>
          </dl>
        </Card>
      </div>

      <Card className="rounded-2xl p-6">
        <h2 className="mb-4 text-[17px] font-bold text-navy">처리</h2>
        <LeadEditor lead={lead} role={session.role} salesEligible={eligible} canEdit={can(session.role, "edit")} />
      </Card>

      <Card className="rounded-2xl p-6">
        <h2 className="text-[17px] font-bold text-navy">접근·처리 이력</h2>
        <ul className="mt-3 divide-y divide-navy-100 text-[14px]">
          {history.map((h) => (
            <li key={h.id} className="flex flex-wrap gap-x-3 gap-y-0.5 py-2">
              <span className="whitespace-nowrap text-navy-500">{formatDateTime(h.at)}</span>
              <span className="font-semibold text-navy">
                {h.actor}
                {h.role in STAFF_ROLE_LABEL ? ` (${STAFF_ROLE_LABEL[h.role as keyof typeof STAFF_ROLE_LABEL]})` : ""}
              </span>
              <span className="font-mono text-[13px] text-navy-600">{h.action}</span>
              <span className="text-navy-600">{h.detail}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
