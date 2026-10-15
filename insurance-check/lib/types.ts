// 도메인 타입. 브라우저·서버 공용이므로 비밀값이나 원문 연락처 필드는 여기 두지 않는다.

export const SERVICE_TYPES = ["unclaimed", "hidden", "refund"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const PREFERRED_TIMES = ["weekday_morning", "weekday_afternoon", "weekday_evening", "anytime"] as const;
export type PreferredTime = (typeof PREFERRED_TIMES)[number];

export const PREFERRED_TIME_LABEL: Record<PreferredTime, string> = {
  weekday_morning: "평일 오전 (09–12시)",
  weekday_afternoon: "평일 오후 (12–18시)",
  weekday_evening: "평일 저녁 (18–20시)",
  anytime: "시간 무관",
};

/** 보험금 점검(청구 안내) 진행 상태 — 보장 분석 영업 상태와 독립. */
export const CLAIM_STATUSES = ["new", "contacting", "guided", "docs_pending", "closed", "unreachable"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  new: "신규 접수",
  contacting: "연락 중",
  guided: "청구 방법 안내 완료",
  docs_pending: "고객 서류 준비 중",
  closed: "종결",
  unreachable: "연락 불가",
};

/**
 * 보장 분석(별도 동의 상담) 상태.
 * `not_consented`는 별도 동의가 없는 고객 — 다른 상태로 바꿀 수 없다(서버에서 강제).
 * `withdrawn`은 동의 철회 — 영업 대상에서 즉시 빠진다.
 */
export const COVERAGE_STATUSES = [
  "not_consented",
  "pending",
  "contacting",
  "booked",
  "consulted",
  "contracted",
  "declined",
  "withdrawn",
] as const;
export type CoverageStatus = (typeof COVERAGE_STATUSES)[number];
export const COVERAGE_STATUS_LABEL: Record<CoverageStatus, string> = {
  not_consented: "별도 동의 없음",
  pending: "상담 대기",
  contacting: "연락 중",
  booked: "상담 예약",
  consulted: "상담 완료",
  contracted: "계약(관리자 입력)",
  declined: "고객 거절",
  withdrawn: "동의 철회",
};
/** 별도 동의가 있는 고객에게만 설정 가능한 상태. */
export const COVERAGE_ACTIVE_STATUSES: CoverageStatus[] = [
  "pending",
  "contacting",
  "booked",
  "consulted",
  "contracted",
  "declined",
];

export const PRIVACY_STATUSES = ["none", "withdraw_requested", "delete_requested", "processing", "completed"] as const;
export type PrivacyStatus = (typeof PRIVACY_STATUSES)[number];
export const PRIVACY_STATUS_LABEL: Record<PrivacyStatus, string> = {
  none: "-",
  withdraw_requested: "철회 요청",
  delete_requested: "삭제 요청",
  processing: "처리 중",
  completed: "처리 완료",
};

export const CONTACT_METHODS = ["phone", "sms_then_phone"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];
export const CONTACT_METHOD_LABEL: Record<ContactMethod, string> = {
  phone: "전화 상담",
  sms_then_phone: "문자로 일정 조율 후 전화 상담",
};

export interface Attribution {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  /** 유입 사이트의 origin만 (경로·쿼리는 개인정보가 섞일 수 있어 버린다). */
  referrer: string | null;
  landingPath: string | null;
}

/** 관리자 화면에 내려가는 신청 레코드. 연락처 원문은 포함하지 않는다. */
export interface Lead {
  id: string;
  refNo: string;
  createdAt: string;
  serviceType: ServiceType;
  name: string;
  phoneMasked: string;
  preferredTime: PreferredTime;
  memo: string;
  attribution: Attribution;
  claimStatus: ClaimStatus;
  marketingConsent: boolean;
  privacyConsentVersion: string;
  coverageConsent: boolean;
  coverageConsentAt: string | null;
  coverageConsentVersion: string | null;
  coverageContactMethod: ContactMethod | null;
  coverageStatus: CoverageStatus;
  nextContactAt: string | null;
  assignee: string | null;
  notes: string;
  privacyStatus: PrivacyStatus;
  /** 동일 연락처의 이전 신청 번호(30일 이내). null이면 최초 신청. */
  duplicateOf: string | null;
  isDemo: boolean;
}

export const STAFF_ROLES = ["admin", "counselor", "viewer"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  admin: "관리자",
  counselor: "상담사",
  viewer: "열람 전용",
};

export interface AuditLog {
  id: string;
  at: string;
  actor: string;
  role: StaffRole | "system" | "public";
  action: string;
  target: string | null;
  detail: string;
}

export const PRIVACY_REQUEST_TYPES = ["withdraw_marketing", "withdraw_coverage", "delete_all"] as const;
export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];
export const PRIVACY_REQUEST_TYPE_LABEL: Record<PrivacyRequestType, string> = {
  withdraw_marketing: "마케팅 정보 수신 동의 철회",
  withdraw_coverage: "보장 분석 상담 동의 철회",
  delete_all: "개인정보 삭제 요청",
};

export const PRIVACY_REQUEST_STATUSES = ["received", "processing", "completed", "rejected"] as const;
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];
export const PRIVACY_REQUEST_STATUS_LABEL: Record<PrivacyRequestStatus, string> = {
  received: "접수",
  processing: "처리 중",
  completed: "완료",
  rejected: "반려(본인 확인 불가 등)",
};

export interface PrivacyRequest {
  id: string;
  createdAt: string;
  type: PrivacyRequestType;
  name: string;
  phoneMasked: string;
  matchedLeadIds: string[];
  status: PrivacyRequestStatus;
  handledBy: string | null;
  handledAt: string | null;
  note: string;
}

export const FUNNEL_EVENTS = [
  "page_view",
  "hero_cta_click",
  "service_type_select",
  "form_start",
  "form_submit_success",
  "official_lookup_click",
  "coverage_offer_view",
  "coverage_opt_in",
  "coverage_decline",
  "consultation_booked",
] as const;
export type FunnelEventName = (typeof FUNNEL_EVENTS)[number];

/** 1st-party 이벤트 레코드. 개인정보·건강정보 없음 — 익명 세션 id + 캠페인 정보만. */
export interface FunnelEvent {
  name: FunnelEventName;
  at: string;
  sessionId: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  serviceType: ServiceType | null;
}
