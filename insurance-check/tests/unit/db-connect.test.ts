import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { classifySupabaseKey } from "@/lib/supabase-keys";
import { describeLeadQuery, parseLeadQuery } from "@/lib/lead-query";
import { validateLeadInput } from "@/lib/validation";
import { getAppMode, getReadiness, usesDatabase } from "@/lib/config";
import { createPrivacyRequest, normalizeIdempotencyKey, submitLead } from "@/lib/server/service";
import { repo } from "@/lib/server/repo";

const jwt = (payload: object) => ["e30", Buffer.from(JSON.stringify(payload)).toString("base64url"), "sig"].join(".");
const ATTR = { utmSource: "unit", utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null, referrer: null, landingPath: "/" };
const input = (phone: string, extra: Record<string, unknown> = {}) => {
  const v = validateLeadInput({ serviceType: "unclaimed", name: "단위시험", phone, privacyConsent: true, ...extra });
  if (!v.ok) throw new Error("invalid test input");
  return v.value;
};

beforeAll(() => {
  process.env.APP_MODE = "demo";
});
afterEach(() => {
  process.env.APP_MODE = "demo";
  delete process.env.VERCEL_ENV;
  delete process.env.PREVIEW_TEST_SUBMISSIONS;
});

describe("supabase key kinds (값은 보지 않고 종류만 판별)", () => {
  it("new-format keys", () => {
    expect(classifySupabaseKey("sb_secret_abc")).toBe("secret");
    expect(classifySupabaseKey("sb_publishable_abc")).toBe("publishable");
  });
  it("legacy JWT keys by role", () => {
    expect(classifySupabaseKey(jwt({ role: "service_role" }))).toBe("secret");
    expect(classifySupabaseKey(jwt({ role: "anon" }))).toBe("publishable");
    expect(classifySupabaseKey(jwt({ role: "authenticated" }))).toBe("unknown");
  });
  it("empty / garbage", () => {
    expect(classifySupabaseKey("")).toBe("unknown");
    expect(classifySupabaseKey(undefined)).toBe("unknown");
    expect(classifySupabaseKey("a.b.c")).toBe("unknown");
  });
});

describe("app modes", () => {
  it("unknown values fall back to demo; staging uses the database", () => {
    process.env.APP_MODE = "prod";
    expect(getAppMode()).toBe("demo");
    process.env.APP_MODE = "staging";
    expect(getAppMode()).toBe("staging");
    expect(usesDatabase()).toBe(true);
    process.env.APP_MODE = "demo";
    expect(usesDatabase()).toBe(false);
  });
  it("staging requires infra + DB verification date, not operator/ad approvals", () => {
    process.env.APP_MODE = "staging";
    const r = getReadiness();
    expect(r.mode).toBe("staging");
    expect(r.ready).toBe(false); // 이 테스트 환경엔 인프라 값이 없다
    expect(r.items.some((i) => i.key === "APPROVAL_DB_VERIFIED")).toBe(true);
  });
});

