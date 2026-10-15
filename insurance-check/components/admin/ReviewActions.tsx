"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";

/** 공개 승인·중단·반려 (관리자 전용). 조건 미충족 시 서버가 거절 사유를 돌려준다. */
export function ReviewActions({ id, status, blockedReason }: { id: string; status: ReviewStatus; blockedReason: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function set(to: ReviewStatus) {
    setBusy(true);
    setErr("");
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: to }),
    }).catch(() => null);
    setBusy(false);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) setErr(data?.error ?? "처리하지 못했습니다.");
    else router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {status !== "approved" && (
          <Button size="sm" variant="navy" disabled={busy || !!blockedReason} onClick={() => set("approved")} title={blockedReason ?? undefined}>
            공개 승인
          </Button>
        )}
        {status === "approved" && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => set("hidden")}>
            공개 중단
          </Button>
        )}
        {status === "pending" && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => set("rejected")}>
            반려
          </Button>
        )}
      </div>
      {blockedReason && status !== "approved" && <p className="text-[13px] text-caution">{blockedReason}</p>}
      {err && <p role="alert" className="text-[13px] text-danger">{err}</p>}
    </div>
  );
}
