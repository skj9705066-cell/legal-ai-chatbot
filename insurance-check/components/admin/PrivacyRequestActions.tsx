"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PRIVACY_REQUEST_STATUSES, PRIVACY_REQUEST_STATUS_LABEL, type PrivacyRequestStatus, type PrivacyRequestType } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function PrivacyRequestActions({ id, status, type }: { id: string; status: PrivacyRequestStatus; type: PrivacyRequestType }) {
  const router = useRouter();
  const [next, setNext] = useState<PrivacyRequestStatus>(status);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="처리 상태"
        value={next}
        onChange={(e) => setNext(e.target.value as PrivacyRequestStatus)}
        className="h-8 rounded-lg border border-navy-200 px-2 text-[13px]"
      >
        {PRIVACY_REQUEST_STATUSES.map((s) => (
          <option key={s} value={s}>
            {PRIVACY_REQUEST_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <input
        aria-label="처리 메모"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="본인 확인 방법 등"
        className="h-8 w-40 rounded-lg border border-navy-200 px-2 text-[13px]"
      />
      <Button
        size="sm"
        variant="navy"
        disabled={busy || next === status}
        onClick={async () => {
          if (type === "delete_all" && next === "completed" && !window.confirm("일치하는 신청의 식별 정보를 파기합니다. 되돌릴 수 없습니다. 진행할까요?")) return;
          setBusy(true);
          const res = await fetch(`/api/admin/privacy-requests/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: next, note }),
          }).catch(() => null);
          setBusy(false);
          if (!res?.ok) setErr("처리 실패");
          else router.refresh();
        }}
      >
        반영
      </Button>
      {err && <span className="text-[12px] text-danger">{err}</span>}
    </div>
  );
}