describe("Preview-only test submissions (PREVIEW_TEST_SUBMISSIONS)", () => {
  it("turns on test mode only on Vercel Preview deployments", () => {
    process.env.APP_MODE = "production";
    process.env.PREVIEW_TEST_SUBMISSIONS = "1";
    process.env.VERCEL_ENV = "preview";
    expect(getAppMode()).toBe("staging");
  });
  it("is ignored on Vercel Production — the production gate stays", () => {
    process.env.PREVIEW_TEST_SUBMISSIONS = "1";
    process.env.VERCEL_ENV = "production";
    process.env.APP_MODE = "production";
    expect(getAppMode()).toBe("production");
    process.env.APP_MODE = "demo";
    expect(getAppMode()).toBe("production"); // 실제 고객 주소에는 데모 화면을 내보내지 않는다
  });
  it("a Vercel Production deployment without APP_MODE is production (locked until ready), never demo", () => {
    delete process.env.APP_MODE;
    process.env.VERCEL_ENV = "production";
    expect(getAppMode()).toBe("production");
    expect(getReadiness().ready).toBe(false);
  });
  it("is ignored outside Vercel and when not exactly '1'", () => {
    process.env.APP_MODE = "production";
    process.env.PREVIEW_TEST_SUBMISSIONS = "1";
    expect(getAppMode()).toBe("production"); // VERCEL_ENV 없음(로컬)
    process.env.VERCEL_ENV = "preview";
    process.env.PREVIEW_TEST_SUBMISSIONS = "true";
    expect(getAppMode()).toBe("production");
  });
  it("APP_MODE=staging never opens test mode on a Vercel Production deployment", () => {
    process.env.APP_MODE = "staging";
    process.env.VERCEL_ENV = "production";
    expect(getAppMode()).toBe("production");
    expect(getReadiness().ready).toBe(false); // 운영 필수 항목이 없으니 잠김
  });
  it("lock diagnostics list missing variable names on Preview but never on Production", async () => {
    const { getPublicConfig } = await import("@/lib/config");
    process.env.APP_MODE = "production";
    process.env.VERCEL_ENV = "preview";
    const preview = getPublicConfig();
    expect(preview.submissionEnabled).toBe(false);
    expect(preview.lockedBy).toContain("SUPABASE_URL");
    process.env.VERCEL_ENV = "production";
    expect(getPublicConfig().lockedBy).toBeNull();
  });
});

describe("audit-safe export description", () => {
  it("never records the search text (may be a name or phone number)", () => {
    const d = describeLeadQuery(parseLeadQuery({ q: "01012345678", type: "hidden", claim: "new" }));
    expect(d).not.toContain("0101234");
    expect(d).toContain("검색어 있음");
    expect(d).toContain("유형=hidden");
    expect(describeLeadQuery(parseLeadQuery({ q: "홍길동" }))).not.toContain("홍길동");
    expect(describeLeadQuery(parseLeadQuery({}))).toBe("전체");
  });
});

describe("idempotency key", () => {
  it("accepts UUID-like keys only", () => {
    expect(normalizeIdempotencyKey("3f2b8c1e-1a2b-4c3d-9e8f-0123456789ab")).toBe("3f2b8c1e-1a2b-4c3d-9e8f-0123456789ab");
    expect(normalizeIdempotencyKey("short")).toBeNull();
    expect(normalizeIdempotencyKey("bad key with spaces")).toBeNull();
    expect(normalizeIdempotencyKey(123)).toBeNull();
  });
});

describe("lead save records consent and dedupes by key (demo store)", () => {
  it("records consent time/version per item and encrypts the phone", async () => {
    const { lead } = await submitLead(input("010-7000-0001", { marketingConsent: true }), ATTR, "unit-key-consent-0001");
    const row = (await repo().getLead(lead.id))!;
    expect(row.privacyConsentAt).toBe(row.createdAt);
    expect(row.privacyConsentVersion).toMatch(/^claim-/);
    expect(row.marketingConsent).toBe(true);
    expect(row.marketingConsentAt).toBe(row.createdAt);
    expect(row.marketingConsentVersion).toMatch(/^marketing-/);
    expect(row.thirdPartyConsentAt).toBeNull();
    expect(row.idempotencyKey).toBe("unit-key-consent-0001");
    expect(row.phoneEnc).not.toContain("70000001");
    expect(row.phoneMasked).toBe("010-****-0001");
    expect("idempotencyKey" in lead).toBe(false); // 화면용 Lead에는 내보내지 않는다
  });
  it("no optional consent → no time/version", async () => {
    const { lead } = await submitLead(input("010-7000-0002"), ATTR, null);
    expect(lead.marketingConsent).toBe(false);
    expect(lead.marketingConsentAt).toBeNull();
    expect(lead.marketingConsentVersion).toBeNull();
  });
  it("same key twice → one lead, same reference number", async () => {
    const key = "unit-key-replay-0003";
    const first = await submitLead(input("010-7000-0003"), ATTR, key);
    const second = await submitLead(input("010-7000-0003"), ATTR, key);
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.lead.refNo).toBe(first.lead.refNo);
    const all = await repo().listLeads({ q: first.lead.refNo });
    expect(all).toHaveLength(1);
  });
  it("marketing withdrawal records the withdrawal time and keeps the consent history", async () => {
    const { lead } = await submitLead(input("010-7000-0004", { marketingConsent: true }), ATTR, null);
    await createPrivacyRequest({ type: "withdraw_marketing", name: "단위시험", phone: "01070000004" });
    const row = (await repo().getLead(lead.id))!;
    expect(row.marketingConsent).toBe(false);
    expect(row.marketingWithdrawnAt).not.toBeNull();
    expect(row.marketingConsentAt).not.toBeNull();
  });
});

