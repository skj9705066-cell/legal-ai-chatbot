import { NextResponse, type NextRequest } from "next/server";
import { getSessionSecret, SESSION_COOKIE, verifySession } from "./lib/session";

/**
 * /admin/*, /api/admin/* 게이트. 서명된 HttpOnly 세션 쿠키가 없으면 차단한다.
 * 역할(권한) 검사는 각 페이지·라우트에서 서버 측으로 다시 수행한다(심층 방어).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublicAuth = pathname === "/admin/login" || pathname === "/api/admin/login";

  if (!isPublicAuth) {
    const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, getSessionSecret());
    if (!session) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
