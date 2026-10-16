import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuditLog, FunnelEvent, Review } from "@/lib/types";
import { COMPLETED_CLAIM_STATUSES, DuplicateSubmissionError, type ReviewImage, type LeadFilter, type LeadRow, type LeadRowPatch, type PrivacyRequestRow, type Repository } from "./types";

/**
 * 운영 저장소. service role 키로 서버에서만 접근한다.
 * 모든 ic_* 테이블은 RLS가 켜져 있고 anon/authenticated 정책이 **없다** (supabase/schema.sql).
 * → 브라우저가 공개 키로 직접 읽을 수 있는 경로가 존재하지 않는다.
 */

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase is not configured");
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

type Row = Record<string, unknown>;

function fromLeadRow(r: Row): LeadRow {
  return {
    id: r.id as string,
    refNo: r.ref_no as string,
    createdAt: r.created_at as string,
    serviceType: r.service_type as LeadRow["serviceType"],
    name: r.name as string,
    phoneMasked: r.phone_masked as string,
    phoneEnc: (r.phone_enc as string) ?? "",
    phoneHash: (r.phone_hash as string) ?? "",
    idempotencyKey: (r.idempotency_key as string) ?? null,
    preferredTime: r.preferred_time as LeadRow["preferredTime"],
    memo: (r.memo as string) ?? "",
    attribution: {
      utmSource: (r.utm_source as string) ?? null,
      utmMedium: (r.utm_medium as string) ?? null,
      utmCampaign: (r.utm_campaign as string) ?? null,
      utmContent: (r.utm_content as string) ?? null,
      utmTerm: (r.utm_term as string) ?? null,
      referrer: (r.referrer as string) ?? null,
      landingPath: (r.landing_path as string) ?? null,
    },
    claimStatus: r.claim_status as LeadRow["claimStatus"],
    marketingConsent: !!r.marketing_consent,
    thirdPartyConsent: !!r.third_party_consent,
    privacyConsentVersion: r.privacy_consent_version as string,
    privacyConsentAt: (r.privacy_consent_at as string) ?? null,
    marketingConsentAt: (r.marketing_consent_at as string) ?? null,
    marketingConsentVersion: (r.marketing_consent_version as string) ?? null,
    marketingWithdrawnAt: (r.marketing_withdrawn_at as string) ?? null,
    thirdPartyConsentAt: (r.third_party_consent_at as string) ?? null,
    thirdPartyConsentVersion: (r.third_party_consent_version as string) ?? null,
    coverageConsent: !!r.coverage_consent,
    coverageConsentAt: (r.coverage_consent_at as string) ?? null,
    coverageConsentVersion: (r.coverage_consent_version as string) ?? null,
    coverageContactMethod: (r.coverage_contact_method as LeadRow["coverageContactMethod"]) ?? null,
    coverageStatus: r.coverage_status as LeadRow["coverageStatus"],
    nextContactAt: (r.next_contact_at as string) ?? null,
    assignee: (r.assignee as string) ?? null,
    notes: (r.notes as string) ?? "",
    privacyStatus: r.privacy_status as LeadRow["privacyStatus"],
    duplicateOf: (r.duplicate_of as string) ?? null,
    isTest: !!r.is_test,
    isDemo: false,
  };
}

const LEAD_COLUMNS: Record<string, string> = {
  serviceType: "service_type",
  name: "name",
  phoneMasked: "phone_masked",
  phoneEnc: "phone_enc",
  phoneHash: "phone_hash",
  preferredTime: "preferred_time",
  memo: "memo",
  claimStatus: "claim_status",
  marketingConsent: "marketing_consent",
  thirdPartyConsent: "third_party_consent",
  privacyConsentVersion: "privacy_consent_version",
  privacyConsentAt: "privacy_consent_at",
  marketingConsentAt: "marketing_consent_at",
  marketingConsentVersion: "marketing_consent_version",
  marketingWithdrawnAt: "marketing_withdrawn_at",
  thirdPartyConsentAt: "third_party_consent_at",
  thirdPartyConsentVersion: "third_party_consent_version",
  coverageConsent: "coverage_consent",
  coverageConsentAt: "coverage_consent_at",
  coverageConsentVersion: "coverage_consent_version",
  coverageContactMethod: "coverage_contact_method",
  coverageStatus: "coverage_status",
  nextContactAt: "next_contact_at",
  assignee: "assignee",
  notes: "notes",
  privacyStatus: "privacy_status",
  duplicateOf: "duplicate_of",
  isTest: "is_test",
};

