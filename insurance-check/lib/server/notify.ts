import "server-only";
import { SolapiMessageService } from "solapi";
import { randomUUID } from "node:crypto";
import { getAppMode, getOperatorInfo, type OperatorInfo } from "@/lib/config";
import { SERVICE_CONTENT } from "@/lib/content";
import { INTEREST_SHORT, REGION_LABEL, type Lead } from "@/lib/types";
import type { StaffSession } from "@/lib/session";
import { formatVisitAt } from "@/lib/utils";
import { decryptPii } from "./crypto";
import { repo } from "./repo";
import { DELETED_NAME } from "./repo/types";

/**
 * 신규 상담 신청 → 운영자 휴대폰 문자 알림 (솔라피 SMS/LMS).
 *
 * - 신청이 DB에 저장된 뒤에만 부른다(app/api/leads가 응답을 보낸 뒤 after()로 실행). 실패해도 신청은 그대로 완료.
 * - 수신번호는 운영자 번호 하나로 고정. 고객 전화번호는 문자에 넣지 않는다(고객명·상담 유형·신청 시간만).
 * - 보내지 않는 경우: 운영(Production) 배포가 아님(Preview 자동 테스트 신청 등), 테스트 신청, 같은 연락처의 30일 내 중복 신청.
 *   같은 제출의 재전송(더블클릭)은 저장소가 한 건으로 묶어 여기까지 오지 않는다.
 * - 키·시크릿·발신번호는 서버 환경변수(SOLAPI_API_KEY·SOLAPI_API_SECRET·SOLAPI_SENDER)로만 받는다. NEXT_PUBLIC_ 금지.
 * - 결과는 관리자 전용 감사 로그(관리자 → 감사 로그)에 신청번호와 함께 남긴다. 고객 이름·연락처는 기록하지 않는다.
 */

/** 알림 수신번호(운영자 손국주) — 고정 */
export const OPERATOR_ALERT_TO = "01088222341";
const SEND_TIMEOUT_MS = 8_000;

export type NotifyResult =
  | { sent: true; groupId: string | null }
  | { sent: false; reason: "not-production" | "test-lead" | "duplicate" | "not-configured" | "failed"; error?: string };

type LeadForNotice = Pick<Lead, "refNo" | "name" | "serviceType" | "createdAt" | "isTest" | "duplicateOf"> &
  Partial<Pick<Lead, "region" | "interests">>;

function solapiConfig() {
  const apiKey = process.env.SOLAPI_API_KEY?.trim();
  const apiSecret = process.env.SOLAPI_API_SECRET?.trim();
  const sender = process.env.SOLAPI_SENDER?.replace(/\D/g, "");
  return apiKey && apiSecret && sender ? { apiKey, apiSecret, sender } : null;
}

/** "2026-10-18 20:30" (한국 시간) */
function kstMinute(iso: string): string {
  return new Date(Date.parse(iso) + 9 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
}

export function newLeadMessage(lead: Pick<Lead, "name" | "serviceType" | "createdAt"> & Partial<Pick<Lead, "region" | "interests">>): string {
  const interests = lead.interests?.length ? lead.interests.map((i) => INTEREST_SHORT[i]).join(", ") : null;
  return [
    "[내보험 통합 점검]",
    "신규 상담 신청이 접수되었습니다.",
    `고객명: ${lead.name}`,
    ...(lead.region ? [`지역: ${REGION_LABEL[lead.region]}`] : []),
    `관심 서비스: ${interests ?? SERVICE_CONTENT[lead.serviceType]?.pickTitle ?? lead.serviceType}`,
    `신청 시간: ${kstMinute(lead.createdAt)}`,
    "관리자 CRM에서 확인하세요.",
  ].join("\n");
}

/** 오류 내용에서 전화번호처럼 보이는 숫자를 가리고 길이를 줄인다(감사 로그·서버 로그용) */
function safeError(err: unknown): string {
  const e = err as { _tag?: string; name?: string; message?: string };
  return `${e?._tag ?? e?.name ?? "Error"}: ${e?.message ?? String(err)}`.replace(/\d{7,}/g, "***").slice(0, 200);
}

export async function sendNewLeadSms(lead: LeadForNotice): Promise<NotifyResult> {
  if (getAppMode() !== "production") return { sent: false, reason: "not-production" };
  if (lead.isTest) return { sent: false, reason: "test-lead" };
  if (lead.duplicateOf) return { sent: false, reason: "duplicate" };
  const cfg = solapiConfig();
  if (!cfg) return { sent: false, reason: "not-configured" };
  try {
    const service = new SolapiMessageService(cfg.apiKey, cfg.apiSecret);
    const res = await Promise.race([
      service.send({ to: OPERATOR_ALERT_TO, from: cfg.sender, text: newLeadMessage(lead) }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), SEND_TIMEOUT_MS)),
    ]);
    const failed = res.failedMessageList?.[0];
    if (failed) return { sent: false, reason: "failed", error: safeError({ name: failed.statusCode, message: failed.statusMessage }) };
    return { sent: true, groupId: res.groupInfo?.groupId ?? null };
  } catch (err) {
    return { sent: false, reason: "failed", error: safeError(err) };
  }
}

