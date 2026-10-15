import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuditLog, FunnelEvent } from "@/lib/types";
import type { LeadFilter, LeadRow, LeadRowPatch, PrivacyRequestRow, Repository } from "./types";

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
    privacyConsentVersion: r.privacy_consent_version as string,
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
  privacyConsentVersion: "privacy_consent_version",
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
    must(
      await db()
        .from("ic_leads")
        .insert({ id: row.id, ref_no: row.refNo, created_at: row.createdAt, ...toLeadColumns(row) }),
    );
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
