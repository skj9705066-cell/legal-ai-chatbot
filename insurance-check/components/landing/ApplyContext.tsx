"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { FunnelEventName, ServiceType } from "@/lib/types";
import { CTA_VARIANTS, type CtaVariant } from "@/lib/content";
import { track } from "@/lib/analytics";

export type CtaSource = "hero" | "stats" | "type_card" | "cases" | "claim_case" | "reviews" | "process" | "final" | "sticky" | "header";

export interface ApplyRequest {
  n: number;
  type: ServiceType | null;
  /** 유형을 폼에서 다시 고르게 할 때(유형이 정해지지 않은 카드) */
  choose: boolean;
}

interface ApplyCtx {
  serviceType: ServiceType | null;
  selectType: (t: ServiceType) => void;
  /**
   * 모든 CTA의 목적지 = 같은 신청 폼. 폼이 request를 보고 단계·포커스를 맞춘다.
   * t를 넘기면 그 유형으로, 생략하면 이미 고른 유형을 그대로 유지해 연락처 단계로(고른 적 없으면 유형 단계),
   * null이면 유형을 비우고 유형 단계에서 고르게 한다.
   */
  startApply: (source: CtaSource, t?: ServiceType | null) => void;
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
  claim_case: "case_cta_click",
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
  const [request, setRequest] = useState<ApplyRequest>({ n: 0, type: null, choose: false });
  const [ctaVariant, setCtaVariant] = useState<CtaVariant>("a");
  const typeRef = useRef<ServiceType | null>(null);
  typeRef.current = serviceType;

  useEffect(() => setCtaVariant(readVariant()), []);

  const selectType = useCallback((t: ServiceType) => {
    setServiceType((prev) => {
      if (prev !== t) track("check_type_select", { serviceType: t });
      return t;
    });
  }, []);

  const startApply = useCallback(
    (source: CtaSource, t?: ServiceType | null) => {
      const type = t === undefined ? typeRef.current : t;
      const ev = CLICK_EVENT[source];
      if (ev) track(ev, { serviceType: type });
      if (type) selectType(type);
      else if (t === null) setServiceType(null);
      setRequest((r) => ({ n: r.n + 1, type, choose: t === null }));
      smoothScrollTo("apply");
    },
    [selectType],
  );

  const value = useMemo(
    () => ({ serviceType, selectType, startApply, request, ctaVariant, ctaLabel: CTA_VARIANTS[ctaVariant] }),
    [serviceType, selectType, startApply, request, ctaVariant],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApply(): ApplyCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApply must be used inside ApplyProvider");
  return v;
}
