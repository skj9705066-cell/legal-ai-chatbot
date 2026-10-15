import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  info: { box: "bg-blue-50 text-ink", icon: Info, iconClass: "text-blue" },
  neutral: { box: "bg-navy-50 text-ink", icon: Info, iconClass: "text-navy-500" },
  caution: { box: "bg-caution-50 text-ink", icon: TriangleAlert, iconClass: "text-caution" },
  error: { box: "bg-danger-50 text-danger", icon: AlertCircle, iconClass: "text-danger" },
  success: { box: "bg-mint-50 text-ink", icon: CheckCircle2, iconClass: "text-mint-700" },
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
    <div role={role} className={cn("flex gap-3 rounded-2xl p-4 text-[15px] leading-relaxed sm:p-5", s.box, className)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", s.iconClass)} aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className={cn("font-semibold", tone === "error" ? "text-danger" : "text-navy")}>{title}</p>}
        {children && <div className={cn(title && "mt-1", tone !== "error" && "text-navy-600")}>{children}</div>}
      </div>
    </div>
  );
}