function toLeadColumns(patch: LeadRowPatch): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k === "attribution" && v) {
      const a = v as LeadRow["attribution"];
      Object.assign(out, {
        utm_source: a.utmSource,
        utm_medium: a.utmMedium,
        utm_campaign: a.utmCampaign,
        utm_content: a.utmContent,
        utm_term: a.utmTerm,
        referrer: a.referrer,
        landing_path: a.landingPath,
      });
    } else if (LEAD_COLUMNS[k]) {
      out[LEAD_COLUMNS[k]] = v;
    }
  }
  return out;
}

function fromPrivacyRow(r: Row): PrivacyRequestRow {
  return {
    id: r.id as string,
    createdAt: r.created_at as string,
    type: r.type as PrivacyRequestRow["type"],
    name: r.name as string,
    phoneMasked: r.phone_masked as string,
    phoneHash: r.phone_hash as string,
    matchedLeadIds: (r.matched_lead_ids as string[]) ?? [],
    status: r.status as PrivacyRequestRow["status"],
    handledBy: (r.handled_by as string) ?? null,
    handledAt: (r.handled_at as string) ?? null,
    note: (r.note as string) ?? "",
  };
}

/** 목록 조회 시 이미지 본문(image_base64)은 읽지 않는다 */
const REVIEW_SELECT =
  "id, created_at, created_by, kind, display_name, category, content, has_image, pii_masked, payment_confirmed, payment_confirmed_by, payment_confirmed_at, verified_amount, use_consent, use_consent_at, status, reviewed_by, reviewed_at";

function fromReviewRow(r: Row): Review {
  return {
    id: r.id as string,
    createdAt: r.created_at as string,
    createdBy: r.created_by as string,
    kind: r.kind as Review["kind"],
    displayName: r.display_name as string,
    category: r.category as Review["category"],
    content: (r.content as string) ?? "",
    hasImage: !!r.has_image,
    piiMasked: !!r.pii_masked,
    paymentConfirmed: !!r.payment_confirmed,
    paymentConfirmedBy: (r.payment_confirmed_by as string) ?? null,
    paymentConfirmedAt: (r.payment_confirmed_at as string) ?? null,
    verifiedAmount: r.verified_amount == null ? null : Number(r.verified_amount),
    useConsent: !!r.use_consent,
    useConsentAt: (r.use_consent_at as string) ?? null,
    status: r.status as Review["status"],
    reviewedBy: (r.reviewed_by as string) ?? null,
    reviewedAt: (r.reviewed_at as string) ?? null,
    isDemo: false,
  };
}

const REVIEW_COLUMNS: Record<string, string> = {
  kind: "kind",
  displayName: "display_name",
  category: "category",
  content: "content",
  hasImage: "has_image",
  piiMasked: "pii_masked",
  paymentConfirmed: "payment_confirmed",
  paymentConfirmedBy: "payment_confirmed_by",
  paymentConfirmedAt: "payment_confirmed_at",
  verifiedAmount: "verified_amount",
  useConsent: "use_consent",
  useConsentAt: "use_consent_at",
  status: "status",
  reviewedBy: "reviewed_by",
  reviewedAt: "reviewed_at",
};

function toReviewColumns(patch: Partial<Review>): Row {
  const cols: Row = {};
  for (const [k, v] of Object.entries(patch)) if (REVIEW_COLUMNS[k]) cols[REVIEW_COLUMNS[k]] = v;
  return cols;
}

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`supabase: ${res.error.message}`);
  return res.data;
}

/** PostgREST or() 필터에 들어갈 검색어에서 구문 문자를 제거. */
function escapeSearch(q: string): string {
  return q.replace(/[,()*%\\]/g, "").slice(0, 40);
}

