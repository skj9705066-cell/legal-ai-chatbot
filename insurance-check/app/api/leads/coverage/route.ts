import { NextResponse, type NextRequest } from "next/server";
import { isSubmissionEnabled } from "@/lib/config";
import { validateCoverageInput } from "@/lib/validation";
import { clientIp, isSameOrigin, rateLimit, readJson } from "@/lib/server/request";
import { verifyReceipt } from "@/lib/server/crypto";
import { optInCoverage } from "@/lib/server/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 보장 분석 별도 동의. 신청 직후 발급된 영수증 토큰을 가진 브라우저만 호출할 수 있다. */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 403 });
  if (!isSubmissionEnabled()) return NextResponse.json({ ok: false, error: "현재 접수가 준비 중입니다." }, { status: 503 });
  if (!rateLimit(`coverage:${clientIp(req)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "요청이 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }
  const body = await readJson(req);
  if (!body) return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });

  const leadId = verifyReceipt(body.receiptToken);
  if (!leadId) {
    return NextResponse.json(
      { ok: false, error: "신청 확인 시간이 지났습니다. 상담 연락 시 보장 분석을 원한다고 말씀해 주세요." },
      { status: 401 },
    );
  }
  const parsed = validateCoverageInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: "입력 내용을 확인해 주세요.", fieldErrors: parsed.errors }, { status: 422 });
  }
  try {
    const result = await optInCoverage(leadId, parsed.value);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: "추가 신청을 처리할 수 없는 상태입니다." }, { status: 409 });
    }
    return NextResponse.json({ ok: true, refNo: result.refNo });
  } catch (err) {
    console.error("[api/leads/coverage] failed", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
