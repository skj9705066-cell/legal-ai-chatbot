"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ServiceType } from "@/lib/types";
import { track } from "@/lib/analytics";

export type CtaSource = "hero" | "stats" | "type_card" | "process" | "final" | "sticky";

export interface ApplyRequest {
  n: number;
  type: ServiceType | null;
}

interface ApplyCtx {
  serviceType: ServiceType | null;
  selectType: (t: ServiceType) => void;
  /** 신청 폼(단 하나)으로 들어가는 모든 CTA의 진입점. 폼이 request를 보고 단계·포커스를 맞춘다. */
  startApply: (source: CtaSource, t?: ServiceType) => void;
  request: ApplyRequest;
}

const Ctx = createContext<ApplyCtx | null>(null);

export function ApplyProvider({ children }: { children: React.ReactNode }) {
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [request, setRequest] = useState<ApplyRequest>({ n: 0, type: null });

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
      setRequest((r) => ({ n: r.n + 1, type: t ?? null }));
      const section = document.getElementById("apply");
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      section?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    },
    [selectType],
  );

  const value = useMemo(() => ({ serviceType, selectType, startApply, request }), [serviceType, selectType, startApply, request]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApply(): ApplyCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApply must be used inside ApplyProvider");
  return v;
}
