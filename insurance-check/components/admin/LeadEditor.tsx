"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2 } from "lucide-react";
import {
  CLAIM_STATUSES,
  CLAIM_STATUS_LABEL,
  COVERAGE_ACTIVE_STATUSES,
  COVERAGE_STATUS_LABEL,
  type Lead,
  type StaffRole,
} from "@/lib/types";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

export function LeadEditor({ lead, role, salesEligible, canEdit }: { lead: Lead; role: StaffRole; salesEligible: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [claimStatus, setClaimStatus] = useState(lead.claimStatus);
  const [coverageStatus, setCoverageStatus] = useState(lead.coverageStatus);
  const [nextContactAt, setNextContactAt] = useState(toLocalInput(lead.nextContactAt));
  const [assignee, setAssignee] = useState(lead.assignee ?? "");
  const [notes, setNotes] = useState(lead.notes);
  const [isTest, setIsTest] = useState(lead.isTest);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    const body: Record<string, unknown> = {
      claimStatus,
      nextContactAt: nextContactAt ? new Date(nextContactAt).toISOString() : null,
      assignee,
      notes,
    };
    if (salesEligible) body.coverageStatus = coverageStatus;
    if (role === "admin") body.isTest = isTest;
    const res = await fetch(`/api/admin/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setError(data?.error ?? "저장하지 못했습니다.");
      setState("error");
      return;
    }
    setState("saved");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <fieldset disabled={!canEdit || state === "saving"} className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-navy">
          보험금 점검 상태
          <Select value={claimStatus} onChange={(e) => setClaimStatus(e.target.value as Lead["claimStatus"])}>
            {CLAIM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CLAIM_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-navy">
          보장 분석 상태 {salesEligible ? "" : "(별도 동의 없음 — 변경 불가)"}
          <Select
            value={coverageStatus}
            disabled={!salesEligible}
            onChange={(e) => setCoverageStatus(e.target.value as Lead["coverageStatus"])}
          >
            {!salesEligible && <option value={lead.coverageStatus}>{COVERAGE_STATUS_LABEL[lead.coverageStatus]}</option>}
            {salesEligible &&
              COVERAGE_ACTIVE_STATUSES.map((s) => (
                <option key={s} value={s} disabled={s === "contracted" && role !== "admin"}>
                  {COVERAGE_STATUS_LABEL[s]}
                  {s === "contracted" && role !== "admin" ? " (관리자 전용)" : ""}
                </option>
              ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-navy">
          다음 연락 일정
          <Input type="datetime-local" value={nextContactAt} onChange={(e) => setNextContactAt(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-navy">
          담당자
          <Input value={assignee} maxLength={30} onChange={(e) => setAssignee(e.target.value)} placeholder="담당자 이름" />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-navy sm:col-span-2">
          처리 메모
          <Textarea value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} placeholder="상담 경과 (건강정보·주민등록번호 기록 금지)" />
        </label>
        {role === "admin" && (
          <label className="flex items-center gap-2 text-[14px] font-semibold text-navy sm:col-span-2">
            <input type="checkbox" checked={isTest} onChange={(e) => setIsTest(e.target.checked)} className="h-5 w-5 accent-blue" />
            내부 테스트 신청 (실제 운영 지표에서 제외)
          </label>
        )}
      </fieldset>
      {state === "error" && <Alert tone="error" role="alert" title={error} />}
      {state === "saved" && <Alert tone="success" role="status" title="저장되었습니다." />}
      {canEdit ? (
        <Button type="submit" variant="navy" disabled={state === "saving"}>
          {state === "saving" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          저장
        </Button>
      ) : (
        <p className="text-[13px] text-navy-500">열람 전용 권한입니다.</p>
      )}
    </form>
  );
}

export function RevealPhone({ leadId, masked, allowed }: { leadId: string; masked: string; allowed: boolean }) {
  const [phone, setPhone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[15px] font-semibold text-navy">{phone ?? masked}</span>
      {allowed && !phone && masked !== "***-****-****" && (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const res = await fetch(`/api/admin/leads/${leadId}/reveal`, { method: "POST" }).catch(() => null);
            const data = await res?.json().catch(() => null);
            setBusy(false);
            if (res?.ok && data?.phone) setPhone(data.phone);
            else setError(data?.error ?? "열람 실패");
          }}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
          원문 보기 (기록됨)
        </Button>
      )}
      {error && <span className="text-[13px] text-danger">{error}</span>}
    </div>
  );
}
