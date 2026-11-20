"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquareText, Send } from "lucide-react";
import { ACTIVITY_KIND_LABEL, type ActivityKind, type LeadActivity } from "@/lib/types";
import { cn, formatDateTime, formatVisitAt } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";

const KIND_STYLE: Record<ActivityKind, string> = {
  call: "bg-blue-50 text-blue-700",
  sms: "bg-gold-100 text-gold-700",
  visit: "bg-mint-50 text-mint-700",
  memo: "bg-navy-100 text-navy-700",
};

/**
 * 상담 이력: 전화·방문·메모를 시간순으로 쌓는다(수정·삭제 없음). 문자 이력은 '방문 안내 문자' 발송 기능만 남긴다.
 * 건강정보·주민등록번호·카드번호·비밀번호는 기록하지 않는다(주민번호 형태는 서버가 거절).
 */
export function ActivityLog({
  leadId,
  activities,
  canEdit,
  visitAt,
  smsPreview,
  smsLive,
}: {
  leadId: string;
  activities: LeadActivity[];
  canEdit: boolean;
  visitAt: string | null;
  /** 보낼 문자 미리보기(서버가 만든 실제 문구) */
  smsPreview: string | null;
  /** 실제 발송 여부(운영 모드). false면 데모·테스트로 이력만 남는다 */
  smsLive: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<Exclude<ActivityKind, "sms">>("call");
  const [content, setContent] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");
  const [sms, setSms] = useState<{ state: "idle" | "confirm" | "sending" | "done" | "error"; msg?: string }>({ state: "idle" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    const res = await fetch(`/api/admin/leads/${leadId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, content }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setError(data?.error ?? "기록하지 못했습니다.");
      setState("error");
      return;
    }
    setContent("");
    setState("idle");
    router.refresh();
  }

  async function sendSms() {
    setSms({ state: "sending" });
    const res = await fetch(`/api/admin/leads/${leadId}/visit-sms`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setSms({ state: "error", msg: data?.error ?? "문자를 보내지 못했습니다." });
      return;
    }
    setSms({ state: "done", msg: data?.sent ? "방문 안내 문자를 보냈습니다." : `기록만 남겼습니다 (${data?.note ?? "발송 안 함"}).` });
    router.refresh();
  }

  const upcoming = !!visitAt && Date.parse(visitAt) > Date.now();

  return (
    <div className="space-y-5">
      {canEdit && (
        <div className="rounded-xl bg-navy-50 p-4" data-testid="visit-sms">
          <p className="flex items-center gap-2 text-[14px] font-bold text-navy">
            <MessageSquareText className="h-4 w-4" aria-hidden="true" />
            방문 안내 문자 {smsLive ? "" : <span className="rounded-full bg-caution-50 px-2 py-0.5 text-[12px] text-caution">데모·테스트: 실제 발송 안 함</span>}
          </p>
          {!upcoming ? (
            <p className="mt-1.5 text-[13px] text-navy-600">앞으로의 방문 일시를 저장하면 고객에게 일정 안내 문자를 보낼 수 있습니다.</p>
          ) : (
            <>
              <p className="mt-1.5 text-[13px] text-navy-600">{formatVisitAt(visitAt)} 방문 일정을 고객 휴대폰으로 안내합니다. 보내기 전에 문구를 확인하세요.</p>
              {sms.state === "confirm" || sms.state === "sending" ? (
                <div className="mt-3 space-y-3">
                  <pre className="whitespace-pre-wrap rounded-lg bg-white p-3 font-sans text-[13.5px] leading-relaxed text-ink ring-1 ring-navy-100">{smsPreview}</pre>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={sendSms} disabled={sms.state === "sending"}>
                      {sms.state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                      이대로 보내기
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSms({ state: "idle" })} disabled={sms.state === "sending"}>
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setSms({ state: "confirm" })}>
                  문구 확인 후 보내기
                </Button>
              )}
            </>
          )}
          {sms.state === "done" && <Alert tone="success" role="status" className="mt-3" title={sms.msg} />}
          {sms.state === "error" && <Alert tone="error" role="alert" className="mt-3" title={sms.msg} />}
        </div>
      )}

      {canEdit && (
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-start" aria-label="상담 이력 추가">
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-navy">
            종류
            <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="h-11 text-[15px]">
              {(["call", "visit", "memo"] as const).map((k) => (
                <option key={k} value={k}>
                  {ACTIVITY_KIND_LABEL[k]}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-navy">
            상담 내용
            <Textarea
              value={content}
              maxLength={1000}
              required
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] text-[15px]"
              placeholder="예: 통화 — 다음 주 화요일 오후 방문 희망 (건강정보·주민번호·카드번호 기록 금지)"
            />
          </label>
          <Button type="submit" variant="navy" size="sm" className="sm:mt-5" disabled={state === "saving" || !content.trim()}>
            {state === "saving" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            기록 추가
          </Button>
          {state === "error" && <Alert tone="error" role="alert" className="sm:col-span-3" title={error} />}
        </form>
      )}

      <ol className="space-y-3" aria-label="상담 이력" data-testid="activity-list">
        {activities.length === 0 && <li className="py-6 text-center text-[14px] text-navy-500">아직 기록이 없습니다.</li>}
        {activities.map((a) => (
          <li key={a.id} className="rounded-xl border border-navy-100 p-3.5">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className={cn("rounded-full px-2 py-0.5 font-bold", KIND_STYLE[a.kind])}>{ACTIVITY_KIND_LABEL[a.kind]}</span>
              <span className="text-navy-600">{formatDateTime(a.at)}</span>
              <span className="font-semibold text-navy">{a.actor}</span>
            </div>
            <p className="mt-1.5 whitespace-pre-line text-[14.5px] leading-relaxed text-ink">{a.content}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
