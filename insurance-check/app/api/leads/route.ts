import { NextResponse, type NextRequest } from "next/server";
import { getAppMode, isSubmissionEnabled } from "@/lib/config";
import { validateLeadInput } from "@/lib/validation";
import { clientIp, isSameOrigin, rateLimit, readJson } from "@/lib/server/request";
import { parseAttribution } from "@/lib/server/attribution";
import { signReceipt } from "@/lib/server/crypto";
import { submitLead } from "@/lib/server/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Receipt = { ok: true; refNo: string; receiptToken: string; demo: boolean };
const g = globalThis as unknown as { __icIdem?: Map<string, { at: number; body: Receipt }> };
const idem = (g.__icIdem ??= new Map());
const IDEM_TTL = 10 * 60_000;

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 403 });
  if (!isSubmissionEnabled()) {
    return NextResponse.json(
      { ok: false, error: "현재 신청 접수가 준비 중입니다. 운영 정보 설정 후 접수가 시작됩니다." },
      { status: 503 },
    );
  }
  if (!rateLimit(`lead:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "요청이 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  const body = await readJson(req);
  if (!body) return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });

  // 봇 차단: 숨김 필드(honeypot)가 채워졌거나 폼 체류 2초 미만이면 저장하지 않는다.
  // 차단 사유는 응답에 드러내지 않는다(일반 오류 문구).
  const elapsed = typeof body.elapsedMs === "number" ? body.elapsedMs : 0;
  if ((typeof body.website === "string" && body.website !== "") || elapsed < 2000) {
    return NextResponse.json({ ok: false, error: "신청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 400 });
  }

  const key = typeof body.idempotencyKey === "string" ? body.idempotencyKey.slice(0, 64) : "";
  const now = Date.now();
  for (const [k, v] of idem) if (now - v.at > IDEM_TTL) idem.delete(k);
  if (key && idem.has(key)) return NextResponse.json(idem.get(key)!.body);

  const parsed = validateLeadInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: "입력 내용을 확인해 주세요.", fieldErrors: parsed.errors }, { status: 422 });
  }

  try {
    const { lead } = await submitLead(parsed.value, parseAttribution(body.attribution));
    const res: Receipt = { ok: true, refNo: lead.refNo, receiptToken: signReceipt(lead.id), demo: getAppMode() === "demo" };
    if (key) idem.set(key, { at: now, body: res });
    return NextResponse.json(res);
  } catch (err) {
    console.error("[api/leads] submit failed", err instanceof Error ? err.message : "unknown");
    return NextResponse.json(
      { ok: false, error: "일시적인 오류로 신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
