"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ApplyCta } from "./ApplyCta";

/**
 * 모바일 하단 고정 CTA. 히어로 CTA·신청 폼·하단 CTA가 화면에 보이는 동안에는 숨겨
 * 입력칸·동의 내용·버튼을 가리지 않는다. (페이지 끝에는 같은 높이의 여백을 둬서 푸터도 가리지 않음)
 */
export function MobileStickyCta() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const ids = ["hero-cta", "proof-cta", "apply", "final-cta"];
    const targets = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!targets.length) return;
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        setHidden(visible.size > 0);
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <div
      data-testid="mobile-sticky-cta"
      data-hidden={hidden}
      className={cn(
        "pb-safe fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-white via-white to-white/0 px-5 pt-5 transition-[transform,opacity] duration-300 lg:hidden",
        hidden ? "invisible translate-y-full opacity-0" : "visible translate-y-0 opacity-100",
      )}
    >
      <ApplyCta source="sticky" size="lg" className="w-full" />
    </div>
  );
}
