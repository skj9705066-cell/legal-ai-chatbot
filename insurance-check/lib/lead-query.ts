import {
  CLAIM_STATUSES,
  COVERAGE_STATUSES,
  PRIVACY_STATUSES,
  SERVICE_TYPES,
  type ClaimStatus,
  type CoverageStatus,
  type PrivacyStatus,
  type ServiceType,
} from "./types";

export interface LeadQuery {
  q?: string;
  rawQuery?: string;
  serviceType?: ServiceType;
  claimStatus?: ClaimStatus;
  coverageStatus?: CoverageStatus;
  privacyStatus?: PrivacyStatus;
  duplicatesOnly?: boolean;
  salesOnly?: boolean;
  sort?: "newest" | "oldest" | "next_contact";
}

const oneOf = <T extends string>(list: readonly T[], v: string | undefined): T | undefined =>
  v && (list as readonly string[]).includes(v) ? (v as T) : undefined;

/** URL 쿼리 → 목록 필터. 화면과 CSV 내보내기가 같은 해석을 공유한다. */
export function parseLeadQuery(sp: Record<string, string | string[] | undefined>): LeadQuery {
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const q = get("q")?.trim().slice(0, 40) || undefined;
  return {
    q,
    rawQuery: q,
    serviceType: oneOf(SERVICE_TYPES, get("type")),
    claimStatus: oneOf(CLAIM_STATUSES, get("claim")),
    coverageStatus: oneOf(COVERAGE_STATUSES, get("coverage")),
    privacyStatus: oneOf(PRIVACY_STATUSES, get("privacy")),
    duplicatesOnly: get("dup") === "1",
    salesOnly: get("view") === "sales",
    sort: oneOf(["newest", "oldest", "next_contact"] as const, get("sort")),
  };
}
