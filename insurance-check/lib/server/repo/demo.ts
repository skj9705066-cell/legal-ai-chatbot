import "server-only";
import { randomUUID } from "node:crypto";
import {
  CLAIM_STATUSES,
  COVERAGE_ACTIVE_STATUSES,
  PREFERRED_TIMES,
  SERVICE_TYPES,
  type AuditLog,
  type FunnelEvent,
  type Review,
  type FunnelEventName,
} from "@/lib/types";
import { encryptPii, hashPhone } from "../crypto";
import { maskPhone } from "@/lib/validation";
import { COMPLETED_CLAIM_STATUSES, isRealLead, type LeadFilter, type LeadRow, type LeadRowPatch, type PrivacyRequestRow, type Repository } from "./types";
import { applyLeadFilter } from "./filter";

/**
 * 데모 저장소: 서버 프로세스 메모리에만 존재하고 재시작하면 초기화된다.
 * 시드 데이터는 전부 가짜(데모고객NN / 010-0000-NNNN)이며 isDemo=true로 표시된다.
 */

interface DemoState {
  leads: LeadRow[];
  audit: AuditLog[];
  events: FunnelEvent[];
  privacy: PrivacyRequestRow[];
  /** 후기는 시드하지 않는다 — 가짜 후기를 자동 생성하지 않음 */
  reviews: Review[];
}

const g = globalThis as unknown as { __icDemo?: DemoState };

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CAMPAIGNS = [
  { utmSource: "naver", utmMedium: "search", utmCampaign: "claim_check_brand", weight: 0.3, visits: 420 },
  { utmSource: "meta", utmMedium: "paid_social", utmCampaign: "hidden_money_q4", weight: 0.25, visits: 610 },
  { utmSource: "google", utmMedium: "cpc", utmCampaign: "claim_check_generic", weight: 0.2, visits: 350 },
  { utmSource: "kakao", utmMedium: "display", utmCampaign: "refund_guide", weight: 0.15, visits: 280 },
  { utmSource: null, utmMedium: null, utmCampaign: null, weight: 0.1, visits: 140 },
];

function seed(): DemoState {
  const rand = mulberry32(20261015);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const now = Date.now();
  const day = 86_400_000;
  const leads: LeadRow[] = [];
  const events: FunnelEvent[] = [];

  const pickCampaign = () => {
    let r = rand();
    for (const c of CAMPAIGNS) {
      if ((r -= c.weight) <= 0) return c;
    }
    return CAMPAIGNS[0];
  };
  const ev = (name: FunnelEventName, at: number, sessionId: string, c: (typeof CAMPAIGNS)[number], st: LeadRow["serviceType"] | null = null) =>
    events.push({
      name,
      at: new Date(at).toISOString(),
      sessionId,
      utmSource: c.utmSource,
      utmMedium: c.utmMedium,
      utmCampaign: c.utmCampaign,
      serviceType: st,
    });

  // 신청까지 가지 않은 방문 세션
  for (const c of CAMPAIGNS) {
    for (let i = 0; i < c.visits; i++) {
      const sid = `demo-v-${c.utmSource ?? "direct"}-${i}`;
      const at = now - Math.floor(rand() * 21 * day);
      ev("page_view", at, sid, c);
      if (rand() < 0.42) ev("service_type_select", at + 20_000, sid, c, pick(SERVICE_TYPES));
      if (rand() < 0.2) ev("form_start", at + 40_000, sid, c);
      if (rand() < 0.12) ev("official_lookup_click", at + 30_000, sid, c);
    }
  }

  for (let i = 1; i <= 32; i++) {
    const c = pickCampaign();
    const createdAt = now - Math.floor(rand() * 21 * day);
    const serviceType = pick(SERVICE_TYPES);
    const phone = `0100000${String(1000 + (i % 27)).padStart(4, "0")}`; // i%27 → 일부러 중복 연락처 생성
    const coverageConsent = rand() < 0.42;
    const coverageStatus = coverageConsent ? pick(COVERAGE_ACTIVE_STATUSES) : "not_consented";
    const sid = `demo-l-${i}`;
    ev("page_view", createdAt - 180_000, sid, c);
    ev("service_type_select", createdAt - 150_000, sid, c, serviceType);
    ev("form_start", createdAt - 120_000, sid, c, serviceType);
    ev("form_submit_success", createdAt, sid, c, serviceType);
    ev("coverage_offer_view", createdAt + 2_000, sid, c, serviceType);
    ev(coverageConsent ? "coverage_opt_in" : "coverage_decline", createdAt + 20_000, sid, c, serviceType);
    if (["booked", "consulted", "contracted"].includes(coverageStatus)) {
      ev("consultation_booked", createdAt + day, sid, c, serviceType);
    }
    leads.push({
      id: randomUUID(),
      refNo: `IC-DEMO-${String(i).padStart(4, "0")}`,
      createdAt: new Date(createdAt).toISOString(),
      serviceType,
      name: `데모고객${String(i).padStart(2, "0")}`,
      phoneMasked: maskPhone(phone),
      phoneEnc: encryptPii(phone),
      phoneHash: hashPhone(phone),
      preferredTime: pick(PREFERRED_TIMES),
      memo: rand() < 0.4 ? "데모 메모: 작년 통원 치료 영수증 보관 중" : "",
      attribution: {
        utmSource: c.utmSource,
        utmMedium: c.utmMedium,
        utmCampaign: c.utmCampaign,
        utmContent: null,
        utmTerm: null,
        referrer: c.utmSource ? `https://${c.utmSource}.example` : null,
        landingPath: "/",
      },
      claimStatus: pick(CLAIM_STATUSES),
      marketingConsent: rand() < 0.3,
      privacyConsentVersion: "claim-2026-10-15.v1",
      coverageConsent,
      coverageConsentAt: coverageConsent ? new Date(createdAt + 20_000).toISOString() : null,
      coverageConsentVersion: coverageConsent ? "coverage-2026-10-15.v1" : null,
      coverageContactMethod: coverageConsent ? "phone" : null,
      coverageStatus,
      nextContactAt: rand() < 0.5 ? new Date(now + Math.floor(rand() * 7) * day).toISOString() : null,
      assignee: rand() < 0.6 ? pick(["상담사A(데모)", "상담사B(데모)"]) : null,
      notes: "",
      privacyStatus: "none",
      duplicateOf: null,
      isTest: false,
      isDemo: true,
    });
  }

  // 중복 신청 표시 (같은 연락처, 30일 이내 → 먼저 들어온 신청번호)
  leads.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const firstByHash = new Map<string, string>();
  for (const l of leads) {
    const first = firstByHash.get(l.phoneHash);
    if (first) l.duplicateOf = first;
    else firstByHash.set(l.phoneHash, l.refNo);
  }

  const withdrawn = leads.find((l) => l.coverageConsent);
  const privacy: PrivacyRequestRow[] = [];
  if (withdrawn) {
    withdrawn.coverageConsent = false;
    withdrawn.coverageStatus = "withdrawn";
    withdrawn.privacyStatus = "completed";
    privacy.push({
      id: randomUUID(),
      createdAt: new Date(now - 2 * day).toISOString(),
      type: "withdraw_coverage",
      name: withdrawn.name,
      phoneMasked: withdrawn.phoneMasked,
      phoneHash: withdrawn.phoneHash,
      matchedLeadIds: [withdrawn.id],
      status: "completed",
      handledBy: "system",
      handledAt: new Date(now - 2 * day).toISOString(),
      note: "동의 철회 즉시 반영 (데모)",
    });
  }

  return {
    leads,
    events,
    privacy,
    reviews: [],
    audit: [
      {
        id: randomUUID(),
        at: new Date(now - day).toISOString(),
        actor: "system",
        role: "system",
        action: "demo.seed",
        target: null,
        detail: "데모 데이터 생성 (가짜 고객 데이터)",
      },
    ],
  };
}

