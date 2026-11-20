"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { FunnelEventName, Interest, ServiceType } from "@/lib/types";
import { CTA_VARIANTS, type CtaVariant } from "@/lib/content";
import { track } from "@/lib/analytics";

export type CtaSource = "hero" | "money" | "process" | "counselor" | "reviews" | "faq" | "sticky" | "header";

export interface ApplyRequest {
  n: number;
  /** 안내 카드에서 누른 항목(관심 서비스에 미리 체크). 없으면 null */
  interest: Interest | null;
}

interface ApplyCtx {
  /**
   * 모든 CTA의 목적지 = 같은 신청 폼(#apply). 안내 카드에서 누르면 그 항목을 관심 서비스에 미리 체크한다
   * (다른 항목은 그대로 두고, 고객이 폼에서 자유롭게 고치거나 더 고를 수 있다).
   */
  startApply: (source: CtaSource, interest?: Interest | null) => void;
  request: ApplyRequest;
  /** 메인 CTA 문구 A/B 안(?cta=a~d). 기본 A */
  ctaVariant: CtaVariant;
  ctaLabel: string;
}

const Ctx = createContext<ApplyCtx | null>(null);

/** 출처별 클릭 이벤트 (전환 아님) */
const CLICK_EVENT: Partial<Record<CtaSource, FunnelEventName>> = {
  hero: "hero_cta_click",
  money: "scenario_card_click",
};

const VARIANT_KEY = "ic.ctaVariant";

/** 관심 서비스 → 이벤트용 유형(개인정보 아님) */
export function interestType(i: Interest | null | undefined): ServiceType | null {
  if (!i) return null;
  return i === "not_sure" ? "general" : i;
}

function smoothScrollTo(id: string) {
  const el = document.getElementById(id);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
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
  const [request, setRequest] = useState<ApplyRequest>({ n: 0, interest: null });
  const [ctaVariant, setCtaVariant] = useState<CtaVariant>("a");

  useEffect(() => setCtaVariant(readVariant()), []);

  const startApply = useCallback((source: CtaSource, interest: Interest | null = null) => {
    const ev = CLICK_EVENT[source];
    if (ev) track(ev, { serviceType: interestType(interest) });
    if (interest) track("check_type_select", { serviceType: interestType(interest) });
    setRequest((r) => ({ n: r.n + 1, interest }));
    smoothScrollTo("apply");
  }, []);

  const value = useMemo(
    () => ({ startApply, request, ctaVariant, ctaLabel: CTA_VARIANTS[ctaVariant] }),
    [startApply, request, ctaVariant],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApply(): ApplyCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApply must be used inside ApplyProvider");
  return v;
}