const SKIP_DETAIL: Record<string, string> = {
  "not-configured": "솔라피 설정(SOLAPI_API_KEY·SOLAPI_API_SECRET·SOLAPI_SENDER) 없음 — 발송 안 함",
  duplicate: "같은 연락처 30일 내 중복 신청 — 발송 안 함",
};

/** 신청 저장 후 호출: 문자 발송 + 관리자 감사 로그. 어떤 경우에도 예외를 밖으로 던지지 않는다 */
export async function notifyNewLead(lead: LeadForNotice): Promise<NotifyResult> {
  const result = await sendNewLeadSms(lead).catch((err): NotifyResult => ({ sent: false, reason: "failed", error: safeError(err) }));
  // 운영이 아니거나 테스트 신청이면 기록하지 않는다(Preview 자동 테스트가 감사 로그를 채우지 않게)
  if (!result.sent && (result.reason === "not-production" || result.reason === "test-lead")) return result;
  const detail = result.sent
    ? `${lead.refNo} 운영자 알림 문자 발송 접수${result.groupId ? ` (솔라피 ${result.groupId})` : ""}`
    : `${lead.refNo} ${result.reason === "failed" ? `운영자 알림 문자 실패 — ${result.error}` : SKIP_DETAIL[result.reason]}`;
  if (result.sent === false && result.reason === "failed") console.error("[notify] sms failed", lead.refNo, result.error);
  await repo()
    .addAudit({ actor: "system", role: "system", action: result.sent ? "notify.sms_sent" : result.reason === "failed" ? "notify.sms_failed" : "notify.sms_skipped", target: null, detail })
    .catch((err) => console.error("[notify] audit failed", safeError(err)));
  return result;
}

/* ───────────── 고객 방문 안내 문자 (상담사가 관리자 화면에서 직접 보냄) ───────────── */

/**
 * 방문 일정 안내 문자. 고객이 신청한 상담의 일정 확인용(광고 아님)이라 광고 수신 동의와 무관하게 보낼 수 있다.
 * 담당자 소속·변경 연락처를 함께 적고, 비밀번호·인증번호를 묻지 않는다는 안내를 넣어 사칭 문자와 구분되게 한다.
 * 금액·보험 상품·건강정보는 넣지 않는다.
 */
export function visitConfirmMessage(lead: Pick<Lead, "name" | "visitAt" | "visitPlace">, op: Pick<OperatorInfo, "plannerName" | "agencyName" | "contactPhone">): string {
  const who = [op.plannerName, op.agencyName ? `(${op.agencyName} 소속 보험설계사)` : null].filter(Boolean).join(" ");
  return [
    "[무료 방문 점검 안내]",
    `${lead.name}님, 방문 일정을 알려드립니다.`,
    `일시: ${formatVisitAt(lead.visitAt)}`,
    ...(lead.visitPlace ? [`장소: ${lead.visitPlace}`] : []),
    ...(who ? [`담당: ${who}`] : []),
    ...(op.contactPhone ? [`일정 변경·취소: ${op.contactPhone}`] : []),
    "비밀번호·인증번호는 절대 여쭙지 않습니다.",
  ].join("\n");
}

