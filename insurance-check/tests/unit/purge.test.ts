import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

/**
 * 보유기간(신청일로부터 1년) 경과 자동 파기 — 데모 저장소로 실제 파기 규칙을 확인한다.
 * ① 1년이 지난 신청만 익명화(이름·연락처·메모·동의 제거, DB 제약 ic_leads_deleted_is_scrubbed를 만족)하고 최근 신청은 그대로
 * ② 다시 실행해도 같은 행을 또 세지 않는다 ③ 실행 기록이 감사 로그에 남는다 ④ Cron 경로는 CRON_SECRET 없이는 실행되지 않는다
 */

beforeAll(() => {
  process.env.APP_MODE = "demo";
  process.env.PII_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

async function seedLead(createdAt: string, name: string) {
  const { demoRepository } = await import("@/lib/server/repo/demo");
  const all = await demoRepository.listLeads({ limit: 1 });
  const base = all[0] ?? (await demoRepository.listLeads({}))[0];
  const id = crypto.randomUUID();
  await demoRepository.insertLead({
    ...base,
    id,
    refNo: `IC-TEST-${id.slice(0, 5)}`,
    createdAt,
    name,
    phoneMasked: "010-****-1234",
    phoneEnc: "enc",
    phoneHash: `hash-${id}`,
    memo: "메모",
    notes: "상담 기록",
    marketingConsent: true,
    coverageConsent: true,
    coverageStatus: "pending",
    privacyStatus: "none",
    idempotencyKey: null,
  });
  await demoRepository.insertPrivacyRequest({
    id: crypto.randomUUID(),
    createdAt,
    type: "withdraw_marketing",
    name,
    phoneMasked: "010-****-1234",
    phoneHash: `hash-${id}`,
    matchedLeadIds: [id],
    status: "completed",
    handledBy: "관리자",
    handledAt: createdAt,
    note: "",
  });
  return id;
}

describe("purgeExpiredPersonalData", () => {
  it("anonymizes only applications older than one year, once, and records the run", async () => {
    const { purgeExpiredPersonalData, retentionCutoff } = await import("@/lib/server/service");
    const { demoRepository } = await import("@/lib/server/repo/demo");
    const now = new Date("2027-10-20T00:00:00Z");
    expect(retentionCutoff(now)).toBe("2026-10-20T00:00:00.000Z");

    const oldId = await seedLead("2026-10-19T23:59:59.000Z", "오래된신청");
    const freshId = await seedLead("2026-10-20T00:00:01.000Z", "최근신청");

    const first = await purgeExpiredPersonalData(now);
    expect(first.leads).toBeGreaterThanOrEqual(1);
    expect(first.privacyRequests).toBeGreaterThanOrEqual(1);

    const old = await demoRepository.getLead(oldId);
    expect(old).toMatchObject({
      name: "(삭제됨)",
      phoneMasked: "***-****-****",
      phoneEnc: "",
      phoneHash: "",
      memo: "",
      notes: "",
      marketingConsent: false,
      coverageConsent: false,
      coverageStatus: "withdrawn",
      privacyStatus: "completed",
    });
    // 통계용 비식별 항목은 남는다
    expect(old?.serviceType).toBeTruthy();
    expect(old?.refNo).toMatch(/^IC-TEST-/);

    const fresh = await demoRepository.getLead(freshId);
    expect(fresh).toMatchObject({ name: "최근신청", phoneEnc: "enc", memo: "메모", marketingConsent: true, coverageConsent: true });

    const reqs = await demoRepository.listPrivacyRequests();
    expect(reqs.find((r) => r.matchedLeadIds.includes(oldId))).toMatchObject({ name: "(삭제됨)", phoneHash: "" });
    expect(reqs.find((r) => r.matchedLeadIds.includes(freshId))?.name).toBe("최근신청");

    const again = await purgeExpiredPersonalData(now);
    expect(again).toMatchObject({ leads: 0, privacyRequests: 0 });

    const audit = await demoRepository.listAudit({ limit: 5 });
    expect(audit[0]).toMatchObject({ actor: "system", role: "system", action: "privacy.purge_expired" });
  });
});

describe("GET /api/cron/purge-expired", () => {
  const call = async (auth?: string) => {
    const { GET } = await import("@/app/api/cron/purge-expired/route");
    return GET(new NextRequest("http://localhost/api/cron/purge-expired", { headers: auth ? { authorization: auth } : {} }));
  };

  it("refuses to run when CRON_SECRET is not configured", async () => {
    expect((await call("Bearer anything")).status).toBe(503);
  });
  it("rejects a missing or wrong secret", async () => {
    process.env.CRON_SECRET = "s".repeat(32);
    expect((await call()).status).toBe(401);
    expect((await call(`Bearer ${"x".repeat(32)}`)).status).toBe(401);
  });
  it("runs the purge with the Vercel Cron header", async () => {
    process.env.CRON_SECRET = "s".repeat(32);
    const res = await call(`Bearer ${"s".repeat(32)}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, leads: expect.any(Number), privacyRequests: expect.any(Number) });
  });
});

describe("readiness", () => {
  it("requires CRON_SECRET and server/DB locations in production but not in staging", async () => {
    const { getReadiness, isStagingRequirement } = await import("@/lib/config");
    const items = getReadiness().items;
    for (const key of ["CRON_SECRET", "SERVER_REGION", "DB_REGION"]) {
      const item = items.find((i) => i.key === key);
      expect(item, key).toBeTruthy();
      expect(isStagingRequirement(item!), key).toBe(false);
    }
    expect(isStagingRequirement(items.find((i) => i.key === "PII_ENCRYPTION_KEY")!)).toBe(true);
  });
});
