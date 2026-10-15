"use client";

import { useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPlaceholder } from "@/lib/display";
import type { ConsentRow } from "@/lib/consent-text";

/**
 * 동의 체크 + '내용 보기' 펼침. 기본 미체크이며 필수/선택을 라벨에 명시한다.
 * 필수·선택 동의는 각각 독립 렌더 — 일괄 동의를 만들지 않는다.
 */
export function ConsentBox({
  id,
  required,
  title,
  checked,
  onChange,
  rows,
  footnote,
  error,
  disabled,
}: {
  id: string;
  required: boolean;
  title: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  rows: ConsentRow[];
  footnote?: string;
  error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const errorId = `${id}-error`;
  return (
    <div className={cn("rounded-2xl border-2 bg-white transition-colors", error ? "border-danger" : checked ? "border-blue/60" : "border-navy-100")}>
      <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
        <span className="relative flex h-6 w-6 shrink-0">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-navy-300 bg-white transition-colors checked:border-blue checked:bg-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/25"
          />
          <Check className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} aria-hidden="true" />
        </span>
        <label htmlFor={id} className="flex-1 cursor-pointer text-[16px] font-semibold leading-snug text-ink">
          <span className={cn("mr-1.5", required ? "text-blue" : "text-navy-500")}>[{required ? "필수" : "선택"}]</span>
          {title}
        </label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={detailId}
          className="flex shrink-0 items-center gap-0.5 rounded-lg px-1.5 py-1 text-[14px] font-medium text-navy-500 hover:bg-navy-50 hover:text-navy"
        >
          내용 보기
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </div>
      <div id={detailId} hidden={!open} className="border-t border-navy-100 px-4 py-4 sm:px-5">
        <dl className="space-y-3">
          {rows.map((r) => (
            <div key={r.label} className="grid gap-0.5 sm:grid-cols-[92px_1fr] sm:gap-3">
              <dt className="text-[14px] font-semibold text-navy">{r.label}</dt>
              <dd className={cn("text-[15px] leading-relaxed text-navy-600", isPlaceholder(r.value) && "font-medium text-caution")}>{r.value}</dd>
            </div>
          ))}
        </dl>
        {footnote && <p className="mt-4 rounded-xl bg-navy-50 px-3.5 py-3 text-[14px] leading-relaxed text-navy-600">{footnote}</p>}
      </div>
      {error && (
        <p id={errorId} className="px-4 pb-4 text-[15px] font-medium text-danger sm:px-5">
          {error}
        </p>
      )}
    </div>
  );
}
