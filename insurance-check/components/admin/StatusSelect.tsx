"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/** 표 안에서 바로 상태를 바꾸는 셀렉트. 서버가 규칙(별도 동의 등)을 다시 검증한다. */
export function StatusSelect({
  leadId,
  field,
  value,
  options,
  label,
  disabled,
}: {
  leadId: string;
  field: "claimStatus" | "coverageStatus";
  value: string;
  options: { value: string; label: string; disabled?: boolean }[];
  label: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function change(next: string) {
    const prev = current;
    setCurrent(next);
    setState("saving");
    const res = await fetch(`/api/admin/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: next }),
    }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setCurrent(prev);
      setState("error");
      setMsg(data?.error ?? "저장 실패");
      return;
    }
    setState("idle");
    setMsg("");
    router.refresh();
  }

  return (
    <div>
      <select
        aria-label={label}
        value={current}
        disabled={disabled || state === "saving"}
        onChange={(e) => change(e.target.value)}
        className={cn(
          "h-8 max-w-[150px] rounded-lg border bg-white px-2 text-[13px] text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-blue disabled:bg-navy-50 disabled:text-navy-500",
          state === "error" ? "border-danger" : "border-navy-200",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      {state === "error" && (
        <p role="alert" className="mt-1 max-w-[180px] text-[11.5px] leading-snug text-danger">
          {msg}
        </p>
      )}
    </div>
  );
}
