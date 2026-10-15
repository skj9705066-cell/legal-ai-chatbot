import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/server/auth";
import { isSameOrigin, readJson } from "@/lib/server/request";
import { createReview } from "@/lib/server/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 후기 등록 — 항상 '승인 대기'로 저장된다. 공개는 관리자 승인으로만. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const auth = await requireApi("editReviews");
  if (auth.error) return auth.error;
  const body = await readJson(req, 2_200_000); // 캡처 이미지(data URL) 포함
  if (!body) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const res = await createReview(auth.session, body);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ ok: true, id: res.review.id });
}
