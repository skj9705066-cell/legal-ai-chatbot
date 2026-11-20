import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/server/auth";
import { isSameOrigin, readJson } from "@/lib/server/request";
import { addActivityByStaff } from "@/lib/server/service";
import { AUTH_ERROR } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 상담 이력 추가(전화·방문·메모). 상담사·관리자만. 이력은 수정하지 않는다 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json(AUTH_ERROR.badOrigin, { status: 403 });
  const auth = await requireApi("edit");
  if (auth.error) return auth.error;
  const body = await readJson(req, 4_000);
  if (!body) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const { id } = await ctx.params;
  const result = await addActivityByStaff(auth.session, id, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, activity: result.activity });
}