export const supabaseRepository: Repository = {
  kind: "supabase",
  async insertLead(row) {
    const res = await db()
      .from("ic_leads")
      .insert({ id: row.id, ref_no: row.refNo, created_at: row.createdAt, idempotency_key: row.idempotencyKey, ...toLeadColumns(row) });
    // 같은 제출 키의 재전송(더블클릭·네트워크 재시도)은 DB 고유 인덱스가 막는다
    if (res.error?.code === "23505" && /idempotency/.test(`${res.error.message} ${res.error.details ?? ""}`)) {
      throw new DuplicateSubmissionError();
    }
    must(res);
  },
  async findLeadByIdempotencyKey(key) {
    const data = must(await db().from("ic_leads").select("*").eq("idempotency_key", key).maybeSingle());
    return data ? fromLeadRow(data) : null;
  },
  async findRecentRefByPhoneHash(phoneHash, sinceIso) {
    const data = must(
      await db()
        .from("ic_leads")
        .select("ref_no")
        .eq("phone_hash", phoneHash)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: true })
        .limit(1),
    );
    return (data?.[0]?.ref_no as string) ?? null;
  },
  async getLead(id) {
    const data = must(await db().from("ic_leads").select("*").eq("id", id).maybeSingle());
    return data ? fromLeadRow(data) : null;
  },
  async listLeads(f: LeadFilter) {
    let q = db().from("ic_leads").select("*");
    if (f.serviceType) q = q.eq("service_type", f.serviceType);
    if (f.claimStatus) q = q.eq("claim_status", f.claimStatus);
    if (f.coverageStatus) q = q.eq("coverage_status", f.coverageStatus);
    if (f.privacyStatus) q = q.eq("privacy_status", f.privacyStatus);
    if (f.duplicatesOnly) q = q.not("duplicate_of", "is", null);
    if (f.salesOnly) {
      q = q
        .eq("coverage_consent", true)
        .not("coverage_status", "in", "(withdrawn,not_consented)")
        .not("privacy_status", "in", "(delete_requested,withdraw_requested)");
    }
    if (f.phoneHash) q = q.eq("phone_hash", f.phoneHash);
    else if (f.q) {
      const s = escapeSearch(f.q);
      if (s) q = q.or(`name.ilike.%${s}%,ref_no.ilike.%${s}%`);
    }
    const sort = f.sort ?? "newest";
    if (sort === "next_contact") q = q.order("next_contact_at", { ascending: true, nullsFirst: false });
    else q = q.order("created_at", { ascending: sort === "oldest" });
    const data = must(await q.limit(f.limit ?? 500));
    return (data ?? []).map(fromLeadRow);
  },
  async findLeadsByPhoneHash(phoneHash) {
    const data = must(await db().from("ic_leads").select("*").eq("phone_hash", phoneHash));
    return (data ?? []).map(fromLeadRow);
  },
  async updateLead(id, patch) {
    const data = must(
      await db()
        .from("ic_leads")
        .update({ ...toLeadColumns(patch), updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .maybeSingle(),
    );
    return data ? fromLeadRow(data) : null;
  },
  async addAudit(entry) {
    must(
      await db().from("ic_audit_logs").insert({
        actor: entry.actor,
        role: entry.role,
        action: entry.action,
        target: entry.target,
        detail: entry.detail,
      }),
    );
  },
  async listAudit({ target, limit = 200 }) {
    let q = db().from("ic_audit_logs").select("*").order("at", { ascending: false }).limit(limit);
    if (target) q = q.eq("target", target);
    const data = must(await q);
    return (data ?? []).map(
      (r: Row): AuditLog => ({
        id: String(r.id),
        at: r.at as string,
        actor: r.actor as string,
        role: r.role as AuditLog["role"],
        action: r.action as string,
        target: (r.target as string) ?? null,
        detail: (r.detail as string) ?? "",
      }),
    );
  },
  async addEvent(e) {
    must(
      await db().from("ic_events").insert({
        name: e.name,
        at: e.at,
        session_id: e.sessionId,
        utm_source: e.utmSource,
        utm_medium: e.utmMedium,
        utm_campaign: e.utmCampaign,
        service_type: e.serviceType,
      }),
    );
  },
  async listEvents(sinceIso) {
    const data = must(
      await db()
        .from("ic_events")
        .select("name, at, session_id, utm_source, utm_medium, utm_campaign, service_type")
        .gte("at", sinceIso)
        .order("at", { ascending: false })
        .limit(50_000),
    );
    return (data ?? []).map(
      (r: Row): FunnelEvent => ({
        name: r.name as FunnelEvent["name"],
        at: r.at as string,
        sessionId: r.session_id as string,
        utmSource: (r.utm_source as string) ?? null,
        utmMedium: (r.utm_medium as string) ?? null,
        utmCampaign: (r.utm_campaign as string) ?? null,
        serviceType: (r.service_type as FunnelEvent["serviceType"]) ?? null,
      }),
    );
  },
  async insertPrivacyRequest(row) {
    must(
      await db().from("ic_privacy_requests").insert({
        id: row.id,
        created_at: row.createdAt,
        type: row.type,
        name: row.name,
        phone_masked: row.phoneMasked,
        phone_hash: row.phoneHash,
        matched_lead_ids: row.matchedLeadIds,
        status: row.status,
        handled_by: row.handledBy,
        handled_at: row.handledAt,
        note: row.note,
      }),
    );
  },
  async listPrivacyRequests() {
    const data = must(
      await db().from("ic_privacy_requests").select("*").order("created_at", { ascending: false }).limit(500),
    );
    return (data ?? []).map(fromPrivacyRow);
  },
  async getPrivacyRequest(id) {
    const data = must(await db().from("ic_privacy_requests").select("*").eq("id", id).maybeSingle());
    return data ? fromPrivacyRow(data) : null;
  },
  async updatePrivacyRequest(id, patch) {
    const cols: Row = {};
    if (patch.status) cols.status = patch.status;
    if (patch.note !== undefined) cols.note = patch.note;
    if (patch.handledBy !== undefined) cols.handled_by = patch.handledBy;
    if (patch.handledAt !== undefined) cols.handled_at = patch.handledAt;
    if (patch.name !== undefined) cols.name = patch.name;
    if (patch.phoneMasked !== undefined) cols.phone_masked = patch.phoneMasked;
    if (patch.phoneHash !== undefined) cols.phone_hash = patch.phoneHash;
    const data = must(
      await db().from("ic_privacy_requests").update(cols).eq("id", id).select("*").maybeSingle(),
    );
    return data ? fromPrivacyRow(data) : null;
  },
  async insertReview(r) {
    must(await db().from("ic_reviews").insert({ id: r.id, created_at: r.createdAt, created_by: r.createdBy, ...toReviewColumns(r) }));
  },
  async listReviews() {
    const data = must(await db().from("ic_reviews").select(REVIEW_SELECT).order("created_at", { ascending: false }).limit(500));
    return (data ?? []).map(fromReviewRow);
  },
  async getReview(id) {
    const data = must(await db().from("ic_reviews").select(REVIEW_SELECT).eq("id", id).maybeSingle());
    return data ? fromReviewRow(data) : null;
  },
  async updateReview(id, patch) {
    const data = must(await db().from("ic_reviews").update(toReviewColumns(patch)).eq("id", id).select(REVIEW_SELECT).maybeSingle());
    return data ? fromReviewRow(data) : null;
  },
  async deleteReview(id) {
    must(await db().from("ic_reviews").delete().eq("id", id));
  },
  async setReviewImage(id, image: ReviewImage | null) {
    must(
      await db()
        .from("ic_reviews")
        .update({ image_mime: image?.mime ?? null, image_base64: image?.base64 ?? null, has_image: !!image })
        .eq("id", id),
    );
  },
  async getReviewImage(id) {
    const data = must(await db().from("ic_reviews").select("image_mime, image_base64").eq("id", id).maybeSingle()) as Row | null;
    return data?.image_base64 ? { mime: data.image_mime as string, base64: data.image_base64 as string } : null;
  },
  async countRealLeads() {
    // 데모·테스트·중복 신청 제외 (운영 DB에는 데모 데이터가 없다)
    const base = () =>
      db().from("ic_leads").select("id", { count: "exact", head: true }).eq("is_test", false).is("duplicate_of", null);
    const all = await base();
    const done = await base().in("claim_status", COMPLETED_CLAIM_STATUSES);
    if (all.error || done.error) throw new Error((all.error ?? done.error)!.message);
    return { applications: all.count ?? 0, completedConsultations: done.count ?? 0 };
  },
};

/** 운영 모드 관리자 로그인: Supabase Auth로 비밀번호 확인 → ic_staff에서 역할 조회. */
export async function verifyStaffCredentials(
  email: string,
  password: string,
): Promise<{ id: string; name: string; role: "admin" | "counselor" | "viewer" } | null> {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;
  // Supabase 토큰은 쓰지 않는다(자체 HttpOnly 세션 발급). 즉시 폐기.
  await auth.auth.signOut().catch(() => undefined);
  const staff = must(
    await db().from("ic_staff").select("name, role, active").eq("user_id", data.user.id).maybeSingle(),
  );
  if (!staff || !staff.active) return null;
  return { id: data.user.id, name: staff.name as string, role: staff.role as "admin" | "counselor" | "viewer" };
}
