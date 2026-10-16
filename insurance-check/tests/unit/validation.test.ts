import { describe, expect, it } from "vitest";
import { formatPhoneInput, looksLikeRrn, maskPhone, normalizePhone, requiresThirdPartyConsent, sanitizeTag, validateCoverageInput, validateLeadInput } from "@/lib/validation";

const valid = {
  serviceType: "unclaimed",
  name: "홍길동",
  phone: "010-1234-5678",
  preferredTime: "anytime",
  memo: "",
  privacyConsent: true,
};

describe("phone", () => {
  it("normalizes valid mobile numbers", () => {
    expect(normalizePhone("010-1234-5678")).toBe("01012345678");
    expect(normalizePhone("011 234 5678")).toBe("0112345678");
  });
  it("rejects invalid numbers", () => {
    for (const p of ["010-123-4567", "02-123-4567", "0101234567a", "", "010123456789"]) expect(normalizePhone(p)).toBeNull();
  });
  it("formats while typing and masks", () => {
    expect(formatPhoneInput("01012345678")).toBe("010-1234-5678");
    expect(formatPhoneInput("0101")).toBe("010-1");
    expect(maskPhone("01012345678")).toBe("010-****-5678");
  });
});

describe("validateLeadInput", () => {
  it("accepts name/phone/type only: preferred time defaults to anytime, memo optional", () => {
    const r = validateLeadInput({ serviceType: "hidden", name: "홍길동", phone: "010-1234-5678", privacyConsent: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.preferredTime).toBe("anytime");
      expect(r.value.memo).toBe("");
      expect(r.value.marketingConsent).toBe(false);
      expect(r.value.thirdPartyConsent).toBe(false);
    }
  });
  it("requires third-party consent only when provision is configured", () => {
    expect(requiresThirdPartyConsent(undefined)).toBe(false);
    expect(requiresThirdPartyConsent("")).toBe(false);
    expect(requiresThirdPartyConsent("none")).toBe(false);
    expect(requiresThirdPartyConsent("○○보험대리점")).toBe(true);
    const missing = validateLeadInput(valid, { requireThirdParty: true });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.thirdPartyConsent).toBeTruthy();
    const given = validateLeadInput({ ...valid, thirdPartyConsent: true }, { requireThirdParty: true });
    expect(given.ok && given.value.thirdPartyConsent).toBe(true);
    // 제3자 제공이 없는 운영에서는 보내와도 기록하지 않는다
    const ignored = validateLeadInput({ ...valid, thirdPartyConsent: true });
    expect(ignored.ok && ignored.value.thirdPartyConsent).toBe(false);
  });
  it("accepts a valid lead and defaults marketing consent to false", () => {
    const r = validateLeadInput(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.marketingConsent).toBe(false);
  });
  it("requires privacy consent to be exactly true", () => {
    const r = validateLeadInput({ ...valid, privacyConsent: "true" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.privacyConsent).toBeTruthy();
  });
  it("rejects resident registration numbers in memo", () => {
    expect(looksLikeRrn("제 번호는 900101-1234567")).toBe(true);
    const r = validateLeadInput({ ...valid, memo: "9001011234567" });
    expect(r.ok).toBe(false);
  });
  it("rejects unknown service types and names with digits", () => {
    const r = validateLeadInput({ ...valid, serviceType: "loan", name: "abc123" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(["serviceType", "name"]));
  });
});

describe("validateCoverageInput", () => {
  it("cannot opt in without the separate consent checkbox", () => {
    const r = validateCoverageInput({ coverageConsent: false, contactMethod: "phone", preferredTime: "anytime" });
    expect(r.ok).toBe(false);
  });
});

describe("sanitizeTag (UTM)", () => {
  it("drops values that look like personal data", () => {
    expect(sanitizeTag("user@example.com")).toBeNull();
    expect(sanitizeTag("010-1234-5678")).toBeNull();
    expect(sanitizeTag("spring_<b>promo</b>")).toBe("spring_bpromo/b");
  });
});

describe("odometer wheel position", async () => {
  const { wheelPosition } = await import("@/lib/odometer");
  const digitsAt = (v: number, places: number) => Array.from({ length: places }, (_, i) => wheelPosition(v, places - 1 - i));
  it("stops exactly on every digit of the final value", () => {
    expect(digitsAt(103000, 6)).toEqual([1, 0, 3, 0, 0, 0]);
    expect(digitsAt(32470, 5)).toEqual([3, 2, 4, 7, 0]);
    expect(digitsAt(80, 2)).toEqual([8, 0]);
  });
  it("higher digits only roll while the lower digit wraps 9→0", () => {
    expect(wheelPosition(103500, 4)).toBe(0); // 10.35 → 0 정지
    expect(wheelPosition(109500, 4)).toBeCloseTo(0.5, 5); // 10.95 → 다음 칸으로 반쯤 넘어가는 중
    expect(wheelPosition(12.5, 0)).toBeCloseTo(2.5, 5); // 일의 자리는 연속
  });
});
