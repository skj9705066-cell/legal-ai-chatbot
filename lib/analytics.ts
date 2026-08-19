/**
 * GA4 이벤트 전송 헬퍼.
 *
 * 계측 때문에 서비스가 깨지는 일은 절대 없어야 한다. gtag가 없는 모든 경우
 * (측정 ID 미설정 · 광고차단 확장으로 스크립트 차단 · SSR)에 조용히 무시한다.
 */

type EventParams = Record<string, string | number | boolean>;

export function trackEvent(name: string, params?: EventParams): void {
  if (typeof window === "undefined") return;

  const w = window as unknown as { dataLayer?: unknown[] };

  try {
    // ⚠️ `window.gtag`를 부르지 않고 dataLayer 큐에 직접 넣는다.
    //
    // GA 스크립트는 afterInteractive라 하이드레이션 직후에야 로드되는데,
    // 가입 완료(SignupTracker)처럼 페이지 진입 즉시 발화하는 이벤트는 그보다
    // 먼저 실행될 수 있다. gtag가 아직 없다고 그냥 버리면 **가입 이벤트만
    // 통째로 유실되어 전환율이 0으로 보인다.** (실제로 그렇게 동작했다)
    //
    // gtag.js는 로드된 뒤 dataLayer에 미리 쌓인 항목을 순서대로 처리하므로,
    // 큐에 넣어두면 순서 경합이 사라진다. gtag()의 내부 동작(`dataLayer.push
    // (arguments)`)과 동일한 모양을 만들려고 화살표 함수가 아닌 일반 함수를 쓴다.
    w.dataLayer = w.dataLayer || [];
    const queue = w.dataLayer;
    function pushArgs(this: void) {
      // eslint-disable-next-line prefer-rest-params
      queue.push(arguments);
    }
    (pushArgs as unknown as (...args: unknown[]) => void)(
      "event",
      name,
      params ?? {},
    );
  } catch {
    // 계측 실패는 무시. 계측 때문에 서비스가 깨지면 안 된다.
  }
}

/**
 * 퍼널 이벤트 이름 상수.
 *
 * GA4는 이벤트 이름이 한 글자만 달라도 **다른 이벤트로 집계**되어 통계가
 * 조용히 갈린다. 오타를 막으려고 문자열을 여기 한 곳에 모은다.
 *
 * `sign_up`은 GA4 권장 이벤트명이라 그대로 쓴다(보고서에서 자동 인식됨).
 */
export const AnalyticsEvent = {
  /** 상담방에 첫 질문을 보냄 = 퍼널 진입 */
  ConsultationStart: "consultation_start",
  /** 무료 한도 소진 → 로그인/가입 유도 모달 노출 */
  SignupGateShown: "signup_gate_shown",
  /** 가입 완료 */
  SignUp: "sign_up",
} as const;
