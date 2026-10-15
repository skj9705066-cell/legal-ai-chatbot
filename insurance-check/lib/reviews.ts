import type { OperatingMetrics, PublicReview, Review, ReviewKind, ReviewStatus, ServiceType } from "./types";
import { REVIEW_KINDS, SERVICE_TYPES } from "./types";

/**
 * 후기·지급 사례 공개 규칙 (서버·테스트 공용 순수 함수).
 *  1) 게시 동의 + 공개 승인된 것만 공개한다.
 *  2) 지급 금액은 실제 지급이 확인된 경우에만 노출한다.
 *  3) 지급 사례(payout_case)는 지급 확인 없이는 공개 승인할 수 없다.
 *  4) 후기가 없으면 아무것도 만들어 내지 않는다(빈 배열 → 섹션 숨김).
 */

export function isPublishable(r: Pick<Review, "status" | "useConsent" | "kind" | "paymentConfirmed">): boolean {
  if (r.status !== "approved" || !r.useConsent) return false;
  if (r.kind === "payout_case" && !r.paymentConfirmed) return false;
  return true;
}

function monthLabel(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000); // KST
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월`;
}

export function toPublicReviews(reviews: Review[]): PublicReview[] {
  return reviews
    .filter(isPublishable)
    .sort((a, b) => (b.reviewedAt ?? b.createdAt).localeCompare(a.reviewedAt ?? a.createdAt))
    .map((r) => ({
      id: r.id,
      kind: r.kind,
      displayName: r.displayName,
      claimType: r.claimType,
      content: r.content,
      verifiedAmount: r.paymentConfirmed ? r.verifiedAmount : null,
      monthLabel: monthLabel(r.reviewedAt ?? r.createdAt),
      isDemo: r.isDemo,
    }));
}

const PHONE_LIKE = /(01[016789]|0\d{1,2})[-.\s]?\d{3,4}[-.\s]?\d{4}/;
const EMAIL_LIKE = /[\w.+-]+@[\w-]+\.[\w.]+/;
const RRN_LIKE = /\d{6}[-\s]?[1-4]\d{6}/;

/**
 * 익명 표시명 검사. 실명처럼 보이는 2~4자 한글 이름 그대로는 거부한다.
 * 허용 예: "김○○ 고객", "김*수", "40대 직장인", "서울 30대 고객"
 */
export function isAnonymizedDisplayName(name: string): boolean {
  const v = name.trim();
  if (v.length < 2 || v.length > 20) return false;
  if (PHONE_LIKE.test(v) || EMAIL_LIKE.test(v)) return false;
  if (/^[가-힣]{2,4}$/.test(v)) return false; // 실명 그대로
  if (/^[가-힣]{2,4}\s*(님|씨|고객|고객님)$/.test(v)) return false; // "홍길동 고객"
  return true;
}

export interface ReviewInput {
  kind: ReviewKind;
  displayName: string;
  claimType: ServiceType;
  content: string;
  paymentConfirmed: boolean;
  verifiedAmount: number | null;
  useConsent: boolean;
}

export type ReviewValidation = { ok: true; value: ReviewInput } | { ok: false; error: string };

export function validateReviewInput(raw: Record<string, unknown>): ReviewValidation {
  const kind = raw.kind as ReviewKind;
  if (!(REVIEW_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "후기 유형을 선택해 주세요." };
  const claimType = raw.claimType as ServiceType;
  if (!(SERVICE_TYPES as readonly string[]).includes(claimType)) return { ok: false, error: "보험금 유형을 선택해 주세요." };
  const displayName = typeof raw.displayName === "string" ? raw.displayName.trim() : "";
  if (!isAnonymizedDisplayName(displayName)) {
    return { ok: false, error: "표시명은 익명 처리해 주세요. (예: 김○○ 고객, 40대 직장인 — 실명·연락처 불가)" };
  }
  const content = typeof raw.content === "string" ? raw.content.trim() : "";
  if (content.length < 10 || content.length > 500) return { ok: false, error: "후기 내용은 10~500자로 입력해 주세요." };
  if (PHONE_LIKE.test(content) || EMAIL_LIKE.test(content) || RRN_LIKE.test(content)) {
    return { ok: false, error: "후기 내용에 연락처·이메일·주민번호 등 개인정보가 포함되어 있습니다." };
  }
  const paymentConfirmed = raw.paymentConfirmed === true;
  let verifiedAmount: number | null = null;
  if (raw.verifiedAmount !== undefined && raw.verifiedAmount !== null && raw.verifiedAmount !== "") {
    const n = Number(raw.verifiedAmount);
    if (!Number.isInteger(n) || n <= 0 || n > 10_000_000_000) return { ok: false, error: "지급 금액은 원 단위 정수로 입력해 주세요." };
    if (!paymentConfirmed) return { ok: false, error: "실제 지급이 확인된 경우에만 지급 금액을 입력할 수 있습니다." };
    verifiedAmount = n;
  }
  const useConsent = raw.useConsent === true;
  return { ok: true, value: { kind, displayName, claimType, content, paymentConfirmed, verifiedAmount, useConsent } };
}

/** 상태 전환 가능 여부. 승인은 공개 조건을 만족할 때만. */
export function canTransition(r: Pick<Review, "useConsent" | "kind" | "paymentConfirmed">, to: ReviewStatus): string | null {
  if (to !== "approved") return null;
  if (!r.useConsent) return "후기 게시 동의가 없는 후기는 공개할 수 없습니다.";
  if (r.kind === "payout_case" && !r.paymentConfirmed) return "실제 지급이 확인되지 않은 지급 사례는 공개할 수 없습니다.";
  return null;
}

/* ───────────── 실제 운영 지표 공개 기준 ───────────── */

export interface MetricsGate {
  mode: "demo" | "production";
  /** PUBLIC_METRICS_ENABLED=1 (광고 심의 승인 후 수동으로 켠다) */
  enabled: boolean;
  /** 최소 누적 신청 건수 (PUBLIC_METRICS_MIN, 기본 100) */
  minApplications: number;
}

/** 공개 가능한 지표만 남긴다. 기준 미달이면 null → 섹션 숨김. 0인 항목은 표시하지 않는다. */
export function publicMetrics(m: OperatingMetrics, gate: MetricsGate): Partial<OperatingMetrics> | null {
  if (gate.mode !== "production" || !gate.enabled) return null;
  if (m.applications < gate.minApplications) return null;
  const out: Partial<OperatingMetrics> = {};
  for (const k of Object.keys(m) as (keyof OperatingMetrics)[]) if (m[k] > 0) out[k] = m[k];
  return out;
}
