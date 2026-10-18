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

/** Vercel이 배포마다 자동으로 넣는 환경(VERCEL_ENV). Vercel 밖(로컬 등)이면 null */
export type DeployEnv = "production" | "preview" | "development" | null;
export function getDeployEnv(): DeployEnv {
  const v = process.env.VERCEL_ENV;
  return v === "production" || v === "preview" || v === "development" ? v : null;
}

/**
 * 모드 결정 규칙
 *  1) Vercel **Preview** 배포 + PREVIEW_TEST_SUBMISSIONS=1 → 테스트 모드(staging).
 *     APP_MODE 값과 관계없이 Preview에서만 켜지고, Production 배포에서는 이 값이 있어도 무시된다.
 *  2) APP_MODE=production → 운영 모드
 *  3) Vercel **Production** 배포 → APP_MODE 값과 관계없이(비어 있음·staging·demo·오타 포함) 운영 모드.
 *     실제 고객이 보는 주소에 데모·테스트 화면이 나가지 않게 하고, 준비 전에는 운영 기준으로 접수를 잠근다.
 *  4) APP_MODE=staging → 테스트 모드
 *  5) 그 밖(비어 있음·오타 포함) → 데모 모드
 */
export function getAppMode(): AppMode {
  const m = process.env.APP_MODE;
  const deploy = getDeployEnv();
  if (deploy === "preview" && process.env.PREVIEW_TEST_SUBMISSIONS === "1") return "staging";
  if (m === "production" || deploy === "production") return "production";
  if (m === "staging") return "staging";
  return "demo";
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
  if (key === "CRON_SECRET") return v.length >= 16 ? { ok: true } : { ok: false, hint: "16자 이상" };
  return { ok: true };
}

/** 운영에서만 요구하는 인프라 항목(예: 자동 파기 Cron 키 — Vercel Cron은 Production 배포에서만 돈다) */
const PRODUCTION_ONLY = new Set<string>(requirements.infra.filter((r) => "productionOnly" in r && r.productionOnly).map((r) => r.key));

/** 테스트(staging) 모드에 필요한 항목: 인프라(운영 전용 제외) + 운영 DB 점검 확인일. 운영 주체·광고 승인은 운영 모드에서만 요구 */
export function isStagingRequirement(i: Pick<ReadinessItem, "group" | "key">): boolean {
  return (i.group === "infra" && !PRODUCTION_ONLY.has(i.key)) || i.key === "APPROVAL_DB_VERIFIED";
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
  /** 처리위탁·국외 이전 고지: 신청 처리 서버(Vercel Functions)·DB(Supabase) 위치. 대시보드에서 확인한 값만 넣는다 */
  serverRegion: string | null;
  dbRegion: string | null;
}

export interface PublicConfig {
  mode: AppMode;
  submissionEnabled: boolean;
  /**
   * 접수가 잠긴 이유(미완료 설정의 변수 이름만, 값은 없음). Vercel Production 배포에서는 항상 null —
   * Preview·로컬에서 설정 누락을 찾기 위한 진단용이다.
   */
  lockedBy: string[] | null;
  operator: OperatorInfo;
  gaMeasurementId: string | null;
  /** Meta 픽셀 ID(숫자). 운영 모드 + 값이 있을 때만 */
  metaPixelId: string | null;
}

/** GET /api/status 응답 — 신청 폼이 화면을 띄운 뒤 실제 접수 가능 여부를 다시 확인한다(페이지는 5분 캐시) */
export interface SubmissionStatus {
  submissionEnabled: boolean;
  /** 진단(Production 배포에서는 항상 null): 미완료 설정 변수 이름 + 실패한 DB 자동 점검 항목. 값·키는 담지 않는다 */
  diagnostics: {
    lockedBy: string[];
    dbFailures: string[];
    /** 지금 보고 있는 배포. 배포 주소는 만들어질 때의 환경변수에 고정되므로, 설정을 바꿨다면 새 배포에서 확인해야 한다 */
    deployment: { env: string | null; url: string | null; branch: string | null; commit: string | null } | null;
  } | null;
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
    serverRegion: env("SERVER_REGION"),
    dbRegion: env("DB_REGION"),
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
  const tagsOn = mode === "production" && isSubmissionEnabled();
  return {
    mode,
    submissionEnabled: isSubmissionEnabled(),
    lockedBy: lockDiagnostics(),
    operator: getOperatorInfo(),
    // 광고·분석 태그는 접수가 열린 운영 모드에서만. 데모·테스트·준비 중 트래픽이 광고 통계를 오염시키지 않게 한다.
    gaMeasurementId: tagsOn ? env("NEXT_PUBLIC_GA_MEASUREMENT_ID") : null,
    metaPixelId: tagsOn ? numericId(env("NEXT_PUBLIC_META_PIXEL_ID")) : null,
  };
}

function lockDiagnostics(): string[] | null {
  if (getDeployEnv() === "production" || isSubmissionEnabled()) return null;
  const { mode, items } = getReadiness();
  const required = mode === "staging" ? items.filter(isStagingRequirement) : items;
  return required.filter((i) => !i.ok).map((i) => `${i.key}${i.hint && i.hint !== "미설정" ? `(${i.hint})` : ""}`);
}

/** 픽셀 ID는 숫자만 허용(스크립트에 그대로 들어가므로 형식이 다르면 로드하지 않는다) */
function numericId(v: string | null): string | null {
  return v && /^\d{6,20}$/.test(v) ? v : null;
}

export const PRIVACY_CONSENT_VERSION = "claim-2026-10-18.v3"; // 처리 위탁(국외 이전) 항목 추가 · v2: 수집 항목에서 희망 시간·메모 제외
export const COVERAGE_CONSENT_VERSION = "coverage-2026-10-15.v1";
export const MARKETING_CONSENT_VERSION = "marketing-2026-10-18.v2"; // 보유 기간 최대 1년(자동 파기)
export const THIRD_PARTY_CONSENT_VERSION = "third-party-2026-10-16.v1";
