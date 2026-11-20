import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { COVERAGE_CONSENT_VERSION, MARKETING_CONSENT_VERSION, PRIVACY_CONSENT_VERSION, THIRD_PARTY_CONSENT_VERSION, getAppMode } from "@/lib/config";
import {
  ACTIVITY_KINDS,
  ACTIVITY_KIND_LABEL,
  COVERAGE_ACTIVE_STATUSES,
  CONTACT_METHOD_LABEL,
  CLAIM_STATUSES,
  PREFERRED_TIME_LABEL,
  type Attribution,
  type ClaimStatus,
  type ContactMethod,
  type CoverageStatus,
  type ActivityKind,
  type Lead,
  type LeadActivity,
  type PreferredTime,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
  type StaffRole,
} from "@/lib/types";
import { maskPhone, normalizePhone, validateVisitPlace, type LeadInput } from "@/lib/validation";
import { formatVisitAt } from "@/lib/utils";
import type { StaffSession } from "@/lib/session";
import { decryptPii, encryptPii, hashPhone } from "./crypto";
import { repo, toLead, type LeadFilter, type LeadRow } from "./repo";
import { DELETED_NAME, DuplicateSubmissionError, LEAD_SCRUB, PRIVACY_REQUEST_SCRUB } from "./repo/types";
import { isSalesEligible } from "./repo/filter";

const DUPLICATE_WINDOW_MS = 30 * 86_400_000;

function newRefNo(): string {
  const d = new Date(Date.now() + 9 * 3_600_000); // KST
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, "");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(5);
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `IC-${ymd}-${suffix}`;
}

/** 브라우저가 만든 제출 키(UUID 등). 형식이 다르면 쓰지 않는다 */
export function normalizeIdempotencyKey(v: unknown): string | null {
  return typeof v === "string" && /^[A-Za-z0-9-]{8,64}$/.test(v) ? v : null;
}

/**
 * 신청 저장. 같은 제출 키로 다시 들어오면(더블클릭·재전송) 새로 저장하지 않고 처음 신청을 돌려준다.
 * 동의는 항목별로 여부·시각·문구 버전을 함께 남긴다. 테스트 모드의 신청은 모두 테스트 신청(운영 지표 제외)이다.
 */
export async function submitLead(
  input: LeadInput,
  attribution: Attribution,
  idempotencyKey: string | null = null,
): Promise<{ lead: Lead; replayed: boolean }> {
  const r = repo();
  if (idempotencyKey) {
    const existing = await r.findLeadByIdempotencyKey(idempotencyKey);
    if (existing) return { lead: toLead(existing), replayed: true };
  }
  const phoneHash = hashPhone(input.phone);
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const duplicateOf = await r.findRecentRefByPhoneHash(phoneHash, since);
  const now = new Date().toISOString();
  const mode = getAppMode();

  const row: LeadRow = {
    id: randomUUID(),
    refNo: newRefNo(),
    createdAt: now,
    serviceType: input.serviceType,
    name: input.name,
    phoneMasked: maskPhone(input.phone),
    phoneEnc: encryptPii(input.phone),
    phoneHash,
    idempotencyKey,
    region: input.region,
    interests: input.interests,
    visitAt: null,
    visitPlace: null,
    preferredTime: input.preferredTime,
    memo: input.memo,
    attribution,
    claimStatus: "new",
    marketingConsent: input.marketingConsent,
    thirdPartyConsent: input.thirdPartyConsent,
    privacyConsentVersion: PRIVACY_CONSENT_VERSION,
    privacyConsentAt: now,
    marketingConsentAt: input.marketingConsent ? now : null,
    marketingConsentVersion: input.marketingConsent ? MARKETING_CONSENT_VERSION : null,
    marketingWithdrawnAt: null,
    thirdPartyConsentAt: input.thirdPartyConsent ? now : null,
    thirdPartyConsentVersion: input.thirdPartyConsent ? THIRD_PARTY_CONSENT_VERSION : null,
    // 보장 분석은 신청 완료 후 별도 동의로만 켜진다. 여기서는 항상 미동의.
    coverageConsent: false,
    coverageConsentAt: null,
    coverageConsentVersion: null,
    coverageContactMethod: null,
    coverageStatus: "not_consented",
    nextContactAt: null,
    assignee: null,
    notes: "",
    privacyStatus: "none",
    duplicateOf,
    isTest: mode === "staging",
    isDemo: mode === "demo",
  };
  try {
    await r.insertLead(row);
  } catch (err) {
    // 동시에 들어온 같은 제출(첫 조회 후 저장 전에 경합) → 먼저 저장된 신청을 돌려준다
    if (err instanceof DuplicateSubmissionError && idempotencyKey) {
      const existing = await r.findLeadByIdempotencyKey(idempotencyKey);
      if (existing) return { lead: toLead(existing), replayed: true };
    }
    throw err;
  }
  await r.addAudit({
    actor: "public",
    role: "public",
    action: "lead.create",
    target: row.id,
    detail: `${row.refNo} 접수${duplicateOf ? ` (중복: ${duplicateOf})` : ""}`,
  });
  return { lead: toLead(row), replayed: false };
}

