"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 자식(.stagger-item, style --i)이 화면에 들어올 때 하나씩 등장한다.
 * 처음부터 화면 안이거나, JS가 없거나, 움직임 줄이기 설정이면 대기 상태를 걸지 않는다 → 내용은 항상 보인다.
 */
export function Stagger({ children, className, as: Tag = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "ul" | "ol" }) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "pending" | "in">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return; // 이미 보이는 중이면 그대로
    setState("pending");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("in");
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref as never} className={`stagger ${className ?? ""}`} data-state={state}>
      {children}
    </Tag>
  );
}
