import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * 신규 신청 운영자 문자 알림 — 솔라피 SDK는 가짜로 바꿔 실제 문자는 보내지 않는다.
 * ① 문구(고객명·상담 유형·신청 시간 KST, 고객 전화번호 없음) ② 수신번호 고정 ③ 운영·실신청만 발송(테스트·중복·운영 아님 제외)
 * ④ 발송 실패해도 예외 없이 결과만 감사 로그(관리자 전용, 고객 이름 없음)에 남긴다
 */

const sent: Array<{ to: string; from: string; text: string }> = [];
let failWith: Error | null = null;

vi.mock("solapi", () => ({
  SolapiMessageService: class {
    constructor(
      public key: string,
      public secret: string,
    ) {}
    async send(m: { to: string; from: string; text: string }) {
      if (failWith) throw failWith;
      sent.push(m);
      return { failedMessageList: [], groupInfo: { groupId: "G4V20261018TEST" } };
    }
  },
}));

// 운영 모드에서는 저장소가 Supabase를 가리키므로 감사 로그만 메모리로 받는다
const audit: Array<{ action: string; role: string; target: string | null; detail: string }> = [];
vi.mock("@/lib/server/repo", () => ({ repo: () => ({ addAudit: async (e: (typeof audit)[number]) => void audit.unshift(e) }) }));

const LEAD = { refNo: "IC-261018-ABCDE", name: "홍길동", serviceType: "unclaimed" as const, createdAt: "2026-10-18T11:30:00.000Z", isTest: false, duplicateOf: null };
const ENV = { VERCEL_ENV: "production", SOLAPI_API_KEY: "NCSKEYTEST", SOLAPI_API_SECRET: "secret-test-value", SOLAPI_SENDER: "010-1111-2222" };

beforeAll(() => {
  process.env.APP_MODE = "demo";
});
afterEach(() => {
  for (const k of Object.keys(ENV)) delete process.env[k];
  sent.length = 0;
  audit.length = 0;
  failWith = null;
});

describe("new lead SMS", () => {
  it("builds the requested message without the customer's phone number", async () => {
    const { newLeadMessage } = await import("@/lib/server/notify");
    expect(newLeadMessage(LEAD)).toBe(
      "[내보험 통합 점검]\n신규 상담 신청이 접수되었습니다.\n고객명: 홍길동\n상담 유형: 병원비·수술비\n신청 시간: 2026-10-18 20:30\n관리자 CRM에서 확인하세요.",
    );
  });

  it("sends once to the fixed operator number in production and records it for admins", async () => {
    Object.assign(process.env, ENV);
    const { notifyNewLead } = await import("@/lib/server/notify");
    const r = await notifyNewLead(LEAD);
    expect(r).toEqual({ sent: true, groupId: "G4V20261018TEST" });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: "01088222341", from: "01011112222" });
    expect(sent[0].text).not.toMatch(/010-?\d{4}-?\d{4}/);
    const [log] = audit;
    expect(log).toMatchObject({ action: "notify.sms_sent", role: "system", target: null });
    expect(log.detail).toContain(LEAD.refNo);
    expect(log.detail).not.toContain("홍길동");
  });

  it("does not send outside production, for test leads, duplicates, or without settings", async () => {
    const { notifyNewLead } = await import("@/lib/server/notify");
    Object.assign(process.env, ENV, { VERCEL_ENV: "preview" });
    expect(await notifyNewLead(LEAD)).toMatchObject({ sent: false, reason: "not-production" });
    process.env.VERCEL_ENV = "production";
    expect(await notifyNewLead({ ...LEAD, isTest: true })).toMatchObject({ sent: false, reason: "test-lead" });
    expect(await notifyNewLead({ ...LEAD, duplicateOf: "IC-261017-XXXXX" })).toMatchObject({ sent: false, reason: "duplicate" });
    delete process.env.SOLAPI_API_SECRET;
    expect(await notifyNewLead(LEAD)).toMatchObject({ sent: false, reason: "not-configured" });
    expect(sent).toHaveLength(0);
    // 운영·실신청이 아닌 경우(Preview 자동 테스트 등)는 감사 로그도 남기지 않는다
    expect(audit.map((a) => a.action)).toEqual(["notify.sms_skipped", "notify.sms_skipped"]);
  });

  it("never throws when the SMS API fails; logs a masked error for admins", async () => {
    Object.assign(process.env, ENV);
    failWith = new Error("발신번호 01011112222 미등록");
    const { notifyNewLead } = await import("@/lib/server/notify");
    const r = await notifyNewLead(LEAD);
    expect(r).toMatchObject({ sent: false, reason: "failed" });
    const [log] = audit;
    expect(log.action).toBe("notify.sms_failed");
    expect(log.detail).not.toContain("01011112222");
  });
});
