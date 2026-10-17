import { NextResponse, type NextRequest } from "next/server";
import { getAppMode } from "@/lib/config";
import { STAFF_ROLES, STAFF_ROLE_LABEL, type StaffRole } from "@/lib/types";
import { getSessionSecret, SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "@/lib/session";
import { clientIp, isSameOrigin, rateLimit, readJson } from "@/lib/server/request";
import { safeEqual } from "@/lib/server/crypto";
import { verifyStaffCredentials } from "@/lib/server/repo/supabase";
import { recordStaffAudit } from "@/lib/server/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (error: string, status = 401) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return fail("잘못된 요청입니다.", 403);
  if (!rateLimit(`login:${clientIp(req)}`, 10, 15 * 60_000)) return fail("로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.", 429);

  const secret = getSessionSecret();
  if (!secret) return fail("APP_SECRET(32자 이상)이 설정되지 않아 관리자 로그인을 사용할 수 없습니다.", 503);

  const body = await readJson(req);
  if (!body) return fail("잘못된 요청입니다.", 400);

  let staff: { id: string; name: string; role: StaffRole } | null = null;

  if (getAppMode() === "demo") {
    const expected = process.env.DEMO_ADMIN_PASSWORD;
    if (!expected) return fail("DEMO_ADMIN_PASSWORD가 설정되지 않았습니다. .env.local을 확인하세요.", 503);
    const role = (STAFF_ROLES as readonly string[]).includes(body.role as string) ? (body.role as StaffRole) : "viewer";
    if (typeof body.password === "string" && safeEqual(body.password, expected)) {
      staff = { id: `demo-${role}`, name: `데모 ${STAFF_ROLE_LABEL[role]}`, role };
    }
  } else {
    const email = typeof body.email === "string" ? body.email.trim().slice(0, 120) : "";
    const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
    if (email && password) {
      staff = await verifyStaffCredentials(email, password).catch((err) => {
        // DB 연결·권한 오류 등. 메시지에는 키·이메일이 들어가지 않는다
        console.warn("[admin/login] 로그인 확인 중 오류:", err instanceof Error ? err.message.slice(0, 160) : "unknown");
        return null;
      });
    }
  }

  if (!staff) {
    await recordStaffAudit({ name: "unknown", role: "viewer" }, "auth.login_failed", "로그인 실패").catch(() => undefined);
    return fail("계정 정보가 올바르지 않거나 권한이 없습니다.");
  }

  const token = await signSession({ sub: staff.id, name: staff.name, role: staff.role }, secret);
  await recordStaffAudit(staff, "auth.login", `${STAFF_ROLE_LABEL[staff.role]} 로그인`);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
