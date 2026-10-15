import { describe, expect, it } from "vitest";
import { formatPhoneInput, looksLikeRrn, maskPhone, normalizePhone, sanitizeTag, validateCoverageInput, validateLeadInput } from "@/lib/validation";

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
