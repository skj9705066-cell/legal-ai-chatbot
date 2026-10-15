"use client";

import { ExternalLink } from "lucide-react";
import { OFFICIAL_LOOKUP } from "@/lib/content";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/** 공식 조회(내보험찾아줌) 외부 링크. 개인정보 입력 없이 이동하며, 클릭만 익명 집계한다. */
export function OfficialLink({
  className,
  children,
  showIcon = true,
}: {
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
}) {
  return (
    <a
      href={OFFICIAL_LOOKUP.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("official_lookup_click")}
      className={cn("inline-flex items-center gap-1", className)}
    >
      {children ?? `${OFFICIAL_LOOKUP.name} 공식 조회`}
      {showIcon && <ExternalLink className="h-[0.9em] w-[0.9em]" aria-hidden="true" />}
      <span className="sr-only">(새 창에서 열림)</span>
    </a>
  );
}
