import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/server/auth";
import { isSameOrigin } from "@/lib/server/request";
import { revealPhone } from "@/lib/server/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 연락처 원문 열람. 권한자만, 매 열람이 감사로그에 남는다. 응답은 캐시 금지. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const auth = await requireApi("revealPhone");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const phone = await revealPhone(auth.session, id);
  if (!phone) return NextResponse.json({ error: "연락처를 열람할 수 없습니다." }, { status: 404 });
  return NextResponse.json({ phone }, { headers: { "Cache-Control": "no-store" } });
}
