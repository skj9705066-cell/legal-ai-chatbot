import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { COVERAGE_CONSENT_VERSION, MARKETING_CONSENT_VERSION, PRIVACY_CONSENT_VERSION, THIRD_PARTY_CONSENT_VERSION, getAppMode } from "@/lib/config";
import {
  COVERAGE_ACTIVE_STATUSES,
  CONTACT_METHOD_LABEL,
  CLAIM_STATUSES,
  PREFERRED_TIME_LABEL,
  type Attribution,
  type ClaimStatus,
  type ContactMethod,
  type CoverageStatus,
  type Lead,
  type PreferredTime,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
  type StaffRole,
} from "@/lib/types";
import { maskPhone, normalizePhone, type LeadInput } from "@/lib/validation";
import type { StaffSession } from "@/lib/session";
import { decryptPii, encryptPii, hashPhone } from "./crypto";
import { repo, toLead, type LeadFilter, type LeadRow } from "./repo";
import { DuplicateSubmissionError } from "./repo/types";
import { isSalesEligible } from "./repo/filter";
import { notifyNewLead } from "./notify";

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
  await notifyNewLead(row.refNo);
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
  assignee?: string | null;
  notes?: string;
  isTest?: boolean;
}

export type PatchResult = { ok: true; lead: Lead } | { ok: false; status: number; error: string };

export async function updateLeadByStaff(session: StaffSession, id: string, raw: Record<string, unknown>): Promise<PatchResult> {
  const r = repo();
  const row = await r.getLead(id);
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

export const DELETED_NAME = "(삭제됨)";

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
    for (const leadId of req.matchedLeadIds) {
      await r.updateLead(leadId, {
        name: DELETED_NAME,
        phoneMasked: "***-****-****",
        phoneEnc: "",
        phoneHash: "",
        memo: "",
        notes: "",
        assignee: null,
        nextContactAt: null,
        marketingConsent: false,
        coverageConsent: false,
        coverageStatus: "withdrawn",
        privacyStatus: "completed",
      });
    }
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
    Object.assign(patch, { name: DELETED_NAME, phoneMasked: "***-****-****", phoneHash: "" });
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

export async function recordStaffAudit(actor: { name: string; role: StaffRole }, action: string, detail: string, target: string | null = null) {
  await repo().addAudit({ actor: actor.name, role: actor.role, action, target, detail });
}
