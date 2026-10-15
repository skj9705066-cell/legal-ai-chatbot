import type {
  AuditLog,
  ClaimStatus,
  CoverageStatus,
  FunnelEvent,
  Lead,
  PrivacyRequest,
  PrivacyStatus,
  ServiceType,
} from "@/lib/types";

/** 저장소 레코드 = 화면용 Lead + 서버 전용 연락처 필드. 서버 밖으로 나가기 전 toLead()로 벗긴다. */
export interface LeadRow extends Lead {
  phoneEnc: string;
  phoneHash: string;
}

export interface PrivacyRequestRow extends PrivacyRequest {
  phoneHash: string;
}

export function toLead(row: LeadRow): Lead {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { phoneEnc, phoneHash, ...lead } = row;
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

export type LeadRowPatch = Partial<Omit<LeadRow, "id" | "refNo" | "createdAt" | "isDemo">>;

export interface Repository {
  kind: "demo" | "supabase";
  insertLead(row: LeadRow): Promise<void>;
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
}
