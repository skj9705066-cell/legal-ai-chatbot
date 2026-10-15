import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/server/auth";
import { isSameOrigin, readJson } from "@/lib/server/request";
import { deleteReviewByStaff, updateReviewByStaff } from "@/lib/server/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 내용 수정(상담사·관리자) / 공개 승인·중단(관리자 — 서비스 계층에서 재검사) */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const auth = await requireApi("editReviews");
  if (auth.error) return auth.error;
  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const { id } = await ctx.params;
  const res = await updateReviewByStaff(auth.session, id, body);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ ok: true });
}

/** 후기 삭제(관리자) — 고객 동의 철회 시 캡처 이미지까지 파기 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const auth = await requireApi("approveReviews");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const res = await deleteReviewByStaff(auth.session, id);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ ok: true });
}
