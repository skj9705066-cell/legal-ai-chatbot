import "server-only";
import { createClient } from "@supabase/supabase-js";
import { usesDatabase } from "@/lib/config";
import { classifySupabaseKey } from "@/lib/supabase-keys";

/**
 * 운영 DB 자동 점검 — 실제 DB를 쓰는 모드(테스트·운영)에서 신청을 저장하기 전에 통과해야 한다.
 * supabase/verify.sql(SQL Editor에서 사람이 확인)과 짝을 이루며, 서버에서 실제 키로 "밖에서 보이는 결과"를 확인한다.
 *
 * 모든 확인은 데이터를 바꾸지 않는다:
 *  - 조회는 0행(limit 0) 또는 건수만
 *  - 권한 없음 확인용 수정·삭제는 존재할 수 없는 id(0행)에만 시도 → 권한이 있어도 아무 행도 바뀌지 않는다
 * 결과에는 키·URL 값이 들어가지 않는다.
 */

export interface DbCheckItem {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}
export interface DbCheckResult {
  ok: boolean;
  checkedAt: string;
  items: DbCheckItem[];
}

/** 통과는 5분, 실패는 30초만 기억한다(일시적인 네트워크 오류가 복구되면 곧바로 접수 재개) */
const TTL_OK_MS = 5 * 60_000;
const TTL_FAIL_MS = 30_000;
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
/** 02-hardening(동의 기록·중복키·지급 증빙) 칼럼 — 코드가 저장에 쓰므로 반드시 있어야 한다 */
const LEAD_COLUMNS_02 =
  "idempotency_key, privacy_consent_at, marketing_consent_at, marketing_consent_version, marketing_withdrawn_at, third_party_consent_at, third_party_consent_version";
const REVIEW_COLUMNS_02 = "payment_confirmed_by, payment_confirmed_at, payment_evidence_note";

const g = globalThis as unknown as { __icDbCheck?: { at: number; result: DbCheckResult } };

type PgError = { code?: string; message?: string } | null;
/** 권한 없음(42501)으로 거절됐는지. 네트워크 오류 등 다른 실패는 '차단 확인'으로 치지 않는다 */
const isPermissionDenied = (e: PgError) => e?.code === "42501";
const errText = (e: PgError) => (e ? `${e.code ?? ""} ${e.message ?? ""}`.trim().slice(0, 160) : "");

