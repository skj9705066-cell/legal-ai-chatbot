import { NextResponse, type NextRequest } from "next/server";
import { FUNNEL_EVENTS, SERVICE_TYPES, type FunnelEventName, type ServiceType } from "@/lib/types";
import { sanitizeTag } from "@/lib/validation";
import { clientIp, isSameOrigin, rateLimit, readJson } from "@/lib/server/request";
import { repo } from "@/lib/server/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 서버가 직접 기록하는 이벤트는 클라이언트에서 받지 않는다(위조 방지). */
const CLIENT_EVENTS = new Set<FunnelEventName>(FUNNEL_EVENTS.filter((e) => e !== "consultation_booked"));

/**
 * 익명 1st-party 퍼널 이벤트. 화이트리스트 필드만 저장한다:
 * 이벤트명 · 탭 단위 랜덤 세션 id · UTM · 점검 유형. 이름·연락처·메모·건강정보는 받지 않는다.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return new NextResponse(null, { status: 204 });
  if (!rateLimit(`ev:${clientIp(req)}`, 120, 60_000)) return new NextResponse(null, { status: 204 });
  const body = await readJson(req, 2_000);
  if (!body) return new NextResponse(null, { status: 204 });

  const name = body.name as FunnelEventName;
  const sessionId = typeof body.sessionId === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(body.sessionId) ? body.sessionId : null;
  if (!CLIENT_EVENTS.has(name) || !sessionId) return new NextResponse(null, { status: 204 });
  const st = (SERVICE_TYPES as readonly string[]).includes(body.serviceType as string) ? (body.serviceType as ServiceType) : null;

  try {
    await repo().addEvent({
      name,
      at: new Date().toISOString(),
      sessionId,
      utmSource: sanitizeTag(body.utmSource),
      utmMedium: sanitizeTag(body.utmMedium),
      utmCampaign: sanitizeTag(body.utmCampaign),
      serviceType: st,
    });
  } catch (err) {
    console.error("[api/events] failed", err instanceof Error ? err.message : "unknown");
  }
  return new NextResponse(null, { status: 204 });
}
