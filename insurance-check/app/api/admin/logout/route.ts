import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { getStaffSession } from "@/lib/server/auth";
import { isSameOrigin } from "@/lib/server/request";
import { recordStaffAudit } from "@/lib/server/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const session = await getStaffSession();
  if (session) await recordStaffAudit(session, "auth.logout", "로그아웃");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "strict" });
  return res;
}
