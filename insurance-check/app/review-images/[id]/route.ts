import { NextResponse } from "next/server";
import { getReviewImage } from "@/lib/server/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 공개 후기 이미지. 게시 동의 + 공개 승인 + 개인정보 가림 확인된 후기만 응답한다(그 외 404). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const img = await getReviewImage(id, { staff: false });
  if (!img) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new NextResponse(Buffer.from(img.base64, "base64"), {
    headers: {
      "Content-Type": img.mime,
      // 공개 중단 시 빨리 사라지도록 짧게 캐시
      "Cache-Control": "public, max-age=60, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
