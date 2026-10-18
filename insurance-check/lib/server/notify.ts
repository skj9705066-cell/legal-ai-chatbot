import "server-only";
import { SolapiMessageService } from "solapi";
import { getAppMode } from "@/lib/config";
import { SERVICE_CONTENT } from "@/lib/content";
import type { Lead } from "@/lib/types";
import { repo } from "./repo";

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

type LeadForNotice = Pick<Lead, "refNo" | "name" | "serviceType" | "createdAt" | "isTest" | "duplicateOf">;

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

export function newLeadMessage(lead: Pick<Lead, "name" | "serviceType" | "createdAt">): string {
  return [
    "[내보험 통합 점검]",
    "신규 상담 신청이 접수되었습니다.",
    `고객명: ${lead.name}`,
    `상담 유형: ${SERVICE_CONTENT[lead.serviceType]?.pickTitle ?? lead.serviceType}`,
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

export function notifyStatus(): { configured: boolean; provider: string | null } {
  return { configured: solapiConfig() !== null, provider: solapiConfig() ? "솔라피 SMS" : null };
}