export async function runDbCheck(): Promise<DbCheckResult> {
  const items: DbCheckItem[] = [];
  const add = (id: string, label: string, ok: boolean, detail: string) => items.push({ id, label, ok, detail });
  const url = process.env.SUPABASE_URL?.trim();
  const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();

  add("env", "SUPABASE_URL·서버 키·공개 키 설정", !!(url && serverKey && anonKey), url && serverKey && anonKey ? "설정됨" : "미설정 항목 있음");
  const serverKind = classifySupabaseKey(serverKey);
  add("server_key_kind", "서버 키가 비밀키(secret/service_role)인지", serverKind === "secret",
    serverKind === "secret" ? "비밀키" : serverKind === "publishable" ? "공개 키가 들어 있음 — secret 키로 바꾸세요" : "형식을 알 수 없음");
  const anonKind = classifySupabaseKey(anonKey);
  add("anon_key_kind", "공개 키 자리에 비밀키가 없는지", anonKind === "publishable",
    anonKind === "publishable" ? "공개 키" : anonKind === "secret" ? "비밀키가 들어 있음 — publishable 키로 바꾸세요" : "형식을 알 수 없음");
  if (!url || !serverKey || !anonKey) return finish(items);

  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  const server = createClient(url, serverKey, opts);
  const anon = createClient(url, anonKey, opts);

  try {
    // 서로 독립적인 점검이라 동시에 보낸다(차례로 보내면 Supabase 왕복 시간이 9번 쌓여 첫 신청·환경설정 화면이 수 초 늦어진다)
    const [read, cols, rcols, aRead, aStaff, aWrite, sDelete, sAudit, admins] = await Promise.all([
      server.from("ic_leads").select("id", { count: "exact", head: true }),
      server.from("ic_leads").select(LEAD_COLUMNS_02).limit(0),
      server.from("ic_reviews").select(REVIEW_COLUMNS_02).limit(0),
      anon.from("ic_leads").select("id").limit(1),
      anon.from("ic_staff").select("user_id").limit(1),
      anon.from("ic_leads").update({ notes: "" }).eq("id", NIL_UUID),
      server.from("ic_leads").delete().eq("id", NIL_UUID),
      server.from("ic_audit_logs").update({ detail: "" }).eq("id", -1),
      server.from("ic_staff").select("user_id", { count: "exact", head: true }).eq("role", "admin").eq("active", true),
    ]);
    add("server_read", "서버가 신청 테이블을 조회할 수 있음", !read.error, read.error ? errText(read.error) : "정상");
    add("lead_columns", "동의 기록·중복 방지 칼럼 존재 (02-hardening)", !cols.error, cols.error ? errText(cols.error) : "정상");
    add("review_columns", "후기 지급 증빙 칼럼 존재 (02-hardening)", !rcols.error, rcols.error ? errText(rcols.error) : "정상");
    add("anon_read_blocked", "공개 키로 신청 조회 차단", isPermissionDenied(aRead.error),
      isPermissionDenied(aRead.error) ? "권한 없음으로 거절됨" : aRead.error ? `예상과 다른 오류: ${errText(aRead.error)}` : "🔴 조회가 허용됨");
    add("anon_staff_blocked", "공개 키로 직원 정보 조회 차단", isPermissionDenied(aStaff.error),
      isPermissionDenied(aStaff.error) ? "권한 없음으로 거절됨" : aStaff.error ? `예상과 다른 오류: ${errText(aStaff.error)}` : "🔴 조회가 허용됨");
    add("anon_write_blocked", "공개 키로 신청 수정 차단", isPermissionDenied(aWrite.error),
      isPermissionDenied(aWrite.error) ? "권한 없음으로 거절됨" : aWrite.error ? `예상과 다른 오류: ${errText(aWrite.error)}` : "🔴 수정 요청이 허용됨");
    add("server_no_lead_delete", "서버도 신청을 삭제할 수 없음 (파기는 익명화)", isPermissionDenied(sDelete.error),
      isPermissionDenied(sDelete.error) ? "권한 없음으로 거절됨" : sDelete.error ? `예상과 다른 오류: ${errText(sDelete.error)}` : "🔴 삭제 권한이 있음");
    add("audit_append_only", "감사로그 수정 불가", isPermissionDenied(sAudit.error),
      isPermissionDenied(sAudit.error) ? "권한 없음으로 거절됨" : sAudit.error ? `예상과 다른 오류: ${errText(sAudit.error)}` : "🔴 수정 권한이 있음");
    add("admin_registered", "활성 관리자 1명 이상 등록", !admins.error && (admins.count ?? 0) > 0,
      admins.error ? errText(admins.error) : `${admins.count ?? 0}명`);
  } catch (err) {
    add("network", "DB 연결", false, err instanceof Error ? err.message.slice(0, 160) : "연결 실패");
  }
  return finish(items);
}

function finish(items: DbCheckItem[]): DbCheckResult {
  return { ok: items.length > 0 && items.every((i) => i.ok), checkedAt: new Date().toISOString(), items };
}

/** 캐시된 점검 결과(통과 5분·실패 30초). force면 새로 점검. 데모 모드에서는 점검하지 않는다. */
export async function getDbCheck(force = false): Promise<DbCheckResult | null> {
  if (!usesDatabase()) return null;
  const hit = g.__icDbCheck;
  if (!force && hit && Date.now() - hit.at < (hit.result.ok ? TTL_OK_MS : TTL_FAIL_MS)) return hit.result;
  const result = await runDbCheck();
  g.__icDbCheck = { at: Date.now(), result };
  return result;
}
