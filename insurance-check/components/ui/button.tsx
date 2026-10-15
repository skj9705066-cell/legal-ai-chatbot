import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui 규칙(cva + cn)을 따른 버튼. Tailwind 3.4 기존 스택에 맞춰 소스로 포함.
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-blue text-white shadow-sm hover:bg-blue-700 active:bg-blue-700",
        navy: "bg-navy text-white hover:bg-navy-700",
        outline: "border border-navy-200 bg-white text-navy hover:border-navy-300 hover:bg-navy-50",
        soft: "bg-blue-50 text-blue-700 hover:bg-blue-100",
        ghost: "text-navy-600 hover:bg-navy-50 hover:text-navy",
        link: "h-auto px-0 text-blue underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-[15px]",
        lg: "h-12 px-5 text-base",
        xl: "h-14 px-6 text-[17px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";