export async function optInCoverage(
  leadId: string,
  input: { contactMethod: ContactMethod; preferredTime: PreferredTime },
): Promise<{ ok: true; refNo: string } | { ok: false; reason: "not_found" | "not_allowed" }> {
  const r = repo();
  const lead = await r.getLead(leadId);
  if (!lead) return { ok: false, reason: "not_found" };
  if (lead.privacyStatus !== "none") return { ok: false, reason: "not_allowed" };
  if (lead.coverageConsent) return { ok: true, refNo: lead.refNo }; // 멱등
  await r.updateLead(leadId, {
    coverageConsent: true,
    coverageConsentAt: new Date().toISOString(),
    coverageConsentVersion: COVERAGE_CONSENT_VERSION,
    coverageContactMethod: input.contactMethod,
    coverageStatus: "pending",
    // 보장 분석 희망 시간은 메모로 남긴다(보험금 점검 희망 시간과 다를 수 있음).
    notes: `${lead.notes ? `${lead.notes}\n` : ""}[보장 분석 희망 시간] ${PREFERRED_TIME_LABEL[input.preferredTime]} / ${CONTACT_METHOD_LABEL[input.contactMethod]}`,
  });
  await r.addAudit({
    actor: "public",
    role: "public",
    action: "coverage.opt_in",
    target: leadId,
    detail: `${lead.refNo} 보장 분석 별도 동의 (${COVERAGE_CONSENT_VERSION})`,
  });
  return { ok: true, refNo: lead.refNo };
}

/* ───────────── 관리자 ───────────── */

export async function listLeadsForStaff(session: StaffSession, filter: LeadFilter & { rawQuery?: string }) {
  const r = repo();
  const f: LeadFilter = { ...filter };
  const phone = filter.rawQuery ? normalizePhone(filter.rawQuery) : null;
  if (phone) {
    f.phoneHash = hashPhone(phone);
    delete f.q;
  }
  const rows = await r.listLeads(f);
  await r.addAudit({
    actor: session.name,
    role: session.role,
    action: f.salesOnly ? "lead.list_sales" : "lead.list",
    target: null,
    detail: `목록 조회 ${rows.length}건${phone ? " (연락처 검색)" : ""}`,
  });
  return rows.map(toLead);
}

export async function getLeadForStaff(session: StaffSession, id: string) {
  const r = repo();
  const row = await r.getLead(id);
  if (!row) return null;
  await r.addAudit({ actor: session.name, role: session.role, action: "lead.view", target: id, detail: row.refNo });
  return toLead(row);
}

export async function revealPhone(session: StaffSession, id: string): Promise<string | null> {
  const r = repo();
  const row = await r.getLead(id);
  if (!row || !row.phoneEnc) return null;
  const phone = decryptPii(row.phoneEnc);
  await r.addAudit({
    actor: session.name,
    role: session.role,
    action: "lead.reveal_phone",
    target: id,
    detail: `${row.refNo} 연락처 원문 열람`,
  });
  return phone;
}

export interface StaffLeadPatch {
  claimStatus?: ClaimStatus;
  coverageStatus?: CoverageStatus;
  nextContactAt?: string | null;
  visitAt?: string | null;
  visitPlace?: string | null;
  assignee?: string | null;
  notes?: string;
  isTest?: boolean;
}

export type PatchResult = { ok: true; lead: Lead } | { ok: false; status: number; error: string };

