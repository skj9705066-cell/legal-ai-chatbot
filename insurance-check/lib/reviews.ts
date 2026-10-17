import type { OperatingMetrics, PublicReview, Review, ReviewCategory, ReviewKind, ReviewStatus } from "./types";
import { REVIEW_CATEGORIES, REVIEW_IMAGE_MAX_BYTES, REVIEW_IMAGE_TYPES, REVIEW_KINDS } from "./types";

/**
 * 후기·지급 사례 공개 규칙 (서버·테스트 공용 순수 함수).
 *  1) 게시 동의 + 공개 승인된 것만 공개한다.
 *  2) 지급 금액은 실제 지급이 확인된 경우에만 노출한다.
 *  3) 지급 사례(payout_case)는 지급 확인 없이는 공개 승인할 수 없다.
 *  4) 캡처 이미지는 개인정보(프로필 사진·전화번호·실명)를 가린 것으로 확인된 경우에만 공개한다.
 *  5) 후기가 없으면 아무것도 만들어 내지 않는다(빈 배열 → '실제 후기 준비 중').
 */

type PublishFields = Pick<Review, "status" | "useConsent" | "kind" | "paymentConfirmed" | "hasImage" | "piiMasked">;

export function isPublishable(r: PublishFields): boolean {
  if (r.status !== "approved" || !r.useConsent) return false;
  if (r.kind === "payout_case" && !r.paymentConfirmed) return false;
  if (r.hasImage && !r.piiMasked) return false;
  return true;
}

/** 메시지 원문을 말풍선 단위로 나눈다 (빈 줄 제거, 최대 8개) */
export function toBubbles(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8);
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
      category: r.category,
      content: r.content,
      imageUrl: r.hasImage ? `/review-images/${r.id}` : null,
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
  category: ReviewCategory;
  content: string;
  piiMasked: boolean;
  paymentConfirmed: boolean;
  verifiedAmount: number | null;
  useConsent: boolean;
}

export type ReviewValidation = { ok: true; value: ReviewInput } | { ok: false; error: string };

/** hasImage: 이미 저장된 이미지가 있거나 이번 요청에 이미지가 함께 올라오는지 */
export function validateReviewInput(raw: Record<string, unknown>, hasImage = false): ReviewValidation {
  const kind = raw.kind as ReviewKind;
  if (!(REVIEW_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "후기 종류를 선택해 주세요." };
  const category = raw.category as ReviewCategory;
  if (!(REVIEW_CATEGORIES as readonly string[]).includes(category)) return { ok: false, error: "후기 유형을 선택해 주세요." };
  const displayName = typeof raw.displayName === "string" ? raw.displayName.trim() : "";
  if (!isAnonymizedDisplayName(displayName)) {
    return { ok: false, error: "표시명은 익명 처리해 주세요. (예: 김○○ 고객, 40대 직장인 — 실명·연락처 불가)" };
  }
  const content = typeof raw.content === "string" ? raw.content.trim() : "";
  if (content.length > 1000) return { ok: false, error: "메시지 원문은 1,000자 이내로 입력해 주세요." };
  if (!hasImage && content.length < 10) return { ok: false, error: "메시지 원문(10자 이상) 또는 캡처 이미지가 필요합니다." };
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
  const piiMasked = raw.piiMasked === true;
  if (hasImage && !piiMasked) return { ok: false, error: "캡처 이미지의 프로필 사진·전화번호·실명을 가렸는지 확인해 주세요." };
  return { ok: true, value: { kind, displayName, category, content, piiMasked, paymentConfirmed, verifiedAmount, useConsent } };
}

/** 상태 전환 가능 여부. 승인은 공개 조건을 만족할 때만. */
export function canTransition(r: Pick<Review, "useConsent" | "kind" | "paymentConfirmed" | "hasImage" | "piiMasked">, to: ReviewStatus): string | null {
  if (to !== "approved") return null;
  if (!r.useConsent) return "후기 게시 동의가 없는 후기는 공개할 수 없습니다.";
  if (r.kind === "payout_case" && !r.paymentConfirmed) return "실제 지급이 확인되지 않은 지급 사례는 공개할 수 없습니다.";
  if (r.hasImage && !r.piiMasked) return "개인정보 가림이 확인되지 않은 캡처 이미지는 공개할 수 없습니다.";
  return null;
}

/** data:image/...;base64,... 를 검증해 바이트로 바꾼다. 형식·크기·파일 시그니처를 모두 확인한다. */
export function parseImageDataUrl(v: unknown): { ok: true; mime: (typeof REVIEW_IMAGE_TYPES)[number]; bytes: Uint8Array } | { ok: false; error: string } {
  if (typeof v !== "string") return { ok: false, error: "이미지 형식이 올바르지 않습니다." };
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(v);
  if (!m || !(REVIEW_IMAGE_TYPES as readonly string[]).includes(m[1])) return { ok: false, error: "JPEG·PNG·WEBP 이미지만 올릴 수 있습니다." };
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  if (bytes.length > REVIEW_IMAGE_MAX_BYTES) return { ok: false, error: "이미지가 너무 큽니다(1.5MB 이하)." };
  const sig = (...b: number[]) => b.every((x, i) => bytes[i] === x);
  const okSig =
    (m[1] === "image/jpeg" && sig(0xff, 0xd8, 0xff)) ||
    (m[1] === "image/png" && sig(0x89, 0x50, 0x4e, 0x47)) ||
    (m[1] === "image/webp" && sig(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45);
  if (!okSig) return { ok: false, error: "이미지 파일이 손상되었거나 형식이 맞지 않습니다." };
  return { ok: true, mime: m[1] as (typeof REVIEW_IMAGE_TYPES)[number], bytes };
}

/* ───────────── 실제 운영 지표 공개 기준 ───────────── */

export interface MetricsGate {
  mode: "demo" | "staging" | "production";
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
