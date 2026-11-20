import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/server/auth";
import { isSameOrigin, rateLimit } from "@/lib/server/request";
import { sendVisitConfirmSms } from "@/lib/server/notify";
import { AUTH_ERROR } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 방문 안내 문자 발송(상담사·관리자). 같은 신청에 1분에 1번만 — 연타로 고객에게 여러 통이 가지 않게 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json(AUTH_ERROR.badOrigin, { status: 403 });
  const auth = await requireApi("edit");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  if (!rateLimit(`visit-sms:${id}`, 1, 60_000)) {
    return NextResponse.json({ error: "방금 문자를 보냈습니다. 1분 뒤에 다시 시도해 주세요." }, { status: 429 });
  }
  const result = await sendVisitConfirmSms(auth.session, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
