import { NextResponse, type NextRequest } from "next/server";
import { validatePrivacyRequest } from "@/lib/validation";
import { clientIp, isSameOrigin, rateLimit, readJson } from "@/lib/server/request";
import { createPrivacyRequest } from "@/lib/server/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 403 });
  if (!rateLimit(`privacy:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "요청이 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }
  const body = await readJson(req);
  if (!body) return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  const parsed = validatePrivacyRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: "입력 내용을 확인해 주세요.", fieldErrors: parsed.errors }, { status: 422 });
  }
  try {
    await createPrivacyRequest(parsed.value);
    // 일치하는 신청이 있는지 여부는 응답으로 알려주지 않는다(타인 신청 여부 탐색 방지).
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/privacy-requests] failed", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "일시적인 오류가 발생했습니다. 연락처로 요청해 주세요." }, { status: 500 });
  }
}
