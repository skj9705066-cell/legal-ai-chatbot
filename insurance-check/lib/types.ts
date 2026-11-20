// 도메인 타입. 브라우저·서버 공용이므로 비밀값이나 원문 연락처 필드는 여기 두지 않는다.

/**
 * 신청의 대표 유형(DB service_type). unclaimed·hidden·refund는 2026-10 이전 신청에서 쓰던 값이라 계속 허용한다.
 * 2026-11 방문 점검 개편부터는 관심 서비스(INTERESTS)에서 대표 유형을 정한다 — 하나만 고르면 그 항목, 여럿이면 general.
 */
export const SERVICE_TYPES = ["card_points", "unclaimed", "hidden", "refund", "general"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

/** 신청서의 '관심 서비스'(여러 개 선택). 보험 보장분석은 여기에 없다 — 신청 완료 후 별도 동의로만 받는다 */
export const INTERESTS = ["card_points", "unclaimed", "hidden", "not_sure"] as const;
export type Interest = (typeof INTERESTS)[number];
export const INTEREST_LABEL: Record<Interest, string> = {
  card_points: "사용하지 않은 카드포인트",
  unclaimed: "청구하지 않은 병원비·수술비 보험금",
  hidden: "찾아가지 않은 만기·휴면 보험금",
  not_sure: "잘 모르겠어요 (전체 안내)",
};
export const INTEREST_SHORT: Record<Interest, string> = {
  card_points: "카드포인트",
  unclaimed: "미청구 보험금",
  hidden: "숨은·만기 보험금",
  not_sure: "전체 안내",
};

/** 관심 서비스 → 대표 유형. 하나만 골랐고 그게 구체 항목이면 그 유형, 아니면 general */
export function serviceTypeFor(interests: readonly Interest[]): ServiceType {
  if (interests.length === 1 && interests[0] !== "not_sure") return interests[0] as ServiceType;
  return "general";
}

/** 관리자 표시용 관심 서비스 요약. 개편 이전 신청(관심 서비스 없음)은 null → 대표 유형으로 표시 */
export function interestsText(interests: readonly Interest[]): string | null {
  return interests.length ? interests.map((i) => INTEREST_SHORT[i]).join(", ") : null;
}

/** 방문 점검 지역. 서울·경기·인천만 방문하고, 그 외 지역은 전화로 안내한다 */
export const REGIONS = ["seoul", "gyeonggi", "incheon", "other"] as const;
export type Region = (typeof REGIONS)[number];
export const REGION_LABEL: Record<Region, string> = {
  seoul: "서울",
  gyeonggi: "경기",
  incheon: "인천",
  other: "그 외 지역",
};
export const VISIT_REGIONS: Region[] = ["seoul", "gyeonggi", "incheon"];

/** 실제 운영이 아닌 화면 표시용 모드: 데모(메모리 저장) / 테스트(실제 DB에 테스트 신청으로 저장). 운영이면 null */
export type TrialMode = "demo" | "staging" | null;
export const TRIAL_LABEL = { demo: "데모", staging: "테스트" } as const;
export function trialMode(mode: "demo" | "staging" | "production"): TrialMode {
  return mode === "production" ? null : mode;
}

export const PREFERRED_TIMES = ["weekday_morning", "weekday_afternoon", "weekday_evening", "anytime"] as const;
export type PreferredTime = (typeof PREFERRED_TIMES)[number];

export const PREFERRED_TIME_LABEL: Record<PreferredTime, string> = {
  weekday_morning: "오전 (9시~12시)",
  weekday_afternoon: "오후 (12시~6시)",
  weekday_evening: "저녁 (6시~8시)",
  anytime: "언제든 괜찮아요",
};

/**
 * 무료 점검 진행 상태(DB claim_status) — 보장 분석 영업 상태와 독립.
 * 신청 → 전화 연락 → 방문 예약 → 방문 점검 → 안내 완료/종결. visit_booked·visited는 2026-11 추가(03 마이그레이션).
 */
export const CLAIM_STATUSES = ["new", "contacting", "visit_booked", "visited", "guided", "docs_pending", "closed", "unreachable"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  new: "신규 접수",
  contacting: "연락 중",
  visit_booked: "방문 예약",
  visited: "방문 점검 완료",
  guided: "확인 방법 안내 완료",
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
  /** 방문 지역. 2026-11 이전 신청은 null */
  region: Region | null;
  /** 관심 서비스. 2026-11 이전 신청은 빈 배열 */
  interests: Interest[];
  preferredTime: PreferredTime;
  memo: string;
  attribution: Attribution;
  /** 방문 예약 일시·장소(전화로 정한 뒤 상담사가 입력). 장소는 짧게 — 상세 주소는 꼭 필요할 때만 */
  visitAt: string | null;
  visitPlace: string | null;
  claimStatus: ClaimStatus;
  marketingConsent: boolean;
  /** 제3자 제공 동의(제3자 제공이 설정된 운영에서만 받는다) */
  thirdPartyConsent: boolean;
  privacyConsentVersion: string;
  /** 동의 기록: 시각·문구 버전. 이 기능 이전 신청이나 미동의 항목은 null */
  privacyConsentAt: string | null;
  marketingConsentAt: string | null;
  marketingConsentVersion: string | null;
  marketingWithdrawnAt: string | null;
  thirdPartyConsentAt: string | null;
  thirdPartyConsentVersion: string | null;
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
  /** 내부 테스트 신청 — 실제 운영 지표에서 제외 (관리자가 표시) */
  isTest: boolean;
  isDemo: boolean;
}

/** 상담 이력(전화·문자·방문·메모). 직원이 기록하고 수정하지 않는다. 파기 시 함께 삭제된다 */
export const ACTIVITY_KINDS = ["call", "sms", "visit", "memo"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];
export const ACTIVITY_KIND_LABEL: Record<ActivityKind, string> = {
  call: "전화",
  sms: "문자",
  visit: "방문",
  memo: "메모",
};
export interface LeadActivity {
  id: string;
  leadId: string;
  at: string;
  actor: string;
  kind: ActivityKind;
  content: string;
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

/**
 * 1st-party 퍼널 이벤트(익명). 광고 전환은 lead_submit_success(서버 저장 성공 후에만) 하나.
 * 클릭 이벤트는 전환이 아니다.
 */
export const FUNNEL_EVENTS = [
  "landing_view",
  "hero_cta_click",
  "stats_cta_click",
  "scenario_card_click",
  "case_cta_click",
  "check_type_select",
  "form_view",
  "form_start",
  "form_submit_attempt",
  "lead_submit_success",
  "lead_submit_error",
  "faq_open",
  "call_click",
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

/* ───────────── 고객 후기·지급 사례 (실제 동의·승인된 것만 공개) ───────────── */

export const REVIEW_KINDS = ["review", "payout_case"] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];
export const REVIEW_KIND_LABEL: Record<ReviewKind, string> = {
  review: "이용 후기",
  payout_case: "지급 사례",
};

/** 후기 분류 — 실제 내용에 해당하는 유형 하나만 고른다 */
export const REVIEW_CATEGORIES = ["medical_claim", "maturity_dormant", "history_lookup", "claim_guidance", "coverage_consult"] as const;
export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number];
export const REVIEW_CATEGORY_LABEL: Record<ReviewCategory, string> = {
  medical_claim: "병원비·수술비 청구",
  maturity_dormant: "만기·휴면보험금 확인",
  history_lookup: "과거 보험 가입 내역 확인",
  claim_guidance: "보험금 청구 절차 안내",
  coverage_consult: "보장 분석 상담",
};

/** 후기 이미지 허용 형식·크기 (관리자 화면에서 개인정보를 가린 뒤 JPEG로 다시 저장해 올린다) */
export const REVIEW_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const REVIEW_IMAGE_MAX_BYTES = 1_500_000;

/** pending: 등록됨(비공개) · approved: 공개 · rejected: 반려 · hidden: 공개 중단 */
export const REVIEW_STATUSES = ["pending", "approved", "rejected", "hidden"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "승인 대기",
  approved: "공개 승인",
  rejected: "반려",
  hidden: "공개 중단",
};

/** 관리자 화면용 후기 레코드. 고객 실명·연락처는 저장하지 않는다(표시명은 익명 처리된 값만). */
export interface Review {
  id: string;
  createdAt: string;
  createdBy: string;
  kind: ReviewKind;
  /** 익명 처리된 표시명 (예: "김○○ 고객", "40대 직장인") */
  displayName: string;
  category: ReviewCategory;
  /** 고객 메시지 원문(줄바꿈 = 말풍선 구분). 캡처 이미지만 있으면 빈 문자열일 수 있다 */
  content: string;
  /** 고객 동의 캡처 이미지 보유 여부 (이미지 본문은 저장소에서 따로 다룬다) */
  hasImage: boolean;
  /** 이미지 속 프로필 사진·전화번호·실명 등을 가렸는지 담당자 확인 */
  piiMasked: boolean;
  /** 실제 지급이 확인됐는지 (지급 안내 문서·고객 확인 등으로) */
  paymentConfirmed: boolean;
  /** 지급 확인을 표시한 담당자·시각 (paymentConfirmed가 아니면 null) */
  paymentConfirmedBy: string | null;
  paymentConfirmedAt: string | null;
  /** 검증된 지급 금액(원). paymentConfirmed가 아니면 항상 null */
  verifiedAmount: number | null;
  /** 후기 게시 동의 */
  useConsent: boolean;
  useConsentAt: string | null;
  status: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  isDemo: boolean;
}

/** 랜딩에 내려가는 공개 후기. 동의 + 승인된 것만, 금액은 지급 확인된 경우에만. */
export interface PublicReview {
  id: string;
  kind: ReviewKind;
  displayName: string;
  category: ReviewCategory;
  content: string;
  /** 공개 이미지 경로 (승인된 후기만 응답) */
  imageUrl: string | null;
  verifiedAmount: number | null;
  /** "2026년 10월" 형식 */
  monthLabel: string;
  isDemo: boolean;
}

/** 실제 운영 지표. 데모·중복 신청은 집계에서 제외한다. */
export interface OperatingMetrics {
  applications: number;
  completedConsultations: number;
  approvedReviews: number;
  verifiedPayoutCases: number;
}
