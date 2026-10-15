import "server-only";

/**
 * 담당자 알림(문자·알림톡·메일) 연결부.
 *
 * 승인된 발송 제공자와 발신번호·템플릿 심사가 끝나기 전에는 **아무것도 보내지 않는다.**
 * 존재하지 않는 API를 흉내 내지 않기 위해 제공자 구현은 비워 두었다.
 * 연결 시: NOTIFY_PROVIDER 값에 맞는 어댑터를 추가하고, 메시지에는 신청번호만 넣는다
 * (고객 이름·연락처·메모를 알림 본문에 넣지 말 것 — 관리자 화면에서 확인).
 */
export type NotifyResult = { sent: false; reason: "provider-not-configured" | "provider-not-implemented" };

export async function notifyNewLead(refNo: string): Promise<NotifyResult> {
  const provider = process.env.NOTIFY_PROVIDER;
  if (!provider) return { sent: false, reason: "provider-not-configured" };
  console.warn(`[notify] NOTIFY_PROVIDER=${provider} 어댑터가 구현되지 않아 ${refNo} 알림을 보내지 않았습니다.`);
  return { sent: false, reason: "provider-not-implemented" };
}

export function notifyStatus(): { configured: boolean; provider: string | null } {
  const provider = process.env.NOTIFY_PROVIDER ?? null;
  return { configured: false, provider };
}
