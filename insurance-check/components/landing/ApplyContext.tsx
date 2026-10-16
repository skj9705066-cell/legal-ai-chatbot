"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { FunnelEventName, ServiceType } from "@/lib/types";
import { CTA_VARIANTS, type CtaVariant } from "@/lib/content";
import { track } from "@/lib/analytics";

export type CtaSource = "hero" | "stats" | "type_card" | "cases" | "reviews" | "action" | "process" | "final" | "sticky" | "header";

export interface ApplyRequest {
  n: number;
  type: ServiceType | null;
}

interface ApplyCtx {
  serviceType: ServiceType | null;
  selectType: (t: ServiceType) => void;
  /** '잘 모르겠어요'처럼 유형이 정해지지 않은 선택 — 신청 폼에서 고르게 한다 */
  clearType: () => void;
  /** 신청 폼(단 하나)으로 이동. 폼이 request를 보고 단계·포커스를 맞춘다. 유형을 안 넘기면 이미 고른 유형을 유지한다. */
  startApply: (source: CtaSource, t?: ServiceType) => void;
  /** 점검 유형 선택 영역으로 이동. 선택한 유형은 같은 신청 폼에 반영된다. */
  goToTypes: (source: CtaSource) => void;
  request: ApplyRequest;
  /** 메인 CTA 문구 A/B 안(?cta=a~d). 기본 A */
  ctaVariant: CtaVariant;
  ctaLabel: string;
}

const Ctx = createContext<ApplyCtx | null>(null);

/** 출처별 클릭 이벤트 (전환 아님) */
const CLICK_EVENT: Partial<Record<CtaSource, FunnelEventName>> = {
  hero: "hero_cta_click",
  stats: "stats_cta_click",
  cases: "scenario_card_click",
};

const VARIANT_KEY = "ic.ctaVariant";

function smoothScrollTo(id: string) {
  const el = document.getElementById(id);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  return reduce;
}

/** 광고 URL의 ?cta=b 등을 세션 동안 유지한다(페이지 이동·새로고침에도 같은 안). */
function readVariant(): CtaVariant {
  try {
    const q = new URLSearchParams(window.location.search).get("cta")?.toLowerCase();
    if (q && q in CTA_VARIANTS) {
      window.sessionStorage.setItem(VARIANT_KEY, q);
      return q as CtaVariant;
    }
    const saved = window.sessionStorage.getItem(VARIANT_KEY);
    if (saved && saved in CTA_VARIANTS) return saved as CtaVariant;
  } catch {
    /* 저장소 차단 시 기본안 */
  }
  return "a";
}

export function ApplyProvider({ children }: { children: React.ReactNode }) {
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);
  const [request, setRequest] = useState<ApplyRequest>({ n: 0, type: null });
  const [ctaVariant, setCtaVariant] = useState<CtaVariant>("a");

  useEffect(() => setCtaVariant(readVariant()), []);

  const selectType = useCallback((t: ServiceType) => {
    setServiceType((prev) => {
      if (prev !== t) track("check_type_select", { serviceType: t });
      return t;
    });
  }, []);

  const clearType = useCallback(() => setServiceType(null), []);

  const startApply = useCallback(
    (source: CtaSource, t?: ServiceType) => {
      const ev = CLICK_EVENT[source];
      if (ev) track(ev, { serviceType: t ?? null });
      if (t) selectType(t);
      setRequest((r) => ({ n: r.n + 1, type: t ?? null }));
      smoothScrollTo("apply");
    },
    [selectType],
  );

  const goToTypes = useCallback((source: CtaSource) => {
    const ev = CLICK_EVENT[source];
    if (ev) track(ev);
    const reduce = smoothScrollTo("services");
    // 스크롤이 끝난 뒤 섹션 제목으로 포커스 (스크린리더가 선택 영역을 읽도록)
    window.setTimeout(() => document.getElementById("services-title")?.focus({ preventScroll: true }), reduce ? 0 : 550);
  }, []);

  const value = useMemo(
    () => ({ serviceType, selectType, clearType, startApply, goToTypes, request, ctaVariant, ctaLabel: CTA_VARIANTS[ctaVariant] }),
    [serviceType, selectType, clearType, startApply, goToTypes, request, ctaVariant],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApply(): ApplyCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApply must be used inside ApplyProvider");
  return v;
}