describe("supabase-js with new-format keys (네트워크 없이 요청 헤더만 확인)", () => {
  it("sends an sb_secret_ key in the apikey header to the REST API", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const seen: { url: string; apikey: string | null }[] = [];
    const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const h = new Headers(init?.headers);
      seen.push({ url: String(input), apikey: h.get("apikey") });
      return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    };
    const fakeKey = "sb_secret_unit_test_only_not_a_real_key";
    const client = createClient("https://example.supabase.co", fakeKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fakeFetch as typeof fetch },
    });
    const res = await client.from("ic_leads").select("id").limit(0);
    expect(res.error).toBeNull();
    expect(seen[0].url).toContain("/rest/v1/ic_leads");
    expect(seen[0].apikey).toBe(fakeKey);
  });
});

describe("test leads never mix into the sales list by default", () => {
  it("sales view excludes tests unless explicitly included", () => {
    expect(parseLeadQuery({ view: "sales" }).tests).toBe("exclude");
    expect(parseLeadQuery({ view: "sales", test: "include" }).tests).toBe("include");
    expect(parseLeadQuery({}).tests).toBeUndefined(); // 상담 DB 기본: 모두 표시(배지로 구분)
    expect(parseLeadQuery({ test: "bogus" }).tests).toBeUndefined();
  });
  it("demo store filter honours include / exclude / only", async () => {
    const { applyLeadFilter } = await import("@/lib/server/repo/filter");
    const rows = (await repo().listLeads({ limit: 1000 })).slice(0, 4).map((r, i) => ({ ...r, isTest: i % 2 === 0 }));
    expect(applyLeadFilter(rows, { tests: "exclude" }).every((r) => !r.isTest)).toBe(true);
    expect(applyLeadFilter(rows, { tests: "only" }).every((r) => r.isTest)).toBe(true);
    expect(applyLeadFilter(rows, { tests: "include" })).toHaveLength(rows.length);
  });
});

describe("customer-facing placeholders", () => {
  it("demo/test screens name the missing setting; production screens never show internal setup text", async () => {
    const { orSetting, settingLine, thirdPartyText, PENDING_TEXT } = await import("@/lib/display");
    expect(orSetting(null, "운영 주체", "demo")).toBe("[설정 필요: 운영 주체]");
    expect(orSetting(" ", "운영 주체", "staging")).toBe("[설정 필요: 운영 주체]");
    expect(orSetting(null, "운영 주체", "production")).toBe(PENDING_TEXT);
    expect(orSetting("홍길동", "운영 주체", "production")).toBe("홍길동");
    const line = (m: "demo" | "production") => settingLine(`${orSetting("A GA", "소속 GA", m)} · 등록번호 ${orSetting(null, "GA 등록번호", m)}`, m);
    expect(line("production")).toBe(PENDING_TEXT);
    expect(line("demo")).toBe("A GA · 등록번호 [설정 필요: GA 등록번호]");
    expect(thirdPartyText(null, "production")).toBe(PENDING_TEXT);
    expect(thirdPartyText("none", "production")).toBe("제3자에게 제공하지 않습니다.");
  });
  it("ad/analytics tags stay off while a production deployment is still locked", async () => {
    const { getPublicConfig } = await import("@/lib/config");
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST123";
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "1234567890";
    const c = getPublicConfig();
    expect(c.mode).toBe("production");
    expect(c.submissionEnabled).toBe(false);
    expect(c.gaMeasurementId).toBeNull();
    expect(c.metaPixelId).toBeNull();
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  });
});
