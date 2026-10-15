import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn/ui 규칙(cva + cn)을 따른 버튼. Tailwind 3.4 기존 스택에 맞춰 소스로 포함.
export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-[-0.01em] transition-[background-color,box-shadow,transform,color,border-color] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/25 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-blue text-white shadow-cta hover:bg-blue-700",
        navy: "bg-navy text-white hover:bg-navy-700",
        outline: "border border-navy-200 bg-white text-ink hover:border-navy-300 hover:bg-navy-50",
        soft: "bg-blue-50 text-blue-700 hover:bg-blue-100",
        ghost: "text-navy-600 hover:bg-navy-50 hover:text-navy",
        white: "bg-white text-navy shadow-card hover:bg-navy-50",
        link: "h-auto px-0 text-blue underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-10 rounded-xl px-4 text-[15px]",
        md: "h-12 rounded-xl px-5 text-base",
        lg: "h-14 rounded-2xl px-6 text-[17px]",
        xl: "h-[60px] rounded-2xl px-7 text-[18px]",
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
