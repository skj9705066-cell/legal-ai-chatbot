"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { REVIEW_KINDS, REVIEW_KIND_LABEL, SERVICE_TYPES, type ReviewKind, type ServiceType } from "@/lib/types";
import { SERVICE_CONTENT } from "@/lib/content";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";

const label = "flex flex-col gap-1.5 text-[13px] font-semibold text-navy";

/** 후기 등록 — 저장하면 항상 '승인 대기'. 고객 실명·연락처는 입력하지 않는다. */
export function ReviewForm() {
  const router = useRouter();
  const [kind, setKind] = useState<ReviewKind>("review");
  const [claimType, setClaimType] = useState<ServiceType>("unclaimed");
  const [displayName, setDisplayName] = useState("");
  const [content, setContent] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [amount, setAmount] = useState("");
  const [useConsent, setUseConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        claimType,
        displayName,
        content,
        paymentConfirmed,
        verifiedAmount: paymentConfirmed && amount ? Number(amount.replace(/[^\d]/g, "")) : null,
        useConsent,
      }),
    }).catch(() => null);
    setBusy(false);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) return setMsg({ tone: "error", text: data?.error ?? "등록하지 못했습니다." });
    setDisplayName("");
    setContent("");
    setAmount("");
    setPaymentConfirmed(false);
    setUseConsent(false);
    setMsg({ tone: "ok", text: "승인 대기로 등록했습니다. 관리자가 승인해야 랜딩에 공개됩니다." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="후기 등록">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={label}>
          후기 유형
          <Select value={kind} onChange={(e) => setKind(e.target.value as ReviewKind)}>
            {REVIEW_KINDS.map((k) => (
              <option key={k} value={k}>
                {REVIEW_KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </label>
        <label className={label}>
          보험금 유형
          <Select value={claimType} onChange={(e) => setClaimType(e.target.value as ServiceType)}>
            {SERVICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {SERVICE_CONTENT[t].shortTitle}
              </option>
            ))}
          </Select>
        </label>
        <label className={label}>
          고객 표시명 (익명)
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="예: 김○○ 고객, 40대 직장인" maxLength={20} required />
        </label>
      </div>
      <label className={label}>
        후기 내용 (10~500자, 연락처 등 개인정보 금지)
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} maxLength={500} required />
      </label>
      <div className="grid gap-3 rounded-xl bg-navy-50 p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-x-6">
        <label className="flex items-center gap-2 text-[14px] font-semibold text-navy">
          <input type="checkbox" checked={paymentConfirmed} onChange={(e) => setPaymentConfirmed(e.target.checked)} className="h-5 w-5 accent-blue" />
          실제 지급 확인됨
        </label>
        <label className={label}>
          <span className="sr-only">검증된 지급 금액</span>
          <Input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!paymentConfirmed}
            placeholder={paymentConfirmed ? "검증된 지급 금액(원, 선택)" : "지급 확인 시에만 금액 입력 가능"}
          />
        </label>
        <label className="flex items-center gap-2 text-[14px] font-semibold text-navy sm:col-span-2">
          <input type="checkbox" checked={useConsent} onChange={(e) => setUseConsent(e.target.checked)} className="h-5 w-5 accent-blue" />
          고객에게 후기 게시 동의를 받았습니다 (동의 기록은 별도 보관)
        </label>
      </div>
      {msg && <Alert tone={msg.tone === "error" ? "error" : "success"}>{msg.text}</Alert>}
      <Button type="submit" variant="navy" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        승인 대기로 등록
      </Button>
    </form>
  );
}
