"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { AD_CONSENT_KEY, captureAttribution, track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

/**
 * - 모든 페이지: UTM 보존 / 랜딩(/)에서는 익명 landing_view
 * - GA4: 운영 모드에서 측정 ID가 있을 때만, 방문자가 '허용'한 뒤에만 로드
 * - 동의 안내는 한 번만 노출(선택 결과를 기억), 화면을 가리는 팝업은 쓰지 않는다.
 */
export function Analytics({ gaId }: { gaId: string | null }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<"granted" | "denied" | "unset" | null>(null);

  useEffect(() => {
    captureAttribution();
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;
    track("landing_view");
  }, [pathname]);

  useEffect(() => {
    if (!gaId) return;
    try {
      const v = window.localStorage.getItem(AD_CONSENT_KEY);
      setConsent(v === "granted" || v === "denied" ? v : "unset");
    } catch {
      setConsent("unset");
    }
  }, [gaId]);

  const choose = (v: "granted" | "denied") => {
    try {
      window.localStorage.setItem(AD_CONSENT_KEY, v);
    } catch {
      /* 저장 실패 시 이번 방문에만 적용 */
    }
    setConsent(v);
  };

  if (!gaId || pathname.startsWith("/admin")) return null;

  return (
    <>
      {consent === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(gaId)},{anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});`}
          </Script>
        </>
      )}
      {consent === "unset" && (
        <div
          role="region"
          aria-label="방문 분석 동의"
          className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-2xl border border-navy-200 bg-white p-4 shadow-lift md:bottom-6"
        >
          <p className="text-[13.5px] leading-relaxed text-navy-700">
            광고 성과 측정을 위해 방문 분석 도구(Google Analytics) 사용에 동의하시겠어요? 이름·연락처 등 개인정보는 전송하지 않습니다.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => choose("denied")}>
              거부
            </Button>
            <Button size="sm" variant="navy" className="flex-1" onClick={() => choose("granted")}>
              동의
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
