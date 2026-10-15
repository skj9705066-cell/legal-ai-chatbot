"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ServiceType } from "@/lib/types";
import { track } from "@/lib/analytics";

type CtaSource = "hero" | "type_card" | "process" | "cases" | "faq" | "sticky";

interface ApplyCtx {
  serviceType: ServiceType | null;
  selectType: (t: ServiceType) => void;
  /** 모든 CTA의 단일 진입점: (선택) 유형 지정 → 신청 폼으로 스크롤 → 첫 입력칸 포커스 */
  startApply: (source: CtaSource, t?: ServiceType) => void;
}

const Ctx = createContext<ApplyCtx | null>(null);

export function ApplyProvider({ children }: { children: React.ReactNode }) {
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);

  const selectType = useCallback((t: ServiceType) => {
    setServiceType((prev) => {
      if (prev !== t) track("service_type_select", { serviceType: t });
      return t;
    });
  }, []);

  const startApply = useCallback(
    (source: CtaSource, t?: ServiceType) => {
      if (source === "hero") track("hero_cta_click");
      if (t) selectType(t);
      const section = document.getElementById("apply");
      if (!section) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      window.setTimeout(
        () => {
          const target = (t ? document.getElementById("apply-name") : document.querySelector<HTMLElement>("#apply [data-autofocus]")) ??
            document.getElementById("apply-name");
          target?.focus({ preventScroll: true });
        },
        reduce ? 0 : 450,
      );
    },
    [selectType],
  );

  const value = useMemo(() => ({ serviceType, selectType, startApply }), [serviceType, selectType, startApply]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApply(): ApplyCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApply must be used inside ApplyProvider");
  return v;
}
