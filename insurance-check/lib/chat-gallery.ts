import type { PublicReview, ReviewCategory } from "./types";

export interface ScenarioLike {
  id: string;
  category: ReviewCategory;
}

export type GallerySlot<S extends ScenarioLike> = { kind: "real"; review: PublicReview } | { kind: "example"; scenario: S };

/**
 * 갤러리 구성: 예시 카드 순서를 유지하되, 같은 유형의 실제 후기(공개 승인된 것)가 있으면 그 자리를 실제 후기로 바꾼다.
 * 자리를 못 찾은 실제 후기는 앞쪽에 추가한다. 실제 후기가 없으면 예시만 — 가짜 '실제 후기'를 만들지 않는다.
 */
export function buildGallery<S extends ScenarioLike>(scenarios: readonly S[], reviews: PublicReview[]): GallerySlot<S>[] {
  const pool = [...reviews];
  const slots: GallerySlot<S>[] = scenarios.map((s) => {
    const i = pool.findIndex((r) => r.category === s.category);
    if (i < 0) return { kind: "example", scenario: s };
    const [review] = pool.splice(i, 1);
    return { kind: "real", review };
  });
  return [...pool.map((review) => ({ kind: "real" as const, review })), ...slots];
}
