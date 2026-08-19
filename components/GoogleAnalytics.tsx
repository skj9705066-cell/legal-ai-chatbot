"use client";

import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * GA4 태그.
 *
 * 측정 ID가 없으면 **아무것도 렌더하지 않는다.** 두 가지를 노린 것:
 *   1) 로컬 개발·프리뷰 배포에서 실서비스 통계가 오염되지 않는다
 *      (환경변수를 Production에만 넣으면 된다)
 *   2) 지금은 코드만 심어두고, 측정 ID가 준비되면 환경변수 추가 + 재배포만으로 켜진다
 *
 * ⚠️ 스크립트 도메인을 바꾸면 next.config.js의 CSP(script-src/connect-src)도
 *    함께 고쳐야 한다. 프로덕션 CSP에는 'unsafe-eval'이 없으므로 반드시
 *    `npm run build && npm start`로 재확인할 것 (dev는 통과해도 프로덕션에서 막힌다).
 */
export default function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