export async function updateLeadByStaff(session: StaffSession, id: string, raw: Record<string, unknown>): Promise<PatchResult> {
  const r = repo();
  const found = await r.getLead(id);
  // 변경 전 값을 복사해 둔다(데모 저장소는 같은 객체를 고쳐 쓰므로, 저장 후 비교가 어긋나지 않게)
  const row = found ? { ...found } : null;
  if (!row) return { ok: false, status: 404, error: "신청을 찾을 수 없습니다." };
  if (row.privacyStatus === "completed" && row.name === DELETED_NAME) {
    return { ok: false, status: 409, error: "삭제 처리된 신청은 수정할 수 없습니다." };
  }

  const patch: StaffLeadPatch = {};
  const changes: string[] = [];

  if (raw.claimStatus !== undefined) {
    if (!(CLAIM_STATUSES as readonly string[]).includes(raw.claimStatus as string)) {
      return { ok: false, status: 400, error: "잘못된 보험금 점검 상태입니다." };
    }
    patch.claimStatus = raw.claimStatus as ClaimStatus;
    if (patch.claimStatus !== row.claimStatus) changes.push(`점검상태 ${row.claimStatus}→${patch.claimStatus}`);
  }

  if (raw.coverageStatus !== undefined && raw.coverageStatus !== row.coverageStatus) {
    // 핵심 규칙: 별도 동의 없는 고객은 영업 상태로 옮길 수 없다.
    if (!isSalesEligible(row)) {
      return { ok: false, status: 409, error: "보장 분석 별도 동의가 없거나 철회된 고객은 영업 상태를 변경할 수 없습니다." };
    }
    if (!(COVERAGE_ACTIVE_STATUSES as string[]).includes(raw.coverageStatus as string)) {
      return { ok: false, status: 400, error: "잘못된 보장 분석 상태입니다." };
    }
    if (raw.coverageStatus === "contracted" && session.role !== "admin") {
      return { ok: false, status: 403, error: "계약 단계는 관리자만 입력할 수 있습니다." };
    }
    patch.coverageStatus = raw.coverageStatus as CoverageStatus;
    changes.push(`보장분석 ${row.coverageStatus}→${patch.coverageStatus}`);
  }

  if (raw.nextContactAt !== undefined) {
    if (raw.nextContactAt === null || raw.nextContactAt === "") patch.nextContactAt = null;
    else {
      const d = new Date(String(raw.nextContactAt));
      if (Number.isNaN(d.getTime())) return { ok: false, status: 400, error: "다음 연락 일정 형식이 잘못되었습니다." };
      patch.nextContactAt = d.toISOString();
    }
    if (patch.nextContactAt !== row.nextContactAt) changes.push("다음 연락 일정 변경");
  }
  if (raw.visitAt !== undefined) {
    if (raw.visitAt === null || raw.visitAt === "") patch.visitAt = null;
    else {
      const d = new Date(String(raw.visitAt));
      if (Number.isNaN(d.getTime())) return { ok: false, status: 400, error: "방문 일시 형식이 잘못되었습니다." };
      patch.visitAt = d.toISOString();
    }
    if (patch.visitAt !== row.visitAt) changes.push(patch.visitAt ? `방문 예약 ${formatVisitAt(patch.visitAt)}` : "방문 예약 취소");
  }
  if (raw.visitPlace !== undefined) {
    const v = validateVisitPlace(raw.visitPlace);
    if (!v.ok) return { ok: false, status: 400, error: v.error };
    patch.visitPlace = v.value;
    if (patch.visitPlace !== row.visitPlace) changes.push("방문 장소 변경");
  }
  // 방문 일정을 처음 잡으면 진행 상태를 '방문 예약'으로 옮긴다(상태를 직접 함께 바꾼 경우는 그 값을 따른다)
  const visitNewlyBooked = !!patch.visitAt && !row.visitAt;
  if (visitNewlyBooked && patch.claimStatus === undefined && (row.claimStatus === "new" || row.claimStatus === "contacting")) {
    patch.claimStatus = "visit_booked";
    changes.push(`점검상태 ${row.claimStatus}→visit_booked`);
  }

  if (raw.assignee !== undefined) {
    const a = typeof raw.assignee === "string" ? raw.assignee.trim().slice(0, 30) : "";
    patch.assignee = a || null;
    if (patch.assignee !== row.assignee) changes.push(`담당자 ${patch.assignee ?? "없음"}`);
  }
  if (raw.isTest !== undefined && raw.isTest !== row.isTest) {
    if (session.role !== "admin") return { ok: false, status: 403, error: "테스트 신청 표시는 관리자만 변경할 수 있습니다." };
    patch.isTest = raw.isTest === true;
    changes.push(patch.isTest ? "테스트 신청으로 표시(운영 지표 제외)" : "테스트 표시 해제");
  }
  if (raw.notes !== undefined) {
    if (typeof raw.notes !== "string" || raw.notes.length > 2000) {
      return { ok: false, status: 400, error: "처리 메모는 2,000자 이내여야 합니다." };
    }
    patch.notes = raw.notes;
    if (patch.notes !== row.notes) changes.push("처리 메모 수정");
  }

  const updated = await r.updateLead(id, patch);
  if (!updated) return { ok: false, status: 404, error: "신청을 찾을 수 없습니다." };

  if (patch.visitAt !== undefined && patch.visitAt !== row.visitAt) {
    const place = patch.visitPlace !== undefined ? patch.visitPlace : row.visitPlace;
    await r.addActivity({
      id: randomUUID(),
      leadId: id,
      at: new Date().toISOString(),
      actor: session.name,
      kind: "visit",
      content: patch.visitAt ? `방문 예약: ${formatVisitAt(patch.visitAt)}${place ? ` · ${place}` : ""}` : "방문 예약 취소",
    });
  }
  if (patch.coverageStatus === "booked" && row.coverageStatus !== "booked") {
    await r.addEvent({
      name: "consultation_booked",
      at: new Date().toISOString(),
      sessionId: `lead:${row.id}`,
      utmSource: row.attribution.utmSource,
      utmMedium: row.attribution.utmMedium,
      utmCampaign: row.attribution.utmCampaign,
      serviceType: row.serviceType,
    });
  }
  if (changes.length) {
    await r.addAudit({
      actor: session.name,
      role: session.role,
      action: "lead.update",
      target: id,
      detail: `${row.refNo}: ${changes.join(", ")}`,
    });
  }
  return { ok: true, lead: toLead(updated) };
}

