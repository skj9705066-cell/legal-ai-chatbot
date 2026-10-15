"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * 섹션 진입 시 Fade Up. 첫 화면에 이미 보이는 요소와 reduced-motion 사용자는 건드리지 않고,
 * 화면 아래에 있는 요소만 JS가 숨겼다가 진입 시 드러낸다(JS가 없으면 처음부터 보임).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    el.classList.add("reveal-pending");
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        el.style.transitionDelay = `${delay}ms`;
        el.classList.add("reveal-in");
        el.classList.remove("reveal-pending");
        io.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Tag ref={ref as any} className={cn(className)}>{children}</Tag>;
}
