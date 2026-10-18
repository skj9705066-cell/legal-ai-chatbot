import "server-only";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAppMode } from "@/lib/config";
import { canTransition, isPublishable, parseImageDataUrl, publicMetrics, toPublicReviews, validateReviewInput } from "@/lib/reviews";
import { REVIEW_STATUSES, type OperatingMetrics, type PublicReview, type Review, type ReviewStatus } from "@/lib/types";
import type { StaffSession } from "@/lib/session";
import { can } from "@/lib/session";
import { repo } from "./repo";

type Result = { ok: true; review: Review } | { ok: false; status: number; error: string };

/** 랜딩 재생성 — 공개 여부가 바뀌면 바로 반영 */
function refreshLanding() {
  try {
    revalidatePath("/");
  } catch {
    /* 빌드·테스트 환경 등 */
  }
}

function readImage(raw: Record<string, unknown>) {
  if (raw.image === undefined || raw.image === null || raw.image === "") return null;
  return parseImageDataUrl(raw.image);
}

export async function createReview(session: StaffSession, raw: Record<string, unknown>): Promise<Result> {
  const img = readImage(raw);
  if (img && !img.ok) return { ok: false, status: 400, error: img.error };
  const v = validateReviewInput(raw, !!img);
  if (!v.ok) return { ok: false, status: 400, error: v.error };
  const now = new Date().toISOString();
  const review: Review = {
    id: randomUUID(),
    createdAt: now,
    createdBy: session.name,
    ...v.value,
    hasImage: !!img,
    useConsentAt: v.value.useConsent ? now : null,
    // 지급 확인은 누가·언제 표시했는지 함께 남긴다
    paymentConfirmedBy: v.value.paymentConfirmed ? session.name : null,
    paymentConfirmedAt: v.value.paymentConfirmed ? now : null,
    status: "pending", // 등록은 항상 승인 대기 — 공개는 관리자 승인으로만
    reviewedBy: null,
    reviewedAt: null,
    isDemo: getAppMode() === "demo",
  };
  await repo().insertReview(review);
  if (img?.ok) await repo().setReviewImage(review.id, { mime: img.mime, base64: Buffer.from(img.bytes).toString("base64") });
  await repo().addAudit({
    actor: session.name,
    role: session.role,
    action: "review.create",
    target: review.id,
    detail: `${review.category} 등록 (${img ? "캡처 이미지" : "메시지 원문"}, 동의 ${review.useConsent ? "O" : "X"}, 지급확인 ${review.paymentConfirmed ? "O" : "X"})`,
  });
  return { ok: true, review };
}

export async function updateReviewByStaff(session: StaffSession, id: string, raw: Record<string, unknown>): Promise<Result> {
  const r = repo();
  const cur = await r.getReview(id);
  if (!cur) return { ok: false, status: 404, error: "후기를 찾을 수 없습니다." };
  const patch: Partial<Review> = {};
  const changes: string[] = [];

  // 내용 수정: 공개 중인 후기는 내용이 바뀌면 다시 승인 대기로 돌린다
  const EDITABLE = ["content", "displayName", "verifiedAmount", "paymentConfirmed", "useConsent", "kind", "category", "piiMasked"];
  if (EDITABLE.some((k) => raw[k] !== undefined)) {
    const v = validateReviewInput({ ...cur, ...raw }, cur.hasImage);
    if (!v.ok) return { ok: false, status: 400, error: v.error };
    Object.assign(patch, v.value);
    if (v.value.useConsent && !cur.useConsent) patch.useConsentAt = new Date().toISOString();
    if (!v.value.useConsent) patch.useConsentAt = null;
    if (v.value.paymentConfirmed && !cur.paymentConfirmed) {
      patch.paymentConfirmedBy = session.name;
      patch.paymentConfirmedAt = new Date().toISOString();
    }
    if (!v.value.paymentConfirmed) {
      patch.paymentConfirmedBy = null;
      patch.paymentConfirmedAt = null;
    }
    changes.push("내용 수정");
    if (cur.status === "approved") {
      patch.status = v.value.useConsent ? "pending" : "hidden";
      changes.push(v.value.useConsent ? "재승인 필요" : "동의 철회로 공개 중단");
    }
  }

  if (raw.status !== undefined && raw.status !== cur.status) {
    const to = raw.status as ReviewStatus;
    if (!(REVIEW_STATUSES as readonly string[]).includes(to)) return { ok: false, status: 400, error: "잘못된 상태입니다." };
    if (!can(session.role, "approveReviews")) return { ok: false, status: 403, error: "공개 승인·중단은 관리자만 할 수 있습니다." };
    const next = { ...cur, ...patch };
    const reason = canTransition(next, to);
    if (reason) return { ok: false, status: 409, error: reason };
    patch.status = to;
    patch.reviewedBy = session.name;
    patch.reviewedAt = new Date().toISOString();
    changes.push(`상태 ${cur.status}→${to}`);
  }

  if (!changes.length) return { ok: true, review: cur };
  // 저장소가 레코드를 제자리에서 바꿀 수 있으므로 갱신 전에 공개 여부를 기록해 둔다
  const wasPublic = isPublishable(cur);
  const updated = await r.updateReview(id, patch);
  if (!updated) return { ok: false, status: 404, error: "후기를 찾을 수 없습니다." };
  await r.addAudit({ actor: session.name, role: session.role, action: "review.update", target: id, detail: changes.join(", ") });
  if (wasPublic || isPublishable(updated)) refreshLanding();
  return { ok: true, review: updated };
}

