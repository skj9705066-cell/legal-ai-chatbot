import type {
  AuditLog,
  ClaimStatus,
  CoverageStatus,
  FunnelEvent,
  Lead,
  PrivacyRequest,
  PrivacyStatus,
  Review,
  ServiceType,
} from "@/lib/types";

/** 저장소 레코드 = 화면용 Lead + 서버 전용 연락처 필드. 서버 밖으로 나가기 전 toLead()로 벗긴다. */
export interface LeadRow extends Lead {
  phoneEnc: string;
  phoneHash: string;
  /** 같은 제출의 재전송을 한 건으로 묶는 키(브라우저가 폼마다 생성). 서버 밖으로 내보내지 않는다 */
  idempotencyKey: string | null;
}

/** 같은 idempotency 키로 이미 저장된 신청이 있을 때 저장소가 던진다(DB 고유 인덱스 위반) */
export class DuplicateSubmissionError extends Error {
  constructor() {
    super("duplicate submission (idempotency key)");
    this.name = "DuplicateSubmissionError";
  }
}

export interface PrivacyRequestRow extends PrivacyRequest {
  phoneHash: string;
}

export function toLead(row: LeadRow): Lead {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { phoneEnc, phoneHash, idempotencyKey, ...lead } = row;
  return lead;
}

export function toPrivacyRequest(row: PrivacyRequestRow): PrivacyRequest {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { phoneHash, ...req } = row;
  return req;
}

export type LeadSort = "newest" | "oldest" | "next_contact";

export interface LeadFilter {
  /** 이름 부분일치 또는 신청번호 */
  q?: string;
  /** 검색어가 전화번호일 때 서비스 계층이 계산해 넣는 해시 */
  phoneHash?: string;
  serviceType?: ServiceType;
  claimStatus?: ClaimStatus;
  coverageStatus?: CoverageStatus;
  privacyStatus?: PrivacyStatus;
  duplicatesOnly?: boolean;
  /** 보장 분석 영업 대상: 별도 동의 O + 철회·삭제 요청 없음 */
  salesOnly?: boolean;
  sort?: LeadSort;
  limit?: number;
}

export type LeadRowPatch = Partial<Omit<LeadRow, "id" | "refNo" | "createdAt" | "isDemo" | "idempotencyKey">>;

export interface Repository {
  kind: "demo" | "supabase";
  /** 같은 idempotency 키가 이미 있으면 DuplicateSubmissionError */
  insertLead(row: LeadRow): Promise<void>;
  findLeadByIdempotencyKey(key: string): Promise<LeadRow | null>;
  /** since 이후 같은 연락처로 들어온 가장 오래된 신청번호 */
  findRecentRefByPhoneHash(phoneHash: string, sinceIso: string): Promise<string | null>;
  getLead(id: string): Promise<LeadRow | null>;
  listLeads(filter: LeadFilter): Promise<LeadRow[]>;
  findLeadsByPhoneHash(phoneHash: string): Promise<LeadRow[]>;
  updateLead(id: string, patch: LeadRowPatch): Promise<LeadRow | null>;

  addAudit(entry: Omit<AuditLog, "id" | "at">): Promise<void>;
  listAudit(opts: { target?: string; limit?: number }): Promise<AuditLog[]>;

  addEvent(e: FunnelEvent): Promise<void>;
  listEvents(sinceIso: string): Promise<FunnelEvent[]>;

  insertPrivacyRequest(row: PrivacyRequestRow): Promise<void>;
  listPrivacyRequests(): Promise<PrivacyRequestRow[]>;
  getPrivacyRequest(id: string): Promise<PrivacyRequestRow | null>;
  updatePrivacyRequest(id: string, patch: Partial<PrivacyRequestRow>): Promise<PrivacyRequestRow | null>;

  insertReview(r: Review): Promise<void>;
  listReviews(): Promise<Review[]>;
  getReview(id: string): Promise<Review | null>;
  updateReview(id: string, patch: Partial<Omit<Review, "id" | "createdAt" | "createdBy" | "isDemo">>): Promise<Review | null>;
  deleteReview(id: string): Promise<void>;
  /** 후기 캡처 이미지 — 목록 조회와 분리해 필요할 때만 읽는다 */
  setReviewImage(id: string, image: ReviewImage | null): Promise<void>;
  getReviewImage(id: string): Promise<ReviewImage | null>;

  /** 실제 운영 지표용 신청 집계: 데모·테스트·중복 신청 제외 */
  countRealLeads(): Promise<{ applications: number; completedConsultations: number }>;
}

export interface ReviewImage {
  mime: string;
  base64: string;
}

/** '상담 완료'로 집계하는 보험금 점검 상태 (청구 방법 안내 이후 단계) */
export const COMPLETED_CLAIM_STATUSES: ClaimStatus[] = ["guided", "docs_pending", "closed"];

export function isRealLead(l: Pick<LeadRow, "isDemo" | "isTest" | "duplicateOf">): boolean {
  return !l.isDemo && !l.isTest && !l.duplicateOf;
}
