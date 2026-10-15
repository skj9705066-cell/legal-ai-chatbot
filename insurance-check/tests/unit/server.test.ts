import { beforeAll, describe, expect, it } from "vitest";
import { csvCell } from "@/lib/server/csv";
import { isSalesEligible } from "@/lib/server/repo/filter";
import { signSession, verifySession, can } from "@/lib/session";

beforeAll(() => {
  process.env.APP_MODE = "demo";
});

describe("csv", () => {
  it("neutralizes spreadsheet formulas and escapes quotes", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("+1")).toBe(`"'+1"`);
    expect(csvCell(null)).toBe('""');
  });
});

describe("sales eligibility", () => {
  it("excludes customers without the separate consent", () => {
    expect(isSalesEligible({ coverageConsent: false, coverageStatus: "not_consented", privacyStatus: "none" })).toBe(false);
  });
  it("excludes withdrawn / deletion-requested customers", () => {
    expect(isSalesEligible({ coverageConsent: true, coverageStatus: "pending", privacyStatus: "delete_requested" })).toBe(false);
    expect(isSalesEligible({ coverageConsent: false, coverageStatus: "withdrawn", privacyStatus: "completed" })).toBe(false);
  });
  it("includes consented customers", () => {
    expect(isSalesEligible({ coverageConsent: true, coverageStatus: "booked", privacyStatus: "none" })).toBe(true);
  });
});

describe("session tokens", () => {
  const secret = "x".repeat(40);
  it("round-trips and rejects tampering / wrong secret", async () => {
    const t = await signSession({ sub: "u1", name: "관리자", role: "admin" }, secret);
    expect((await verifySession(t, secret))?.role).toBe("admin");
    expect(await verifySession(t, "y".repeat(40))).toBeNull();
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), role: "admin", sub: "evil" })).toString("base64url");
    expect(await verifySession(`${forged}.${sig}`, secret)).toBeNull();
    expect(await verifySession(t, null)).toBeNull();
  });
  it("enforces role permissions", () => {
    expect(can("viewer", "revealPhone")).toBe(false);
    expect(can("counselor", "exportCsv")).toBe(false);
    expect(can("admin", "exportCsv")).toBe(true);
  });
});

describe("pii crypto & receipts", async () => {
  const { encryptPii, decryptPii, hashPhone, signReceipt, verifyReceipt } = await import("@/lib/server/crypto");
  it("encrypts with random IV and decrypts", () => {
    const a = encryptPii("01012345678");
    expect(a).not.toContain("01012345678");
    expect(a).not.toBe(encryptPii("01012345678"));
    expect(decryptPii(a)).toBe("01012345678");
    expect(hashPhone("01012345678")).toBe(hashPhone("01012345678"));
  });
  it("receipt tokens are bound to the lead and unforgeable", () => {
    const t = signReceipt("lead-1");
    expect(verifyReceipt(t)).toBe("lead-1");
    const [body] = t.split(".");
    const other = Buffer.from(JSON.stringify({ leadId: "lead-2", exp: Date.now() + 1e6 })).toString("base64url");
    expect(verifyReceipt(`${other}.${t.split(".")[1]}`)).toBeNull();
    expect(verifyReceipt(`${body}.`)).toBeNull();
  });
});
