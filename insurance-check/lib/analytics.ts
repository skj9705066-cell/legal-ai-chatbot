"use client";

import type { Attribution, FunnelEventName, ServiceType } from "./types";

/**
 * 계측 원칙
 * 1) 1st-party 익명 이벤트(/api/events): 이벤트명·랜덤 세션 id·UTM·점검 유형만. 항상 기록.
 * 2) 광고/분석 태그(dataLayer → GA4): 운영 모드 + 측정 ID + 방문자 동의가 모두 있을 때만.
 * 3) 어떤 경로로도 이름·연락처·메모·건강정보를 이벤트 파라미터로 보내지 않는다.
 *    → 파라미터는 아래 SafeParams 타입(점검 유형)만 허용.
 * 4) 광고 전환은 form_submit_success 하나뿐. 클릭은 전환이 아니다.
 */

const SID_KEY = "ic.sid";
const ATTR_KEY = "ic.attr";
const ONCE_PREFIX = "ic.once.";
export const AD_CONSENT_KEY = "ic.adConsent";

type SafeParams = { serviceType?: ServiceType | null };

function ss(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getSessionId(): string {
  const s = ss();
  let id = s?.getItem(SID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    s?.setItem(SID_KEY, id);
  }
  return id;
}

/** 세션 첫 진입의 UTM·유입 origin을 보존(first-touch). 경로·쿼리는 개인정보가 섞일 수 있어 origin만. */
export function captureAttribution(): void {
  const s = ss();
  if (!s || s.getItem(ATTR_KEY)) return;
  const p = new URLSearchParams(window.location.search);
  let referrer: string | null = null;
  try {
    if (document.referrer) {
      const r = new URL(document.referrer);
      if (r.host !== window.location.host) referrer = r.origin;
    }
  } catch {
    referrer = null;
  }
  const attr: Attribution = {
    utmSource: p.get("utm_source"),
    utmMedium: p.get("utm_medium"),
    utmCampaign: p.get("utm_campaign"),
    utmContent: p.get("utm_content"),
    utmTerm: p.get("utm_term"),
    referrer,
    landingPath: window.location.pathname,
  };
  s.setItem(ATTR_KEY, JSON.stringify(attr));
}

export function getAttribution(): Attribution {
  const empty: Attribution = {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    referrer: null,
    landingPath: null,
  };
  try {
    const raw = ss()?.getItem(ATTR_KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}

export function hasAdConsent(): boolean {
  try {
    return window.localStorage.getItem(AD_CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function track(name: FunnelEventName, params: SafeParams = {}): void {
  if (typeof window === "undefined") return;
  const attr = getAttribution();
  const payload = JSON.stringify({
    name,
    sessionId: getSessionId(),
    utmSource: attr.utmSource,
    utmMedium: attr.utmMedium,
    utmCampaign: attr.utmCampaign,
    serviceType: params.serviceType ?? null,
  });
  try {
    const blob = new Blob([payload], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/events", blob)) {
      void fetch("/api/events", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    /* 계측 실패는 사용자 흐름에 영향 주지 않음 */
  }

  if (window.dataLayer && hasAdConsent()) {
    window.dataLayer.push({
      event: name,
      service_type: params.serviceType ?? undefined,
      // 광고 플랫폼 전환은 이 플래그가 true인 이벤트만 사용하도록 태그를 구성한다.
      is_conversion: name === "form_submit_success",
    });
  }
}

/** 세션당 한 번만 기록 (form_start, coverage_offer_view 등). */
export function trackOnce(name: FunnelEventName, params: SafeParams = {}, scope = ""): void {
  const s = ss();
  const key = `${ONCE_PREFIX}${name}${scope}`;
  if (s?.getItem(key)) return;
  s?.setItem(key, "1");
  track(name, params);
}

/* ── 신청 영수증(보장 분석 추가 신청용). 탭 세션에만 보관. ── */
const RECEIPT_KEY = "ic.receipt";
export interface StoredReceipt {
  refNo: string;
  receiptToken: string | null;
  serviceType: ServiceType;
  demo: boolean;
  coverage: "offered" | "opted_in" | "declined";
}

export function saveReceipt(r: StoredReceipt) {
  ss()?.setItem(RECEIPT_KEY, JSON.stringify(r));
}

export function loadReceipt(): StoredReceipt | null {
  try {
    const raw = ss()?.getItem(RECEIPT_KEY);
    return raw ? (JSON.parse(raw) as StoredReceipt) : null;
  } catch {
    return null;
  }
}
