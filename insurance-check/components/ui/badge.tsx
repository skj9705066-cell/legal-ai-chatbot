import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold leading-none", {
  variants: {
    variant: {
      default: "bg-navy-100 text-navy-600",
      blue: "bg-blue-50 text-blue-700",
      mint: "bg-mint-50 text-mint-700",
      caution: "bg-caution-50 text-caution",
      danger: "bg-danger-50 text-danger",
      outline: "border border-navy-200 text-navy-600",
      demo: "bg-caution-50 text-caution ring-1 ring-inset ring-caution-200",
      navy: "bg-navy text-white",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
