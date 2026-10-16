import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { usesDatabase } from "../config";

/**
 * 연락처 보호:
 *  - phone_enc: AES-256-GCM 암호문 (원문 열람은 권한자 + 감사로그)
 *  - phone_hash: HMAC-SHA256 (중복 신청 감지·철회 요청 매칭용, 원문 복원 불가)
 * 데모 모드에서 키가 없으면 프로세스마다 임시 키를 만든다(재시작 시 데모 데이터와 함께 사라짐).
 * 실제 DB를 쓰는 모드(테스트·운영)는 임시 키를 절대 쓰지 않는다 — 재시작 후 복호화가 불가능해지기 때문.
 */

const g = globalThis as unknown as { __icEphemeral?: { pii: Buffer; app: string } };

function ephemeral() {
  if (!g.__icEphemeral) {
    g.__icEphemeral = { pii: randomBytes(32), app: randomBytes(32).toString("hex") };
  }
  return g.__icEphemeral;
}

function piiKey(): Buffer {
  const raw = process.env.PII_ENCRYPTION_KEY;
  if (raw) {
    const key = Buffer.from(raw, "base64");
    if (key.length === 32) return key;
  }
  if (usesDatabase()) throw new Error("PII_ENCRYPTION_KEY is not configured");
  return ephemeral().pii;
}

export function appSecret(): string {
  const s = process.env.APP_SECRET;
  if (s && s.length >= 32) return s;
  if (usesDatabase()) throw new Error("APP_SECRET is not configured");
  return ephemeral().app;
}

export function encryptPii(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", piiKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ct.toString("base64")].join(".");
}

export function decryptPii(payload: string): string {
  const [v, iv, tag, ct] = payload.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("bad ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", piiKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]).toString("utf8");
}

export function hashPhone(digits: string): string {
  return createHmac("sha256", piiKey()).update(`phone:${digits}`).digest("hex");
}

/**
 * 신청 완료 후 '보장 분석 추가 신청'에 쓰는 영수증 토큰.
 * 신청한 브라우저만 가진 서명 토큰이라, 다른 사람이 남의 신청에 동의를 붙일 수 없다.
 */
const RECEIPT_TTL_MS = 2 * 60 * 60 * 1000;

export function signReceipt(leadId: string): string {
  const exp = Date.now() + RECEIPT_TTL_MS;
  const body = Buffer.from(JSON.stringify({ leadId, exp })).toString("base64url");
  const sig = createHmac("sha256", appSecret()).update(`receipt.${body}`).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyReceipt(token: unknown): string | null {
  if (typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", appSecret()).update(`receipt.${body}`).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { leadId, exp } = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof leadId !== "string" || typeof exp !== "number" || exp < Date.now()) return null;
    return leadId;
  } catch {
    return null;
  }
}

export function safeEqual(a: string, b: string): boolean {
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}
