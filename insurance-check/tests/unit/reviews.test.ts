import { describe, expect, it } from "vitest";
import { canTransition, isAnonymizedDisplayName, parseImageDataUrl, publicMetrics, toBubbles, toPublicReviews, validateReviewInput } from "@/lib/reviews";
import type { Review } from "@/lib/types";

const base: Review = {
  id: "r1",
  createdAt: "2026-10-01T00:00:00.000Z",
  createdBy: "관리자",
  paymentConfirmedBy: null,
  paymentConfirmedAt: null,
  kind: "review",
  displayName: "40대 직장인",
  category: "claim_guidance",
  content: "어떤 보험을 확인해야 하는지 알게 되어 도움이 됐어요.",
  hasImage: false,
  piiMasked: false,
  paymentConfirmed: false,
  verifiedAmount: null,
  useConsent: true,
  useConsentAt: "2026-10-01T00:00:00.000Z",
  status: "approved",
  reviewedBy: "관리자",
  reviewedAt: "2026-10-02T00:00:00.000Z",
  isDemo: false,
};

describe("후기 공개 규칙", () => {
  it("동의 + 승인된 후기만 공개한다", () => {
    const list = [
      base,
      { ...base, id: "no-consent", useConsent: false },
      { ...base, id: "pending", status: "pending" as const },
      { ...base, id: "hidden", status: "hidden" as const },
      { ...base, id: "rejected", status: "rejected" as const },
    ];
    expect(toPublicReviews(list).map((r) => r.id)).toEqual(["r1"]);
  });

  it("후기가 없으면 아무것도 만들어 내지 않는다", () => {
    expect(toPublicReviews([])).toEqual([]);
  });

  it("지급 확인이 없으면 금액을 노출하지 않는다", () => {
    const [r] = toPublicReviews([{ ...base, verifiedAmount: 1_200_000, paymentConfirmed: false }]);
    expect(r.verifiedAmount).toBeNull();
    const [p] = toPublicReviews([{ ...base, kind: "payout_case", paymentConfirmed: true, verifiedAmount: 1_200_000 }]);
    expect(p.verifiedAmount).toBe(1_200_000);
  });

  it("지급 확인 없는 지급 사례는 공개되지 않고 승인도 거절된다", () => {
    const c = { ...base, kind: "payout_case" as const, paymentConfirmed: false };
    expect(toPublicReviews([c])).toEqual([]);
    expect(canTransition(c, "approved")).toMatch(/지급이 확인되지 않은/);
    expect(canTransition({ ...base, useConsent: false }, "approved")).toMatch(/동의/);
    expect(canTransition(base, "hidden")).toBeNull();
  });

  it("공개 항목에 작성자·동의 시각 등 내부 필드를 싣지 않는다", () => {
    const [r] = toPublicReviews([base]);
    expect(Object.keys(r).sort()).toEqual(["category", "content", "displayName", "id", "imageUrl", "isDemo", "kind", "monthLabel", "verifiedAmount"]);
    expect(r.monthLabel).toBe("2026년 10월");
  });
});

describe("캡처 이미지 후기", () => {
  it("개인정보 가림이 확인되지 않은 이미지는 공개·승인되지 않는다", () => {
    const img = { ...base, hasImage: true, piiMasked: false };
    expect(toPublicReviews([img])).toEqual([]);
    expect(canTransition(img, "approved")).toMatch(/개인정보 가림/);
    const [ok] = toPublicReviews([{ ...img, piiMasked: true }]);
    expect(ok.imageUrl).toBe("/review-images/r1");
  });

  it("이미지가 있으면 원문 없이도 등록되지만 가림 확인은 필수", () => {
    const raw = { kind: "review", category: "medical_claim", displayName: "30대 직장인", content: "", useConsent: true };
    expect(validateReviewInput(raw, false).ok).toBe(false);
    expect(validateReviewInput(raw, true).ok).toBe(false);
    expect(validateReviewInput({ ...raw, piiMasked: true }, true).ok).toBe(true);
  });

  it("이미지 data URL은 형식·시그니처·크기를 검사한다", () => {
    const jpeg = "data:image/jpeg;base64," + btoa(String.fromCharCode(0xff, 0xd8, 0xff, 0xe0, 1, 2, 3));
    expect(parseImageDataUrl(jpeg).ok).toBe(true);
    const fake = "data:image/jpeg;base64," + btoa("<svg onload=alert(1)>");
    expect(parseImageDataUrl(fake).ok).toBe(false);
    expect(parseImageDataUrl("data:image/svg+xml;base64,PHN2Zz4=").ok).toBe(false);
    const big = "data:image/png;base64," + btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47) + "a".repeat(1_600_000));
    expect(parseImageDataUrl(big).ok).toBe(false);
  });

  it("메시지 원문은 줄 단위 말풍선으로 나뉜다", () => {
    expect(toBubbles("감사합니다!\n\n  덕분에 확인했어요  \r\n")).toEqual(["감사합니다!", "덕분에 확인했어요"]);
  });
});

describe("후기 입력 검증", () => {
  it("익명 표시명만 허용한다", () => {
    for (const ok of ["김○○ 고객", "김*수", "40대 직장인", "서울 30대 고객"]) expect(isAnonymizedDisplayName(ok), ok).toBe(true);
    for (const bad of ["홍길동", "홍길동 고객", "김철수님", "010-1234-5678", "a@b.com", "x"]) expect(isAnonymizedDisplayName(bad), bad).toBe(false);
  });

  it("지급 확인 없이 금액을 입력할 수 없다", () => {
    const raw = { kind: "review", category: "maturity_dormant", displayName: "50대 고객", content: "만기된 보험을 확인하게 됐어요. 감사합니다.", useConsent: true };
    expect(validateReviewInput({ ...raw, verifiedAmount: 500000 }).ok).toBe(false);
    const ok = validateReviewInput({ ...raw, paymentConfirmed: true, verifiedAmount: 500000 });
    expect(ok.ok && ok.value.verifiedAmount).toBe(500000);
  });

  it("후기 내용의 연락처·이메일·주민번호를 거부한다", () => {
    const raw = { kind: "review", category: "maturity_dormant", displayName: "50대 고객", useConsent: true };
    for (const content of ["연락은 010-1234-5678로 주세요 감사합니다", "메일 test@example.com 으로 받았어요", "주민번호 900101-1234567 확인"]) {
      expect(validateReviewInput({ ...raw, content }).ok, content).toBe(false);
    }
  });
});

describe("실제 운영 지표 공개 기준", () => {
  const m = { applications: 150, completedConsultations: 90, approvedReviews: 0, verifiedPayoutCases: 3 };
  it("데모 모드·미활성화·기준 미달이면 숨긴다", () => {
    expect(publicMetrics(m, { mode: "demo", enabled: true, minApplications: 100 })).toBeNull();
    expect(publicMetrics(m, { mode: "production", enabled: false, minApplications: 100 })).toBeNull();
    expect(publicMetrics({ ...m, applications: 99 }, { mode: "production", enabled: true, minApplications: 100 })).toBeNull();
  });
  it("공개 시 0인 항목은 빼고 실제 값 그대로 보여 준다", () => {
    expect(publicMetrics(m, { mode: "production", enabled: true, minApplications: 100 })).toEqual({
      applications: 150,
      completedConsultations: 90,
      verifiedPayoutCases: 3,
    });
  });
});
