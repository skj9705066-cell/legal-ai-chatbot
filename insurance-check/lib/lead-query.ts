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

/**
 * 감사로그용 필터 설명. 감사로그는 지울 수 없으므로 검색어(이름·전화번호일 수 있음)는 내용을 남기지 않고
 * "검색어 있음"으로만 적는다. 나머지는 검증된 목록 값만 쓴다.
 */
export function describeLeadQuery(f: LeadQuery): string {
  const parts: string[] = [];
  if (f.q) parts.push("검색어 있음(내용 미기록)");
  if (f.serviceType) parts.push(`유형=${f.serviceType}`);
  if (f.claimStatus) parts.push(`점검상태=${f.claimStatus}`);
  if (f.coverageStatus) parts.push(`보장분석=${f.coverageStatus}`);
  if (f.privacyStatus) parts.push(`개인정보=${f.privacyStatus}`);
  if (f.duplicatesOnly) parts.push("중복만");
  if (f.salesOnly) parts.push("영업 대상");
  if (f.sort && f.sort !== "newest") parts.push(`정렬=${f.sort}`);
  return parts.length ? parts.join(", ") : "전체";
}
