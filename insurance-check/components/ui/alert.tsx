import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  info: { box: "border-blue-100 bg-blue-50 text-navy-700", icon: Info, iconClass: "text-blue" },
  caution: { box: "border-caution-200 bg-caution-50 text-navy-700", icon: TriangleAlert, iconClass: "text-caution" },
  error: { box: "border-danger-200 bg-danger-50 text-danger", icon: AlertCircle, iconClass: "text-danger" },
  success: { box: "border-mint-100 bg-mint-50 text-navy-700", icon: CheckCircle2, iconClass: "text-mint-700" },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  role,
}: {
  tone?: keyof typeof styles;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  role?: "alert" | "status";
}) {
  const s = styles[tone];
  const Icon = s.icon;
  return (
    <div role={role} className={cn("flex gap-3 rounded-xl border p-4 text-sm leading-relaxed", s.box, className)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", s.iconClass)} aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold text-navy">{title}</p>}
        {children && <div className={cn(title && "mt-1")}>{children}</div>}
      </div>
    </div>
  );
}
