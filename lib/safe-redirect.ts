/**
 * 로그인 후 돌아갈 내부 경로 가드.
 *
 * 외부 도메인으로 튕기는 오픈 리다이렉트를 막는다. `//evil.com`이나 `/\evil.com`은
 * 브라우저가 프로토콜 상대 URL로 해석할 수 있으므로 반드시 함께 걸러야 한다.
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback = "/",
): string {
  if (!raw) return fallback;
  try {
    const decoded = decodeURIComponent(raw);
    if (
      decoded.startsWith("/") &&
      !decoded.startsWith("//") &&
      !decoded.startsWith("/\\")
    ) {
      return decoded;
    }
  } catch {
    // 잘못된 인코딩은 무시하고 fallback.
  }
  return fallback;
}

/** 로그인/가입 화면 자신을 next로 삼으면 되돌이가 되므로 제외한다. */
const AUTH_PATHS = ["/login", "/signup", "/auth"];

/**
 * 현재 경로를 로그인 후 복귀 지점으로 쓴다.
 *
 * ⚠️ 쿼리스트링은 일부러 버린다. `/chat/[id]?seed=...`를 그대로 넘기면 복귀 시
 * 시드 자동전송이 다시 돌아 같은 질문이 한 번 더 전송된다. 경로만 있으면
 * localStorage의 대화가 그대로 렌더되고 자동전송은 일어나지 않는다.
 */
export function returnPathFrom(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return "/";
  }
  return pathname;
}
