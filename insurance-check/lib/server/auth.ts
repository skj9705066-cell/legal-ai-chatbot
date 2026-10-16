import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_ERROR, can, getSessionSecret, SESSION_COOKIE, verifySession, type Permission, type StaffSession } from "../session";

/** 서버 컴포넌트·라우트 핸들러용. 미들웨어와 별개로 매 요청마다 다시 검증한다(심층 방어). */
export async function getStaffSession(): Promise<StaffSession | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value, getSessionSecret());
}

export async function requireApi(
  perm: Permission,
): Promise<{ session: StaffSession; error?: never } | { session?: never; error: NextResponse }> {
  const session = await getStaffSession();
  if (!session) return { error: NextResponse.json(AUTH_ERROR.unauthorized, { status: 401 }) };
  if (!can(session.role, perm)) return { error: NextResponse.json(AUTH_ERROR.forbidden, { status: 403 }) };
  return { session };
}
