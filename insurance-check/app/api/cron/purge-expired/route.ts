import { NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/lib/server/crypto";
import { purgeExpiredPersonalData } from "@/lib/server/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 보유기간(신청일로부터 1년) 경과 신청 정보 자동 파기 — Vercel Cron이 매일 부른다(vercel.json, Production 배포에서만 실행).
 * Vercel은 CRON_SECRET 환경변수가 있으면 `Authorization: Bearer <CRON_SECRET>`을 붙여 호출한다.
 * 비밀값이 없으면 아무도 실행할 수 없게 막는다(운영 모드는 CRON_SECRET이 없으면 접수도 잠긴다 — config/requirements.json).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  if (!safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await purgeExpiredPersonalData();
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[cron/purge-expired]", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "purge_failed" }, { status: 500 });
  }
}
