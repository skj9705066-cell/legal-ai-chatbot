"use client";

import { useEffect } from "react";

export type ToastType = "success" | "error";

export default function Toast({
  message,
  type = "success",
  onDismiss,
  duration = 3000,
}: {
  message: string;
  type?: ToastType;
  onDismiss: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  const bg = type === "success" ? "bg-[#10B981]" : "bg-[#EF4444]";

  return (
    <div className="fixed top-4 right-4 z-[60] animate-fade-up">
      <div
        className={`flex items-center gap-2 pl-3.5 pr-4 h-11 rounded-xl shadow-lg text-white text-[14px] font-semibold ${bg}`}
      >
        <span className="text-[16px] leading-none">
          {type === "success" ? "✓" : "!"}
        </span>
        {message}
      </div>
    </div>
  );
}
