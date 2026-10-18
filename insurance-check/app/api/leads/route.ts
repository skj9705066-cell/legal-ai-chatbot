import { after, NextResponse, type NextRequest } from "next/server";
import { getAppMode, isSubmissionEnabled } from "@/lib/config";
import { trialMode, type TrialMode } from "@/lib/types";
import { requiresThirdPartyConsent, validateLeadInput } from "@/lib/validation";
import { clientIp, isSameOrigin, rateLimit, readJson } from "@/lib/server/request";
import { parseAttribution } from "@/lib/server/attribution";
import { signReceipt } from "@/lib/server/crypto";
import { normalizeIdempotencyKey, submitLead } from "@/lib/server/service";
import { getDbCheck } from "@/lib/server/db-check";
import { notifyNewLead } from "@/lib/server/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Receipt = { ok: true; refNo: string; receiptToken: string; trial: TrialMode };

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

  // 같은 제출의 재전송(더블클릭·네트워크 재시도)은 저장소가 제출 키로 한 건으로 묶는다(DB 고유 인덱스).
  // 서버가 여러 대여도 같은 결과가 나오도록 메모리 캐시는 쓰지 않는다.
  const key = normalizeIdempotencyKey(body.idempotencyKey);

  const parsed = validateLeadInput(body, { requireThirdParty: requiresThirdPartyConsent(process.env.THIRD_PARTY_PROVISION) });
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: "입력 내용을 확인해 주세요.", fieldErrors: parsed.errors }, { status: 422 });
  }

  // 실제 DB를 쓰는 모드: DB 자동 점검(공개 키 차단·최소 권한·칼럼·관리자)을 통과해야 저장한다
  const dbCheck = await getDbCheck();
  if (dbCheck && !dbCheck.ok) {
    console.error("[api/leads] db check failed:", dbCheck.items.filter((i) => !i.ok).map((i) => i.id).join(","));
    return NextResponse.json({ ok: false, error: "현재 신청 접수를 일시 중단했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }

  try {
    const { lead, replayed } = await submitLead(parsed.value, parseAttribution(body.attribution), key);
    // DB 저장이 끝난 새 신청만 운영자 문자 알림 — 응답을 보낸 뒤 실행하므로 발송이 늦거나 실패해도 고객 신청은 이미 완료된 상태다.
    // 같은 제출의 재전송(replayed)은 이미 알림을 보낸 신청이라 다시 보내지 않는다.
    if (!replayed) after(() => notifyNewLead(lead));
    const res: Receipt = { ok: true, refNo: lead.refNo, receiptToken: signReceipt(lead.id), trial: trialMode(getAppMode()) };
    return NextResponse.json(res);
  } catch (err) {
    console.error("[api/leads] submit failed", err instanceof Error ? err.message : "unknown");
    return NextResponse.json(
      { ok: false, error: "일시적인 오류로 신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