export type VisitSmsResult =
  | { ok: true; sent: boolean; message: string; note: string }
  | { ok: false; status: number; error: string };

/**
 * 방문 안내 문자 발송. 운영 모드 + 실제 신청 + 솔라피 설정이 있을 때만 실제로 보낸다.
 * 데모·테스트 모드에서는 보내지 않고 '발송 안 함(데모)'으로 이력만 남긴다(테스트 번호로 문자가 나가지 않게).
 * 상담 이력에는 보낸 문구를, 감사 로그에는 신청번호·결과만 남긴다(전화번호는 어디에도 남기지 않음).
 */
export async function sendVisitConfirmSms(session: StaffSession, leadId: string): Promise<VisitSmsResult> {
  const r = repo();
  const lead = await r.getLead(leadId);
  if (!lead) return { ok: false, status: 404, error: "신청을 찾을 수 없습니다." };
  if (lead.name === DELETED_NAME || lead.privacyStatus === "delete_requested" || lead.privacyStatus === "processing") {
    return { ok: false, status: 409, error: "삭제 요청된 고객에게는 문자를 보낼 수 없습니다." };
  }
  if (!lead.visitAt) return { ok: false, status: 409, error: "먼저 방문 일시를 저장해 주세요." };
  if (Date.parse(lead.visitAt) < Date.now()) return { ok: false, status: 409, error: "이미 지난 방문 일정입니다. 일시를 확인해 주세요." };

  const message = visitConfirmMessage(lead, getOperatorInfo());
  const mode = getAppMode();
  const cfg = solapiConfig();
  let sent = false;
  let note: string;
  if (mode !== "production" || lead.isTest || lead.isDemo) {
    note = `발송 안 함 — ${mode === "demo" ? "데모" : "테스트"} 모드(실제 문자는 운영 모드에서만 발송)`;
  } else if (!cfg) {
    return { ok: false, status: 503, error: "문자 발송 설정(SOLAPI_API_KEY·SOLAPI_API_SECRET·SOLAPI_SENDER)이 없습니다." };
  } else {
    try {
      const to = decryptPii(lead.phoneEnc);
      const service = new SolapiMessageService(cfg.apiKey, cfg.apiSecret);
      const res = await Promise.race([
        service.send({ to, from: cfg.sender, text: message }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), SEND_TIMEOUT_MS)),
      ]);
      const failed = res.failedMessageList?.[0];
      if (failed) throw Object.assign(new Error(failed.statusMessage), { name: failed.statusCode });
      sent = true;
      note = "발송 접수";
    } catch (err) {
      const error = safeError(err);
      console.error("[notify] visit sms failed", lead.refNo, error);
      await r.addAudit({ actor: session.name, role: session.role, action: "notify.visit_sms_failed", target: leadId, detail: `${lead.refNo} 방문 안내 문자 실패 — ${error}` });
      return { ok: false, status: 502, error: "문자를 보내지 못했습니다. 잠시 후 다시 시도하거나 전화로 안내해 주세요." };
    }
  }
  await r.addActivity({ id: randomUUID(), leadId, at: new Date().toISOString(), actor: session.name, kind: "sms", content: `방문 안내 문자 ${sent ? "발송" : "(발송 안 함)"}\n${message}` });
  await r.addAudit({ actor: session.name, role: session.role, action: sent ? "notify.visit_sms_sent" : "notify.visit_sms_skipped", target: leadId, detail: `${lead.refNo} 방문 안내 문자 ${note}` });
  return { ok: true, sent, message, note };
}

export function notifyStatus(): { configured: boolean; provider: string | null } {
  return { configured: solapiConfig() !== null, provider: solapiConfig() ? "솔라피 SMS" : null };
}
