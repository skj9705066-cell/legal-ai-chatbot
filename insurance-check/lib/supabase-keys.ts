/**
 * Supabase API 키 종류 판별 — 값을 화면·로그에 내보내지 않고 "어떤 종류의 키인지"만 본다.
 * 서버 비밀키 자리에 공개 키를(또는 반대로) 넣는 실수를 막는다. scripts/check-deploy.mjs에도 같은 규칙이 있다.
 *   새 형식: sb_secret_… (서버 전용) / sb_publishable_… (공개)
 *   이전 형식(JWT): payload.role 이 service_role(서버 전용) / anon(공개)
 */
export type SupabaseKeyKind = "secret" | "publishable" | "unknown";

export function classifySupabaseKey(key: string | null | undefined): SupabaseKeyKind {
  const k = (key ?? "").trim();
  if (!k) return "unknown";
  if (k.startsWith("sb_secret_")) return "secret";
  if (k.startsWith("sb_publishable_")) return "publishable";
  const parts = k.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { role?: unknown };
      if (payload.role === "service_role") return "secret";
      if (payload.role === "anon") return "publishable";
    } catch {
      /* 형식이 다르면 unknown */
    }
  }
  return "unknown";
}