function state(): DemoState {
  const s = (g.__icDemo ??= seed());
  s.reviews ??= [];
  return s;
}

export const demoRepository: Repository = {
  kind: "demo",
  async insertLead(row) {
    state().leads.push(row);
  },
  async findRecentRefByPhoneHash(phoneHash, sinceIso) {
    const hits = state()
      .leads.filter((l) => l.phoneHash === phoneHash && l.createdAt >= sinceIso)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return hits[0]?.refNo ?? null;
  },
  async getLead(id) {
    return state().leads.find((l) => l.id === id) ?? null;
  },
  async listLeads(filter: LeadFilter) {
    return applyLeadFilter(state().leads, filter);
  },
  async findLeadsByPhoneHash(phoneHash) {
    return state().leads.filter((l) => l.phoneHash === phoneHash);
  },
  async updateLead(id, patch: LeadRowPatch) {
    const lead = state().leads.find((l) => l.id === id);
    if (!lead) return null;
    Object.assign(lead, patch);
    return lead;
  },
  async addAudit(entry) {
    state().audit.unshift({ ...entry, id: randomUUID(), at: new Date().toISOString() });
    if (state().audit.length > 2000) state().audit.length = 2000;
  },
  async listAudit({ target, limit = 200 }) {
    return state()
      .audit.filter((a) => !target || a.target === target)
      .slice(0, limit);
  },
  async addEvent(e) {
    state().events.push(e);
    if (state().events.length > 50_000) state().events.splice(0, 10_000);
  },
  async listEvents(sinceIso) {
    return state().events.filter((e) => e.at >= sinceIso);
  },
  async insertPrivacyRequest(row) {
    state().privacy.unshift(row);
  },
  async listPrivacyRequests() {
    return [...state().privacy];
  },
  async getPrivacyRequest(id) {
    return state().privacy.find((p) => p.id === id) ?? null;
  },
  async updatePrivacyRequest(id, patch) {
    const p = state().privacy.find((x) => x.id === id);
    if (!p) return null;
    Object.assign(p, patch);
    return p;
  },
  async insertReview(r) {
    state().reviews.unshift(r);
  },
  async listReviews() {
    return [...state().reviews];
  },
  async getReview(id) {
    return state().reviews.find((r) => r.id === id) ?? null;
  },
  async updateReview(id, patch) {
    const r = state().reviews.find((x) => x.id === id);
    if (!r) return null;
    Object.assign(r, patch);
    return r;
  },
  async countRealLeads() {
    // 데모 시드는 전부 isDemo=true라 항상 0이 된다(의도된 동작)
    const real = state().leads.filter(isRealLead);
    return {
      applications: real.length,
      completedConsultations: real.filter((l) => COMPLETED_CLAIM_STATUSES.includes(l.claimStatus)).length,
    };
  },
};