/* ───────────── 개인정보 요청(철회·삭제) ───────────── */

export { DELETED_NAME };

/**
 * 공개 요청 접수. 존재 여부를 노출하지 않도록 응답은 항상 동일하다.
 * - 마케팅·보장 분석 동의 철회: 즉시 반영(연락 대상에서 제외) 후 완료 처리
 * - 삭제 요청: 즉시 영업·마케팅 대상에서 제외하고, 관리자가 본인 확인 후 완료하면 파기(익명화)
 */
export async function createPrivacyRequest(input: { type: PrivacyRequestType; name: string; phone: string }) {
  const r = repo();
  const phoneHash = hashPhone(input.phone);
  const matched = (await r.findLeadsByPhoneHash(phoneHash)).filter((l) => l.name === input.name);
  const now = new Date().toISOString();
  const immediate = input.type !== "delete_all";

  for (const l of matched) {
    // 광고 수신 동의를 철회하면 철회 시각을 남긴다(동의 시각·버전은 이력으로 보존)
    const marketingOff = l.marketingConsent ? { marketingConsent: false, marketingWithdrawnAt: now } : { marketingConsent: false };
    if (input.type === "withdraw_marketing") {
      await r.updateLead(l.id, marketingOff);
    } else {
      const coveragePatch = l.coverageConsent ? { coverageConsent: false, coverageStatus: "withdrawn" as const } : {};
      await r.updateLead(l.id, {
        ...coveragePatch,
        ...(input.type === "delete_all" ? { ...marketingOff, privacyStatus: "delete_requested" as const } : {}),
        ...(input.type === "withdraw_coverage" ? { privacyStatus: "completed" as const } : {}),
      });
    }
  }

  const id = randomUUID();
  await r.insertPrivacyRequest({
    id,
    createdAt: now,
    type: input.type,
    name: input.name,
    phoneMasked: maskPhone(input.phone),
    phoneHash,
    matchedLeadIds: matched.map((l) => l.id),
    status: immediate ? "completed" : "received",
    handledBy: immediate ? "system" : null,
    handledAt: immediate ? now : null,
    note: immediate ? `접수 즉시 반영 (일치 ${matched.length}건)` : `일치 ${matched.length}건 — 본인 확인 후 파기 필요`,
  });
  await r.addAudit({
    actor: "public",
    role: "public",
    action: `privacy.${input.type}`,
    target: id,
    detail: `요청 접수, 일치 신청 ${matched.length}건`,
  });
}

export async function updatePrivacyRequestByStaff(
  session: StaffSession,
  id: string,
  status: PrivacyRequestStatus,
  note: string,
) {
  const r = repo();
  const req = await r.getPrivacyRequest(id);
  if (!req) return null;
  const now = new Date().toISOString();

  if (req.type === "delete_all" && status === "completed") {
    // 파기: 식별 정보 제거. 통계용 비식별 필드(유형·상태·UTM)만 남긴다.
    for (const leadId of req.matchedLeadIds) await r.updateLead(leadId, LEAD_SCRUB);
    await r.deleteActivities(req.matchedLeadIds);
  } else if (req.type === "delete_all" && status === "processing") {
    for (const leadId of req.matchedLeadIds) await r.updateLead(leadId, { privacyStatus: "processing" });
  }

  const patch: Parameters<typeof r.updatePrivacyRequest>[1] = {
    status,
    note: note.slice(0, 500),
    handledBy: session.name,
    handledAt: now,
  };
  if (req.type === "delete_all" && status === "completed") {
    Object.assign(patch, PRIVACY_REQUEST_SCRUB);
  }
  const updated = await r.updatePrivacyRequest(id, patch);
  await r.addAudit({
    actor: session.name,
    role: session.role,
    action: "privacy.update",
    target: id,
    detail: `${req.type} → ${status}`,
  });
  return updated;
}

