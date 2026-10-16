import type { LeadFilter, LeadRow } from "./types";

/** 데모 저장소용 메모리 필터. Supabase 저장소는 같은 의미를 SQL로 구현한다. */
export function applyLeadFilter(rows: LeadRow[], f: LeadFilter): LeadRow[] {
  let out = rows.filter((l) => {
    if (f.serviceType && l.serviceType !== f.serviceType) return false;
    if (f.claimStatus && l.claimStatus !== f.claimStatus) return false;
    if (f.coverageStatus && l.coverageStatus !== f.coverageStatus) return false;
    if (f.privacyStatus && l.privacyStatus !== f.privacyStatus) return false;
    if (f.duplicatesOnly && !l.duplicateOf) return false;
    if (f.salesOnly && !isSalesEligible(l)) return false;
    if (f.tests === "exclude" && l.isTest) return false;
    if (f.tests === "only" && !l.isTest) return false;
    if (f.phoneHash) return l.phoneHash === f.phoneHash;
    if (f.q) {
      const q = f.q.toLowerCase();
      if (!l.name.toLowerCase().includes(q) && !l.refNo.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const sort = f.sort ?? "newest";
  out = [...out].sort((a, b) => {
    if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
    if (sort === "next_contact") {
      if (!a.nextContactAt) return 1;
      if (!b.nextContactAt) return -1;
      return a.nextContactAt.localeCompare(b.nextContactAt);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
  return out.slice(0, f.limit ?? 500);
}

/**
 * 보장 분석 영업 대상 여부. 별도 동의가 있고, 철회·삭제 요청이 없어야 한다.
 * 이 함수가 false면 영업 목록·영업 상태 변경 어디에도 들어가지 않는다.
 */
export function isSalesEligible(l: Pick<LeadRow, "coverageConsent" | "coverageStatus" | "privacyStatus">): boolean {
  return (
    l.coverageConsent &&
    l.coverageStatus !== "withdrawn" &&
    l.coverageStatus !== "not_consented" &&
    !["delete_requested", "withdraw_requested"].includes(l.privacyStatus)
  );
}
