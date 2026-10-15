import "server-only";
import type { NextRequest } from "next/server";

interface Entry {
  count: number;
  resetAt: number;
}
const g = globalThis as unknown as { __icRate?: Map<string, Entry> };
const store = (g.__icRate ??= new Map());

/**
 * 인스턴스별 인메모리 레이트리밋. 서버리스 다중 인스턴스에서는 완벽하지 않으므로
 * 운영 시 WAF/엣지 레이트리밋을 함께 둘 것 (README 참고).
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const e = store.get(key);
  if (!e || now >= e.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    if (store.size > 5000) for (const [k, v] of store) if (now >= v.resetAt) store.delete(k);
    return true;
  }
  if (e.count >= max) return false;
  e.count++;
  return true;
}

/** 프록시가 직접 세팅하는 헤더를 우선. x-forwarded-for의 첫 항목은 위조 가능하므로 마지막 항목을 쓴다. */
export function clientIp(req: NextRequest): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const vercel = req.headers.get("x-vercel-forwarded-for")?.split(",").pop()?.trim();
  if (vercel) return vercel;
  const xff = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return xff || "unknown";
}

/** 같은 사이트에서 온 요청만 허용 (CSRF·외부 스크립트 차단). */
export function isSameOrigin(req: NextRequest): boolean {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
  const source = req.headers.get("origin") ?? req.headers.get("referer");
  if (!source || !host) return false;
  try {
    return new URL(source).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

export async function readJson(req: NextRequest, maxBytes = 8_000): Promise<Record<string, unknown> | null> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}
