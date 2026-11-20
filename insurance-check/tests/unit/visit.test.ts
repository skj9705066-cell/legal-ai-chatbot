import { beforeAll, describe, expect, it } from "vitest";
import { serviceTypeFor } from "@/lib/types";
import { validateLeadInput, validateVisitPlace } from "@/lib/validation";
import { formatVisitAt, fromKstInput, toKstInput } from "@/lib/utils";

/**
 * 무료 방문 점검 개편(2026-11) 규칙
 * ① 새 신청서: 성함·휴대전화·지역·연락 희망 시간·관심 서비스·필수 동의, 이전 신청서 요청도 계속 받음
 * ② 관심 서비스 → 대표 유형 ③ 방문 일시는 관리자 PC 시간대와 무관하게 한국 시간
 * ④ 방문 예약·상담 이력·파기(데모 저장소로 실제 규칙 확인)
 */

const form = {
  name: "홍길순",
  phone: "010-1234-5678",
  region: "incheon",
  preferredTime: "weekday_morning",
  interests: ["card_points", "hidden"],
  privacyConsent: true,
};

describe("new visit form validation", () => {
  it("accepts the six fields and derives the service type", () => {
    const r = validateLeadInput(form);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatchObject({ region: "incheon", interests: ["card_points", "hidden"], serviceType: "general", preferredTime: "weekday_morning" });
  });
  it("requires region, contact time and at least one interest (no silent defaults)", () => {
    const r = validateLeadInput({ ...form, region: "", preferredTime: "", interests: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["interests", "preferredTime", "region"]);
  });
  it("rejects unknown interests and regions instead of dropping them", () => {
    expect(validateLeadInput({ ...form, interests: ["card_points", "coverage"] }).ok).toBe(false);
    expect(validateLeadInput({ ...form, region: "busan" }).ok).toBe(false);
  });
  it("'잘 모르겠어요' yields to concrete picks", () => {
    const r = validateLeadInput({ ...form, interests: ["not_sure", "unclaimed"] });
    expect(r.ok && r.value.interests).toEqual(["unclaimed"]);
    expect(r.ok && r.value.serviceType).toBe("unclaimed");
  });
  it("still accepts the previous form payload (page open during deploy)", () => {
    const r = validateLeadInput({ serviceType: "hidden", name: "홍길동", phone: "010-1234-5678", privacyConsent: true });
    expect(r.ok && r.value).toMatchObject({ serviceType: "hidden", region: null, interests: [], preferredTime: "anytime" });
  });
  it("maps interests to a representative type", () => {
    expect(serviceTypeFor(["card_points"])).toBe("card_points");
    expect(serviceTypeFor(["not_sure"])).toBe("general");
    expect(serviceTypeFor(["unclaimed", "hidden"])).toBe("general");
  });
});

describe("visit time and place", () => {
  it("reads datetime-local input as Korean time regardless of the browser zone", () => {
    expect(fromKstInput("2026-11-25T14:00")).toBe("2026-11-25T05:00:00.000Z");
    expect(toKstInput("2026-11-25T05:00:00.000Z")).toBe("2026-11-25T14:00");
    expect(fromKstInput("2026-11-25")).toBeNull();
    expect(formatVisitAt("2026-11-25T05:00:00.000Z")).toBe("11월 25일(수) 오후 2:00");
    expect(formatVisitAt("2026-11-24T15:30:00.000Z")).toBe("11월 25일(수) 오전 12:30");
  });
  it("keeps the place short and free of resident numbers", () => {
    expect(validateVisitPlace("  고객   자택 ")).toEqual({ ok: true, value: "고객 자택" });
    expect(validateVisitPlace("").ok && validateVisitPlace("")).toEqual({ ok: true, value: null });
    expect(validateVisitPlace("x".repeat(101)).ok).toBe(false);
    expect(validateVisitPlace("900101-1234567").ok).toBe(false);
  });
});

describe("visit booking, activities and purge (demo store)", () => {
  beforeAll(() => {
    process.env.APP_MODE = "demo";
    process.env.PII_ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
  });
  const counselor = { name: "상담사T", role: "counselor" as const, sub: "t", exp: Date.now() + 60_000 };

  async function newLead() {
    const { submitLead } = await import("@/lib/server/service");
    const v = validateLeadInput({ ...form, phone: `010-0000-${String(Math.floor(Math.random() * 9000) + 1000)}` });
    if (!v.ok) throw new Error("invalid");
    const { lead } = await submitLead(v.value, { utmSource: "meta", utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null, referrer: null, landingPath: "/" });
    return lead;
  }

  it("stores region/interests and moves a new lead to 'visit_booked' when a visit is first saved", async () => {
    const { updateLeadByStaff, listActivitiesForStaff } = await import("@/lib/server/service");
    const lead = await newLead();
    expect(lead).toMatchObject({ region: "incheon", interests: ["card_points", "hidden"], claimStatus: "new", visitAt: null });
    const r = await updateLeadByStaff(counselor as never, lead.id, { visitAt: "2030-01-02T05:00:00.000Z", visitPlace: "고객 자택" });
    expect(r.ok && r.lead).toMatchObject({ claimStatus: "visit_booked", visitAt: "2030-01-02T05:00:00.000Z", visitPlace: "고객 자택" });
    const acts = await listActivitiesForStaff(lead.id);
    expect(acts[0]).toMatchObject({ kind: "visit", actor: "상담사T" });
    expect(acts[0].content).toContain("1월 2일(수) 오후 2:00 · 고객 자택");
    expect((await updateLeadByStaff(counselor as never, lead.id, { visitAt: "not a date" })).ok).toBe(false);
  });

  it("records call/visit/memo notes but not hand-written SMS or resident numbers", async () => {
    const { addActivityByStaff } = await import("@/lib/server/service");
    const lead = await newLead();
    expect((await addActivityByStaff(counselor as never, lead.id, { kind: "call", content: "첫 통화" })).ok).toBe(true);
    expect((await addActivityByStaff(counselor as never, lead.id, { kind: "sms", content: "보냈음" })).ok).toBe(false);
    expect((await addActivityByStaff(counselor as never, lead.id, { kind: "memo", content: "" })).ok).toBe(false);
    expect((await addActivityByStaff(counselor as never, lead.id, { kind: "memo", content: "주민번호 900101-1234567" })).ok).toBe(false);
  });

  it("simulates (never sends) the visit SMS outside production and logs it", async () => {
    const { updateLeadByStaff, listActivitiesForStaff } = await import("@/lib/server/service");
    const { sendVisitConfirmSms } = await import("@/lib/server/notify");
    const lead = await newLead();
    expect(await sendVisitConfirmSms(counselor as never, lead.id)).toMatchObject({ ok: false, status: 409 });
    await updateLeadByStaff(counselor as never, lead.id, { visitAt: "2030-01-02T05:00:00.000Z" });
    const r = await sendVisitConfirmSms(counselor as never, lead.id);
    expect(r).toMatchObject({ ok: true, sent: false });
    const acts = await listActivitiesForStaff(lead.id);
    expect(acts[0].kind).toBe("sms");
    expect(acts[0].content).not.toContain("0000-"); // 고객 번호는 이력에 남기지 않는다(운영자 안내 번호만)
  });

  it("purge clears visit details and deletes the consultation log", async () => {
    const { addActivityByStaff, updateLeadByStaff, listActivitiesForStaff, purgeExpiredPersonalData } = await import("@/lib/server/service");
    const { demoRepository } = await import("@/lib/server/repo/demo");
    const lead = await newLead();
    await updateLeadByStaff(counselor as never, lead.id, { visitAt: "2030-01-02T05:00:00.000Z", visitPlace: "고객 자택" });
    await addActivityByStaff(counselor as never, lead.id, { kind: "call", content: "통화" });
    await demoRepository.updateLead(lead.id, { createdAt: "2020-01-01T00:00:00.000Z" } as never);
    await purgeExpiredPersonalData();
    const after = await demoRepository.getLead(lead.id);
    expect(after).toMatchObject({ name: "(삭제됨)", visitAt: null, visitPlace: null });
    expect(await listActivitiesForStaff(lead.id)).toEqual([]);
  });
});