/** 후기 삭제(관리자) — 동의 철회 시 이미지까지 즉시 파기 */
export async function deleteReviewByStaff(session: StaffSession, id: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!can(session.role, "approveReviews")) return { ok: false, status: 403, error: "후기 삭제는 관리자만 할 수 있습니다." };
  const r = repo();
  const cur = await r.getReview(id);
  if (!cur) return { ok: false, status: 404, error: "후기를 찾을 수 없습니다." };
  await r.deleteReview(id);
  await r.addAudit({ actor: session.name, role: session.role, action: "review.delete", target: id, detail: `${cur.category} 후기 삭제${cur.hasImage ? " (캡처 이미지 포함)" : ""}` });
  if (isPublishable(cur)) refreshLanding();
  return { ok: true };
}

/** 이미지: 공개 경로는 공개 조건을 만족할 때만, 관리자 경로는 권한 확인 후 */
export async function getReviewImage(id: string, opts: { staff: boolean }) {
  const r = repo();
  const review = await r.getReview(id);
  if (!review?.hasImage) return null;
  if (!opts.staff && !isPublishable(review)) return null;
  return r.getReviewImage(id);
}

/** 랜딩용: 동의 + 승인된 것만. 없으면 빈 배열(섹션 숨김). */
export async function getPublicReviews(): Promise<PublicReview[]> {
  try {
    return toPublicReviews(await repo().listReviews());
  } catch {
    return []; // 후기 조회 실패가 랜딩을 깨뜨리지 않게
  }
}

export async function getOperatingMetrics(): Promise<OperatingMetrics> {
  const r = repo();
  const [leads, reviews] = await Promise.all([r.countRealLeads(), r.listReviews()]);
  const live = reviews.filter((x) => !x.isDemo && isPublishable(x));
  return {
    applications: leads.applications,
    completedConsultations: leads.completedConsultations,
    approvedReviews: live.length,
    verifiedPayoutCases: live.filter((x) => x.kind === "payout_case" && x.paymentConfirmed).length,
  };
}

export function metricsGate() {
  const min = Number(process.env.PUBLIC_METRICS_MIN);
  return {
    mode: getAppMode(),
    enabled: process.env.PUBLIC_METRICS_ENABLED === "1",
    minApplications: Number.isInteger(min) && min > 0 ? min : 100,
  };
}

/** 랜딩용: 운영 모드 + 수동 활성화 + 최소 건수 충족 시에만. 아니면 null(섹션 숨김). */
export async function getPublicMetrics(): Promise<Partial<OperatingMetrics> | null> {
  const gate = metricsGate();
  if (gate.mode !== "production" || !gate.enabled) return null;
  try {
    return publicMetrics(await getOperatingMetrics(), gate);
  } catch {
    return null;
  }
}
