import "server-only";
import requirements from "@/config/requirements.json";

/**
 * 운영 설정. 모든 값은 서버 환경변수에서 읽고, 브라우저에는 `getPublicConfig()`가 고른
 * 공개 가능한 값(운영 주체 표시 정보 등)만 내려간다. 비밀키는 절대 여기서 내보내지 않는다.
 */

/**
 * demo: 서버 메모리 저장(가짜 데이터) · staging: 실제 DB에 '테스트 신청'으로 저장(배너 유지, 광고 태그 없음)
 * production: 실제 운영. 값이 없거나 모르는 값이면 항상 demo.
 */
export type AppMode = "demo" | "staging" | "production";

export function getAppMode(): AppMode {
  const m = process.env.APP_MODE;
  return m === "production" ? "production" : m === "staging" ? "staging" : "demo";
}

/** 실제 DB(Supabase)를 쓰는 모드인지 */
export function usesDatabase(mode: AppMode = getAppMode()): boolean {
  return mode !== "demo";
}

const env = (key: string): string | null => {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : null;
};

type RequirementGroup = "operator" | "infra" | "approvals";

export interface ReadinessItem {
  key: string;
  label: string;
  group: RequirementGroup;
  ok: boolean;
  hint?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function checkValue(key: string, group: RequirementGroup): { ok: boolean; hint?: string } {
  const v = env(key);
  if (!v) return { ok: false, hint: "미설정" };
  if (group === "approvals" || key === "PRIVACY_POLICY_EFFECTIVE_DATE") {
    return DATE_RE.test(v) ? { ok: true } : { ok: false, hint: "YYYY-MM-DD 형식의 승인일을 입력" };
  }
  if (key === "APP_SECRET") return v.length >= 32 ? { ok: true } : { ok: false, hint: "32자 이상" };
  if (key === "PII_ENCRYPTION_KEY") {
    return Buffer.from(v, "base64").length === 32 ? { ok: true } : { ok: false, hint: "base64 32바이트" };
  }
  if (key === "NEXT_PUBLIC_SITE_URL") return v.startsWith("https://") ? { ok: true } : { ok: false, hint: "https:// 필수" };
  return { ok: true };
}

/** 테스트(staging) 모드에 필요한 항목: 인프라 전부 + 운영 DB 점검 확인일. 운영 주체·광고 승인은 운영 모드에서만 요구 */
export function isStagingRequirement(i: Pick<ReadinessItem, "group" | "key">): boolean {
  return i.group === "infra" || i.key === "APPROVAL_DB_VERIFIED";
}

export function getReadiness(): { mode: AppMode; items: ReadinessItem[]; ready: boolean } {
  const items: ReadinessItem[] = [];
  for (const group of ["operator", "infra", "approvals"] as const) {
    for (const r of requirements[group]) {
      items.push({ key: r.key, label: r.label, group, ...checkValue(r.key, group) });
    }
  }
  const mode = getAppMode();
  const required = mode === "staging" ? items.filter(isStagingRequirement) : items;
  return { mode, items, ready: required.every((i) => i.ok) };
}

export interface OperatorInfo {
  operatorName: string | null;
  operatorBizNo: string | null;
  agencyName: string | null;
  agencyRegNo: string | null;
  plannerName: string | null;
  plannerRegNo: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactHours: string | null;
  businessAddress: string | null;
  privacyOfficer: string | null;
  privacyController: string | null;
  coverageProcessor: string | null;
  /** "none"이면 제공하지 않음. 그 외 문자열은 제공받는 자·목적·항목·기간 서술. */
  thirdPartyProvision: string | null;
  retentionClaim: string | null;
  retentionCoverage: string | null;
  adReviewNo: string | null;
  privacyPolicyEffectiveDate: string | null;
}

export interface PublicConfig {
  mode: AppMode;
  submissionEnabled: boolean;
  operator: OperatorInfo;
  gaMeasurementId: string | null;
  /** Meta 픽셀 ID(숫자). 운영 모드 + 값이 있을 때만 */
  metaPixelId: string | null;
}

export function getOperatorInfo(): OperatorInfo {
  return {
    operatorName: env("OPERATOR_NAME"),
    operatorBizNo: env("OPERATOR_BIZ_NO"),
    agencyName: env("AGENCY_NAME"),
    agencyRegNo: env("AGENCY_REG_NO"),
    plannerName: env("PLANNER_NAME"),
    plannerRegNo: env("PLANNER_REG_NO"),
    contactPhone: env("CONTACT_PHONE"),
    contactEmail: env("CONTACT_EMAIL"),
    contactHours: env("CONTACT_HOURS"),
    businessAddress: env("BUSINESS_ADDRESS"),
    privacyOfficer: env("PRIVACY_OFFICER"),
    privacyController: env("PRIVACY_CONTROLLER") ?? env("OPERATOR_NAME"),
    coverageProcessor: env("COVERAGE_PROCESSOR"),
    thirdPartyProvision: env("THIRD_PARTY_PROVISION"),
    retentionClaim: env("RETENTION_CLAIM"),
    retentionCoverage: env("RETENTION_COVERAGE"),
    adReviewNo: env("AD_REVIEW_NO"),
    privacyPolicyEffectiveDate: env("PRIVACY_POLICY_EFFECTIVE_DATE"),
  };
}

/**
 * 데모 모드: 제출은 서버 메모리에만 저장되는 시연용으로 동작한다(화면에 '데모' 표시).
 * 테스트 모드: 인프라 항목 + 운영 DB 점검 확인일이 있어야 제출이 열린다(화면에 '테스트' 표시).
 * 운영 모드: 운영 정보·인프라·승인 항목이 전부 갖춰져야 제출이 열린다.
 *            하나라도 비면 폼을 잠그고 운영자에게 설정을 요구한다.
 * 실제 DB를 쓰는 모드는 접수 API가 DB 자동 점검(lib/server/db-check.ts)까지 통과해야 저장한다.
 */
export function isSubmissionEnabled(): boolean {
  return getAppMode() === "demo" || getReadiness().ready;
}

export function getPublicConfig(): PublicConfig {
  const mode = getAppMode();
  return {
    mode,
    submissionEnabled: isSubmissionEnabled(),
    operator: getOperatorInfo(),
    // 광고·분석 태그는 운영 모드에서만. 데모 트래픽이 광고 통계를 오염시키지 않게 한다.
    gaMeasurementId: mode === "production" ? env("NEXT_PUBLIC_GA_MEASUREMENT_ID") : null,
    metaPixelId: mode === "production" ? numericId(env("NEXT_PUBLIC_META_PIXEL_ID")) : null,
  };
}

/** 픽셀 ID는 숫자만 허용(스크립트에 그대로 들어가므로 형식이 다르면 로드하지 않는다) */
function numericId(v: string | null): string | null {
  return v && /^\d{6,20}$/.test(v) ? v : null;
}

export const PRIVACY_CONSENT_VERSION = "claim-2026-10-16.v2"; // 수집 항목에서 희망 시간·메모 제외
export const COVERAGE_CONSENT_VERSION = "coverage-2026-10-15.v1";
export const MARKETING_CONSENT_VERSION = "marketing-2026-10-16.v1";
export const THIRD_PARTY_CONSENT_VERSION = "third-party-2026-10-16.v1";
