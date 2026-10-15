import * as React from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-2xl border bg-white px-4 text-[17px] text-ink placeholder:text-navy-400 transition-[border-color,box-shadow] focus:outline-none focus:border-blue focus:ring-4 focus:ring-blue/15 disabled:cursor-not-allowed disabled:bg-navy-50";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, "h-14", invalid ? "border-danger focus:border-danger focus:ring-danger/15" : "border-navy-200", className)}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(control, "min-h-[120px] py-4 leading-relaxed", invalid ? "border-danger" : "border-navy-200", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(({ className, invalid, children, ...props }, ref) => (
  <select
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(control, "select-chevron h-14 appearance-none pr-12", invalid ? "border-danger" : "border-navy-200", className)}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-2 text-[15px] font-medium text-danger">
      {children}
    </p>
  );
}

export function Label({ className, required, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("mb-2 block text-[16px] font-semibold text-navy", className)} {...props}>
      {children}
      {!required && <span className="ml-1.5 text-[14px] font-medium text-navy-500">선택</span>}
    </label>
  );
}
