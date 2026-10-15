"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ApplyCta } from "./ApplyCta";

/**
 * 모바일 하단 고정 CTA. 히어로 CTA가 화면에 보이는 동안, 그리고 신청 폼 영역에 도달한 뒤(폼·푸터)에는
 * 숨겨서 입력칸·버튼·운영자 정보를 가리지 않는다.
 */
export function MobileStickyCta() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const hero = document.getElementById("hero-cta");
    const apply = document.getElementById("apply");
    if (!hero || !apply) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const heroVisible = hero.getBoundingClientRect().bottom > 64;
      const reachedApply = apply.getBoundingClientRect().top < window.innerHeight;
      setHidden(heroVisible || reachedApply);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      data-testid="mobile-sticky-cta"
      data-hidden={hidden}
      className={cn(
        "pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-navy-100 bg-white/95 px-4 pt-3 backdrop-blur transition-transform duration-300 md:hidden",
        hidden ? "invisible translate-y-full" : "visible translate-y-0",
      )}
    >
      <ApplyCta source="sticky" size="lg" className="w-full" />
    </div>
  );
}
