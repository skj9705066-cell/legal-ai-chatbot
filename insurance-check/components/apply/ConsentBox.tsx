"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPlaceholder } from "@/lib/display";
import type { ConsentRow } from "@/lib/consent-text";


/**
 * 동의 체크박스 + '내용 보기' 펼침. 체크박스는 기본 미체크이며, 필수/선택을 라벨에 명시한다.
 * 필수·선택 동의는 각각 독립된 컴포넌트로 렌더해 일괄 동의를 만들지 않는다.
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
    <div className={cn("rounded-xl border bg-white", error ? "border-danger" : "border-navy-200")}>
      <div className="flex items-start gap-3 p-4">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-navy-300 accent-blue"
        />
        <label htmlFor={id} className="flex-1 cursor-pointer text-[14.5px] font-semibold leading-snug text-navy">
          <span className={cn("mr-1.5", required ? "text-blue" : "text-navy-500")}>[{required ? "필수" : "선택"}]</span>
          {title}
        </label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={detailId}
          className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[13px] font-medium text-navy-500 underline-offset-2 hover:text-navy hover:underline"
        >
          내용 보기
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </div>
      <div id={detailId} hidden={!open} className="border-t border-navy-100 px-4 py-3">
        <dl className="space-y-2 text-[13px] leading-relaxed">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[88px_1fr] gap-2">
              <dt className="font-semibold text-navy-700">{r.label}</dt>
              <dd className={cn("text-navy-600", isPlaceholder(r.value) && "font-medium text-caution")}>{r.value}</dd>
            </div>
          ))}
        </dl>
        {footnote && <p className="mt-3 text-[12.5px] leading-relaxed text-navy-500">{footnote}</p>}
      </div>
      {error && (
        <p id={errorId} className="px-4 pb-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
