"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ServiceType } from "@/lib/types";
import { track } from "@/lib/analytics";

export type CtaSource = "hero" | "stats" | "type_card" | "cases" | "process" | "final" | "sticky" | "header";

export interface ApplyRequest {
  n: number;
  type: ServiceType | null;
}

interface ApplyCtx {
  serviceType: ServiceType | null;
  selectType: (t: ServiceType) => void;
  /** 신청 폼(단 하나)으로 이동. 폼이 request를 보고 단계·포커스를 맞춘다. */
  startApply: (source: CtaSource, t?: ServiceType) => void;
  /** 점검 유형 선택 영역으로 이동(히어로·통계 CTA). 선택한 유형은 같은 신청 폼에 반영된다. */
  goToTypes: (source: CtaSource) => void;
  request: ApplyRequest;
}

const Ctx = createContext<ApplyCtx | null>(null);

function smoothScrollTo(id: string) {
  const el = document.getElementById(id);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  return reduce;
}

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
      smoothScrollTo("apply");
    },
    [selectType],
  );

  const goToTypes = useCallback((source: CtaSource) => {
    if (source === "hero") track("hero_cta_click");
    const reduce = smoothScrollTo("services");
    // 스크롤이 끝난 뒤 섹션 제목으로 포커스 (스크린리더가 선택 영역을 읽도록)
    window.setTimeout(() => document.getElementById("services-title")?.focus({ preventScroll: true }), reduce ? 0 : 550);
  }, []);

  const value = useMemo(
    () => ({ serviceType, selectType, startApply, goToTypes, request }),
    [serviceType, selectType, startApply, goToTypes, request],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApply(): ApplyCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApply must be used inside ApplyProvider");
  return v;
}