/** 상담 신청 정보 보유기간: 신청일로부터 1년 (개인정보 처리방침 '개인정보의 파기'와 같은 값) */
export const LEAD_RETENTION_YEARS = 1;

/** 이 시각 이전에 들어온 신청은 보유기간이 지났다 */
export function retentionCutoff(now: Date = new Date()): string {
  const d = new Date(now);
  d.setUTCFullYear(d.getUTCFullYear() - LEAD_RETENTION_YEARS);
  return d.toISOString();
}

/**
 * 보유기간이 지난 신청·개인정보 요청을 파기(익명화)한다. 매일 Vercel Cron(app/api/cron/purge-expired)이 부른다.
 * 삭제 요청 완료와 같은 방식으로 이름·연락처·메모·동의를 지우고 통계용 비식별 항목만 남긴다.
 * 지운 건이 없어도 실행 기록을 남겨, 파기 작업이 실제로 돌고 있는지 감사 로그로 확인할 수 있게 한다.
 */
export async function purgeExpiredPersonalData(now: Date = new Date()) {
  const r = repo();
  const before = retentionCutoff(now);
  const result = await r.purgeBefore(before);
  await r.addAudit({
    actor: "system",
    role: "system",
    action: "privacy.purge_expired",
    target: null,
    detail: `보유기간(${LEAD_RETENTION_YEARS}년) 경과 파기 — 기준 ${before.slice(0, 10)} 이전, 신청 ${result.leads}건, 개인정보 요청 ${result.privacyRequests}건`,
  });
  return { before, ...result };
}

/* ───────────── 상담 이력 ───────────── */

export const ACTIVITY_MAX = 1000;

export async function listActivitiesForStaff(id: string): Promise<LeadActivity[]> {
  return repo().listActivities(id);
}

export async function addActivityByStaff(
  session: StaffSession,
  id: string,
  raw: Record<string, unknown>,
): Promise<{ ok: true; activity: LeadActivity } | { ok: false; status: number; error: string }> {
  const r = repo();
  const row = await r.getLead(id);
  if (!row) return { ok: false, status: 404, error: "신청을 찾을 수 없습니다." };
  if (row.name === DELETED_NAME) return { ok: false, status: 409, error: "삭제 처리된 신청에는 기록할 수 없습니다." };
  // 문자 기록은 실제 발송 기능(방문 안내 문자)만 남긴다 — 직원이 손으로 '문자' 이력을 만들지 않게
  const kinds: ActivityKind[] = ACTIVITY_KINDS.filter((k) => k !== "sms");
  if (!(kinds as string[]).includes(raw.kind as string)) return { ok: false, status: 400, error: "기록 종류를 선택해 주세요." };
  const content = typeof raw.content === "string" ? raw.content.trim() : "";
  if (!content) return { ok: false, status: 400, error: "상담 내용을 입력해 주세요." };
  if (content.length > ACTIVITY_MAX) return { ok: false, status: 400, error: `상담 내용은 ${ACTIVITY_MAX.toLocaleString()}자 이내로 입력해 주세요.` };
  if (/\d{6}\s*-?\s*[1-8]\d{6}/.test(content)) return { ok: false, status: 400, error: "주민등록번호는 기록하지 말아 주세요." };
  const activity: LeadActivity = {
    id: randomUUID(),
    leadId: id,
    at: new Date().toISOString(),
    actor: session.name,
    kind: raw.kind as ActivityKind,
    content,
  };
  await r.addActivity(activity);
  await r.addAudit({ actor: session.name, role: session.role, action: "lead.activity", target: id, detail: `${row.refNo} 상담 이력 추가 (${ACTIVITY_KIND_LABEL[activity.kind]})` });
  return { ok: true, activity };
}

export async function recordStaffAudit(actor: { name: string; role: StaffRole }, action: string, detail: string, target: string | null = null) {
  await repo().addAudit({ actor: actor.name, role: actor.role, action, target, detail });
}
