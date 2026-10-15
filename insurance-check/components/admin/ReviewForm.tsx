"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { REVIEW_CATEGORIES, REVIEW_CATEGORY_LABEL, REVIEW_KINDS, REVIEW_KIND_LABEL, type ReviewCategory, type ReviewKind } from "@/lib/types";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { ImageMasker } from "./ImageMasker";

const label = "flex flex-col gap-1.5 text-[13px] font-semibold text-navy";

/**
 * 실제 후기 등록 — 메시지 원문(텍스트) 또는 고객 동의 캡처(이미지, 개인정보 가림 후).
 * 저장하면 항상 '승인 대기'. 고객 실명·연락처·프로필 사진은 저장하지 않는다.
 */
export function ReviewForm() {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [kind, setKind] = useState<ReviewKind>("review");
  const [category, setCategory] = useState<ReviewCategory>("claim_guidance");
  const [displayName, setDisplayName] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [piiMasked, setPiiMasked] = useState(false);
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
        category,
        displayName,
        content,
        image,
        piiMasked,
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
    setImage(null);
    setPiiMasked(false);
    setAmount("");
    setPaymentConfirmed(false);
    setUseConsent(false);
    setFormKey((k) => k + 1); // 이미지 도구 초기화
    setMsg({ tone: "ok", text: "승인 대기로 등록했습니다. 관리자가 승인해야 랜딩에 공개됩니다." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5" aria-label="후기 등록">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={label}>
          후기 유형 (실제 내용에 해당하는 것 하나)
          <Select value={category} onChange={(e) => setCategory(e.target.value as ReviewCategory)}>
            {REVIEW_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {REVIEW_CATEGORY_LABEL[c]}
              </option>
            ))}
          </Select>
        </label>
        <label className={label}>
          고객 표시명 (익명)
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="예: 김○○ 고객, 40대 직장인" maxLength={20} required />
        </label>
        <label className={label}>
          후기 종류
          <Select value={kind} onChange={(e) => setKind(e.target.value as ReviewKind)}>
            {REVIEW_KINDS.map((k) => (
              <option key={k} value={k}>
                {REVIEW_KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <label className={label}>
          고객 메시지 원문 (줄바꿈 = 말풍선 구분, 연락처 등 개인정보 금지)
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            maxLength={1000}
            placeholder={"고객이 보낸 메시지를 수정 없이 옮겨 주세요.\n여러 메시지는 줄을 바꿔 입력합니다."}
          />
        </label>
        <div className="space-y-2">
          <p className="text-[13px] font-semibold text-navy">또는 고객 동의 캡처 이미지</p>
          <ImageMasker key={formKey} onChange={setImage} />
          {image && (
            <label className="flex items-start gap-2 rounded-xl bg-caution-50 p-3 text-[14px] font-semibold text-navy">
              <input type="checkbox" checked={piiMasked} onChange={(e) => setPiiMasked(e.target.checked)} className="mt-0.5 h-5 w-5 accent-blue" />
              프로필 사진·실명·전화번호 등 개인정보를 모두 가렸음을 확인했습니다
            </label>
          )}
        </div>
      </div>

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
