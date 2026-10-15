import * as React from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border bg-white px-4 text-[16px] text-navy placeholder:text-navy-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-0 focus:border-blue disabled:cursor-not-allowed disabled:bg-navy-50";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, "h-12", invalid ? "border-danger" : "border-navy-200", className)}
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
    className={cn(control, "min-h-[96px] py-3 leading-relaxed", invalid ? "border-danger" : "border-navy-200", className)}
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
    className={cn(
      control,
      "select-chevron h-12 appearance-none pr-10",
      invalid ? "border-danger" : "border-navy-200",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 text-sm font-medium text-danger">
      {children}
    </p>
  );
}

export function Label({ className, required, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("mb-1.5 block text-[15px] font-semibold text-navy", className)} {...props}>
      {children}
      {required ? (
        <span className="ml-1 text-blue" aria-hidden="true">
          *
        </span>
      ) : (
        <span className="ml-1.5 text-xs font-medium text-navy-500">(선택)</span>
      )}
    </label>
  );
}
