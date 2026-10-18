import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * DB 자동 점검 — 9가지 확인을 동시에 보내는지(차례로 보내면 Supabase 왕복이 쌓여 첫 신청·환경설정 화면이 수 초 늦어짐),
 * 결과 항목 순서·판정은 그대로인지. Supabase 클라이언트는 가짜로 바꿔 지연·동시 요청 수를 잰다.
 */

let inFlight = 0;
let maxInFlight = 0;

vi.mock("@supabase/supabase-js", () => ({
  createClient: (_url: string, key: string) => ({
    from: (table: string) => {
      const ops: string[] = [];
      const builder = {
        select: (_c?: string, opts?: { head?: boolean }) => (ops.push(opts?.head ? "count" : "select"), builder),
        update: () => (ops.push("update"), builder),
        delete: () => (ops.push("delete"), builder),
        limit: () => builder,
        eq: () => builder,
        then: (resolve: (v: unknown) => void) => {
          inFlight++;
          maxInFlight = Math.max(maxInFlight, inFlight);
          setTimeout(() => {
            inFlight--;
            const anon = key.startsWith("sb_publishable_");
            const denied = anon || ops.includes("delete") || (table === "ic_audit_logs" && ops.includes("update"));
            resolve(denied ? { error: { code: "42501", message: "permission denied" } } : { error: null, count: 1 });
          }, 20);
        },
      };
      return builder;
    },
  }),
}));

afterEach(() => {
  process.env.APP_MODE = "demo";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_ANON_KEY;
  inFlight = 0;
  maxInFlight = 0;
});

describe("runDbCheck", () => {
  it("sends the 9 independent checks at once and keeps the item order and verdicts", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test";
    process.env.SUPABASE_ANON_KEY = "sb_publishable_test";
    const { runDbCheck } = await import("@/lib/server/db-check");
    const r = await runDbCheck();
    expect(maxInFlight).toBe(9);
    expect(r.items.map((i) => i.id)).toEqual([
      "env",
      "server_key_kind",
      "anon_key_kind",
      "server_read",
      "lead_columns",
      "review_columns",
      "anon_read_blocked",
      "anon_staff_blocked",
      "anon_write_blocked",
      "server_no_lead_delete",
      "audit_append_only",
      "admin_registered",
    ]);
    expect(r.items.filter((i) => !i.ok)).toEqual([]);
    expect(r.ok).toBe(true);
  });
});
