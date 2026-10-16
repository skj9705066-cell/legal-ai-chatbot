import type { StaffRole } from "./types";

/**
 * 관리자 세션 토큰: base64url(payload).base64url(HMAC-SHA256).
 * Web Crypto만 써서 Edge 미들웨어와 Node 라우트 양쪽에서 같은 코드로 검증한다.
 * 토큰은 HttpOnly 쿠키로만 오가며 브라우저 JS에서는 읽을 수 없다.
 */

export const SESSION_COOKIE = "ic_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

/** 관리자 API 인증·권한 오류: 화면에 그대로 보여 줄 수 있는 문구 + 기계용 code */
export const AUTH_ERROR = {
  unauthorized: { error: "로그인이 만료되었어요. 다시 로그인해 주세요.", code: "unauthorized" },
  forbidden: { error: "이 작업을 할 권한이 없어요.", code: "forbidden" },
  badOrigin: { error: "잘못된 요청입니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.", code: "bad_origin" },
} as const;

export interface StaffSession {
  sub: string;
  name: string;
  role: StaffRole;
  iat: number;
  exp: number;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export function getSessionSecret(): string | null {
  const s = process.env.APP_SECRET;
  return s && s.length >= 32 ? s : null;
}

export async function signSession(payload: Omit<StaffSession, "iat" | "exp">, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const full: StaffSession = { ...payload, iat: now, exp: now + SESSION_TTL_SECONDS };
  const body = b64url(enc.encode(JSON.stringify(full)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(`session.${body}`)));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined, secret: string | null): Promise<StaffSession | null> {
  if (!token || !secret) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromB64url(sig),
      enc.encode(`session.${body}`),
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as StaffSession;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!["admin", "counselor", "viewer"].includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const PERMISSIONS = {
  view: ["admin", "counselor", "viewer"],
  edit: ["admin", "counselor"],
  revealPhone: ["admin", "counselor"],
  exportCsv: ["admin"],
  viewAudit: ["admin"],
  handlePrivacy: ["admin"],
  viewSettings: ["admin"],
  /** 후기 등록(승인 대기로만) */
  editReviews: ["admin", "counselor"],
  /** 후기 공개 승인·중단 */
  approveReviews: ["admin"],
} as const satisfies Record<string, readonly StaffRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: StaffRole, perm: Permission): boolean {
  return (PERMISSIONS[perm] as readonly StaffRole[]).includes(role);
}
