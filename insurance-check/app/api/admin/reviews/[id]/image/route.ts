import { NextResponse } from "next/server";
import { requireApi } from "@/lib/server/auth";
import { getReviewImage } from "@/lib/server/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 관리자 미리보기용(승인 전 포함). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireApi("view");
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const img = await getReviewImage(id, { staff: true });
  if (!img) return new NextResponse(null, { status: 404 });
  return new NextResponse(Buffer.from(img.base64, "base64"), {
    headers: { "Content-Type": img.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
