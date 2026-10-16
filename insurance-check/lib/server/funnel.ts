import "server-only";
import type { FunnelEvent, FunnelEventName } from "@/lib/types";
import { repo } from "./repo";

export interface FunnelRow {
  key: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  visits: number;
  typeSelect: number;
  /** 신청 폼이 화면에 들어온 세션 */
  formView: number;
  formStart: number;
  /** 유효 제출 = 서버에 저장된 신청 중 30일 내 중복 제외. 광고 전환은 이 값만 쓴다. */
  validSubmit: number;
  coverageOptIn: number;
  consulted: number;
  contracted: number;
  officialLookup: number;
}

const blank = (key: string, s: string | null, m: string | null, c: string | null): FunnelRow => ({
  key,
  utmSource: s,
  utmMedium: m,
  utmCampaign: c,
  visits: 0,
  typeSelect: 0,
  formView: 0,
  formStart: 0,
  validSubmit: 0,
  coverageOptIn: 0,
  consulted: 0,
  contracted: 0,
  officialLookup: 0,
});

/**
 * UTM별 퍼널. 방문·유형선택·신청시작은 익명 1st-party 이벤트의 **고유 세션 수**,
 * 유효 제출 이후 단계는 실제 저장된 신청 레코드(관리자 입력 상태 포함)로 계산한다.
 * 클릭 이벤트는 DB 확보(전환)로 세지 않는다.
 */
export async function computeFunnel(days: number): Promise<{ rows: FunnelRow[]; total: FunnelRow; since: string }> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const r = repo();
  const [events, leads] = await Promise.all([r.listEvents(since), r.listLeads({ limit: 100_000, sort: "oldest" })]);

  const map = new Map<string, FunnelRow>();
  const keyOf = (s: string | null, m: string | null, c: string | null) => `${s ?? "(direct)"}|${m ?? "-"}|${c ?? "-"}`;
  const rowFor = (s: string | null, m: string | null, c: string | null) => {
    const k = keyOf(s, m, c);
    let row = map.get(k);
    if (!row) map.set(k, (row = blank(k, s, m, c)));
    return row;
  };

  const sessions = new Map<FunnelEventName, Map<string, Set<string>>>();
  const countSession = (e: FunnelEvent) => {
    const k = keyOf(e.utmSource, e.utmMedium, e.utmCampaign);
    rowFor(e.utmSource, e.utmMedium, e.utmCampaign);
    const byKey = sessions.get(e.name) ?? new Map<string, Set<string>>();
    sessions.set(e.name, byKey);
    const set = byKey.get(k) ?? new Set<string>();
    byKey.set(k, set);
    set.add(e.sessionId);
  };
  for (const e of events) countSession(e);

  for (const [name, byKey] of sessions) {
    for (const [k, set] of byKey) {
      const row = map.get(k)!;
      if (name === "landing_view") row.visits = set.size;
      if (name === "check_type_select") row.typeSelect = set.size;
      if (name === "form_view") row.formView = set.size;
      if (name === "form_start") row.formStart = set.size;
      if (name === "official_lookup_click") row.officialLookup = set.size;
    }
  }

  for (const l of leads) {
    if (l.createdAt < since || l.duplicateOf) continue;
    const a = l.attribution;
    const row = rowFor(a.utmSource, a.utmMedium, a.utmCampaign);
    row.validSubmit++;
    if (l.coverageConsentAt) row.coverageOptIn++;
    if (l.coverageStatus === "consulted" || l.coverageStatus === "contracted") row.consulted++;
    if (l.coverageStatus === "contracted") row.contracted++;
  }

  const rows = [...map.values()].sort((a, b) => b.validSubmit - a.validSubmit || b.visits - a.visits);
  const total = rows.reduce((acc, r) => {
    for (const k of ["visits", "typeSelect", "formView", "formStart", "validSubmit", "coverageOptIn", "consulted", "contracted", "officialLookup"] as const) {
      acc[k] += r[k];
    }
    return acc;
  }, blank("total", null, null, null));
  return { rows, total, since };
}
