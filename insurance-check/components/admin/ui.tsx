import { cn } from "@/lib/utils";
import type { ClaimStatus, CoverageStatus } from "@/lib/types";
import { CLAIM_STATUS_LABEL, COVERAGE_STATUS_LABEL } from "@/lib/types";

/** 관리자 화면 공통 조각 — 고객용 화면과 같은 토큰을 쓴다. */

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-navy">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-navy-600">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl bg-white shadow-card ring-1 ring-navy-100", className)} {...props}>
      {children}
    </div>
  );
}

export function Kpi({ label, value, icon, tone = "navy" }: { label: string; value: number | string; icon: React.ReactNode; tone?: "navy" | "blue" | "mint" | "caution" | "danger" }) {
  const toneCls = {
    navy: "bg-navy-50 text-navy",
    blue: "bg-blue-50 text-blue",
    mint: "bg-mint-50 text-mint-700",
    caution: "bg-caution-50 text-caution",
    danger: "bg-danger-50 text-danger",
  }[tone];
  return (
    <li className="flex items-center gap-3.5 rounded-2xl bg-white px-4 py-4 shadow-card ring-1 ring-navy-100 xl:flex-col xl:items-start xl:gap-3 xl:px-5">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", toneCls)} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-navy-600">{label}</p>
        <p className="num-display text-[26px] font-extrabold leading-tight text-navy">{value}</p>
      </div>
    </li>
  );
}

const CLAIM_DOT: Record<ClaimStatus, string> = {
  new: "bg-blue",
  contacting: "bg-caution",
  guided: "bg-mint",
  docs_pending: "bg-navy-400",
  closed: "bg-navy-300",
  unreachable: "bg-danger",
};

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[14px] font-medium text-ink">
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", CLAIM_DOT[status])} />
      {CLAIM_STATUS_LABEL[status]}
    </span>
  );
}

export function CoverageStatusBadge({ status }: { status: CoverageStatus }) {
  const muted = status === "not_consented" || status === "withdrawn" || status === "declined";
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-semibold", muted ? "bg-navy-100 text-navy-600" : "bg-blue-50 text-blue-700")}>
      {COVERAGE_STATUS_LABEL[status]}
    </span>
  );
}

export const tableHead = "whitespace-nowrap px-4 py-3 text-left text-[13px] font-semibold text-navy-600";
export const tableCell = "px-4 py-3.5 align-middle text-[14px]";
export const fieldCls =
  "h-11 rounded-xl border border-navy-200 bg-white px-3 text-[15px] text-ink focus:border-blue focus:outline-none focus:ring-4 focus:ring-blue/15";
