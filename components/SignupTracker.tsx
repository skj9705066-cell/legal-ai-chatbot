"use client";

import { useEffect } from "react";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";

/**
 * OAuth 가입 완료 집계.
 *
 * 이메일 가입은 브라우저에서 끝나므로 AuthProvider가 직접 이벤트를 쏘지만,
 * 카카오 가입은 **서버 콜백**(app/auth/callback/route.ts)에서 프로필이 만들어져
 * 클라이언트가 그 순간을 알 수 없다. 그래서 콜백이 `?signup=kakao`를 달아
 * 돌려보내고, 여기서 그 표식을 보고 한 번만 집계한다.
 *
 * 집계 후 쿼리를 지우는 이유: 이용자가 새로고침하거나 그 URL을 공유하면
 * 가입이 여러 번 일어난 것처럼 부풀려지기 때문이다.
 *
 * useSearchParams 대신 window.location을 쓰는 건 의도적이다 — 레이아웃 전역에
 * 마운트되는 컴포넌트라 useSearchParams를 쓰면 모든 정적 페이지가 동적 렌더링으로
 * 떨어진다.
 */
export default function SignupTracker() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const method = url.searchParams.get("signup");
    if (!method) return;

    trackEvent(AnalyticsEvent.SignUp, { method });

    url.searchParams.delete("signup");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, []);

  return null;
}
