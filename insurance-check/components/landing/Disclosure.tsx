"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * '자세히 보기' 접기 영역. 기본 화면에는 핵심만 두고 상세 설명·서류·유의사항은 여기로 옮긴다.
 * 닫힌 동안에는 visibility:hidden이라 보조기기·탭 순서에서 빠진다(.faq-panel).
 */
export function Disclosure({
  label,
  openLabel = "접기",
  children,
  tone = "light",
  className,
  testId,
}: {
  label: string;
  openLabel?: string;
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={className} data-testid={testId}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex min-h-[48px] items-center gap-1.5 rounded-xl text-[15px] font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2",
          tone === "dark" ? "text-blue-300 focus-visible:ring-white/60" : "text-blue-700 focus-visible:ring-blue",
        )}
      >
        {open ? openLabel : label}
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", open && "rotate-180")} aria-hidden="true" />
      </button>
      <div id={id} role="region" aria-label={label} className="faq-panel" data-open={open}>
        <div>
          <div className="pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
