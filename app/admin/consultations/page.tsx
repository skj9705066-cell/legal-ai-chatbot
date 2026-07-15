"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/admin-data";
import type { ConsultationRow, ProfileRow } from "@/lib/supabase-types";
import type { CaseSummary } from "@/lib/types";

const CATEGORIES = ["전체", "형사", "이혼", "부동산", "노동", "계약", "손해배상"];

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const URGENCY_LABEL: Record<string, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

// 원본 대화가 유실된(localStorage에만 있던) 과거 상담 중 '매칭까지 진행된' 건은
// matchings.case_summary(사건 요약)만 남아있다. 이를 읽기용 메시지로 복원한다.
function caseSummaryToMessages(cs: CaseSummary): ChatMsg[] {
  const lines: string[] = [];
  if (cs.caseType) lines.push(`사건 유형: ${cs.caseType}`);
  if (cs.urgency) lines.push(`긴급도: ${URGENCY_LABEL[cs.urgency] ?? cs.urgency}`);
  if (cs.keyIssues?.length) {
    lines.push("", "핵심 쟁점:");
    for (const k of cs.keyIssues) lines.push(`· ${k}`);
  }
  if (cs.relevantLaws?.length) {
    lines.push("", "관련 법령:");
    for (const l of cs.relevantLaws) lines.push(`· ${l}`);
  }
  if (cs.summary) lines.push("", "[사건 요약]", cs.summary);
  return [
    {
      role: "assistant",
      content:
        "⚠️ 원본 대화가 없어, 매칭 시 저장된 사건 요약만 복원한 내역입니다.\n\n" +
        lines.join("\n"),
    },
  ];
}

export default function AdminConsultationsPage() {
  const [rows, setRows] = useState<ConsultationRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("전체");
  const [analyzedOnly, setAnalyzedOnly] = useState(false);
  const [selected, setSelected] = useState<ConsultationRow | null>(null);
  // 매칭 요약으로 복원한(원본 대화 없는) 행의 id 집합 — 배지 표시에 사용.
  const [recoveredIds, setRecoveredIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    // 상담·회원(profiles)에 더해, 사건 요약이 있는 매칭도 함께 조회한다.
    const [consRes, profRes, matchRes] = await Promise.all([
      supabase
        .from("consultations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("profiles").select("*"),
      supabase
        .from("matchings")
        .select("id, consultation_id, user_id, case_summary, created_at")
        .not("case_summary", "is", null)
        .order("created_at", { ascending: false }),
    ]);

    const realRows = consRes.error
      ? []
      : ((consRes.data ?? []) as ConsultationRow[]);
    if (consRes.error) {
      console.warn("[admin/consultations] load error", consRes.error.message);
    }

    // 실제 consultations에 없는 매칭 요약만 합성해 유실 상담을 복원한다.
    const existingIds = new Set(realRows.map((r) => r.id));
    const recovered = new Set<string>();
    const synthesized: ConsultationRow[] = [];
    if (matchRes.error) {
      console.warn(
        "[admin/consultations] matchings load error",
        matchRes.error.message,
      );
    } else {
      type MatchShort = {
        id: string;
        consultation_id: string | null;
        user_id: string | null;
        case_summary: CaseSummary | null;
        created_at: string;
      };
      const seen = new Set<string>();
      for (const m of (matchRes.data ?? []) as MatchShort[]) {
        const cs = m.case_summary;
        if (!cs) continue;
        const rowId = m.consultation_id ?? m.id;
        if (existingIds.has(rowId) || seen.has(rowId)) continue;
        seen.add(rowId);
        recovered.add(rowId);
        synthesized.push({
          id: rowId,
          user_id: m.user_id,
          category: cs.caseType ?? null,
          title: cs.summary ? cs.summary.slice(0, 40) : cs.caseType ?? "(요약 복구)",
          messages: caseSummaryToMessages(cs) as never,
          analysis_complete: true,
          analysis_summary: cs as never,
          created_at: m.created_at,
          updated_at: m.created_at,
        });
      }
    }

    const merged = [...realRows, ...synthesized].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setRows(merged);
    setRecoveredIds(recovered);

    if (profRes.error) {
      console.warn(
        "[admin/consultations] profiles load error",
        profRes.error.message,
      );
    } else {
      const map: Record<string, ProfileRow> = {};
      for (const p of (profRes.data ?? []) as ProfileRow[]) {
        map[p.id] = p;
      }
      setProfiles(map);
    }
    setLoading(false);
  }, []);

  function userLabel(userId: string | null): string {
    if (!userId) return "—";
    const p = profiles[userId];
    return p?.name || p?.email || `${userId.slice(0, 8)}`;
  }

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (category !== "전체" && r.category !== category) return false;
      if (analyzedOnly && !r.analysis_complete) return false;
      return true;
    });
  }, [rows, category, analyzedOnly]);

  function getMessages(row: ConsultationRow): ChatMsg[] {
    if (!Array.isArray(row.messages)) return [];
    return (row.messages as unknown as ChatMsg[]).filter(
      (m) => m && (m.role === "user" || m.role === "assistant"),
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[22px] lg:text-[26px] font-bold text-[#191F28] tracking-tight">
          상담 관리
        </h1>
        <p className="mt-1.5 text-[14px] text-[#8B95A1] font-medium">
          사용자 AI 상담 내역을 확인하세요
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 px-3 pr-8 rounded-lg border border-[#E5E8EB] bg-white focus:border-[#4338CA] focus:outline-none focus:ring-4 focus:ring-[#4338CA]/14 text-[13px] font-medium text-[#191F28] transition-all duration-200"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              카테고리: {c}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 px-3 h-10 rounded-lg bg-white border border-[#E5E8EB] cursor-pointer">
          <input
            type="checkbox"
            checked={analyzedOnly}
            onChange={(e) => setAnalyzedOnly(e.target.checked)}
            className="w-4 h-4 accent-[#4338CA]"
          />
          <span className="text-[13px] font-medium text-[#4E5968]">
            분석 완료만 보기
          </span>
        </label>
      </div>

      <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(25,31,40,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[760px]">
            <thead>
              <tr className="bg-[#F8F9FA] text-left">
                <th className="px-4 py-3 font-semibold text-[#4E5968]">ID</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">사용자</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">카테고리</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">제목</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">시작 시간</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">메시지</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">분석</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968] text-right">
                  액션
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-[13px] text-[#8B95A1] font-medium"
                  >
                    불러오는 중...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-[13px] text-[#8B95A1] font-medium"
                  >
                    {rows.length === 0
                      ? "아직 등록된 상담이 없습니다"
                      : "조건에 맞는 상담이 없습니다"}
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((c, idx) => {
                  const msgCount = Array.isArray(c.messages)
                    ? (c.messages as unknown[]).length
                    : 0;
                  return (
                    <tr
                      key={c.id}
                      className={`border-t border-[#F2F4F6] ${idx % 2 === 1 ? "bg-[#FBFCFD]" : ""}`}
                    >
                      <td className="px-4 py-3 text-[#8B95A1] font-mono text-[12px]">
                        {c.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-[#191F28] font-medium">
                        {userLabel(c.user_id)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-bold px-2 h-6 leading-6 rounded-full bg-[#EEF2FF] text-[#4338CA]">
                          {c.category ?? "법률"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#191F28] max-w-[260px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {recoveredIds.has(c.id) && (
                            <span className="shrink-0 text-[10px] font-bold px-1.5 h-5 leading-5 rounded-full bg-[#FEF3C7] text-[#B45309]">
                              요약 복구
                            </span>
                          )}
                          <span className="truncate">
                            {c.title ?? "(제목 없음)"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#4E5968]">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="px-4 py-3 text-[#4E5968]">{msgCount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${c.analysis_complete ? "bg-[#10B981]" : "bg-[#E5E8EB]"}`}
                          aria-label={c.analysis_complete ? "완료" : "미완료"}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelected(c)}
                          className="h-8 px-3 rounded-lg bg-white border border-[#E5E8EB] hover:border-[#4338CA] hover:text-[#4338CA] text-[#4E5968] text-[12px] font-semibold transition-colors duration-200"
                        >
                          대화 보기
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-[640px] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-start justify-between px-6 py-4 border-b border-[#F2F4F6]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold px-2 h-6 leading-6 rounded-full bg-[#EEF2FF] text-[#4338CA]">
                    {selected.category ?? "법률"}
                  </span>
                  <span className="text-[12px] text-[#8B95A1] font-medium">
                    {formatDate(selected.created_at)}
                  </span>
                  <span className="text-[12px] text-[#4E5968] font-semibold">
                    · {userLabel(selected.user_id)}
                  </span>
                  {recoveredIds.has(selected.id) && (
                    <span className="text-[10px] font-bold px-1.5 h-5 leading-5 rounded-full bg-[#FEF3C7] text-[#B45309]">
                      요약 복구
                    </span>
                  )}
                </div>
                <h3 className="text-[15px] font-bold text-[#191F28] leading-snug">
                  {selected.title ?? "(제목 없음)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="shrink-0 w-8 h-8 ml-3 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] text-[#8B95A1]"
                aria-label="닫기"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
              {getMessages(selected).length === 0 ? (
                <p className="text-center text-[13px] text-[#8B95A1] font-medium py-6">
                  메시지가 없습니다
                </p>
              ) : (
                getMessages(selected).map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[13px] leading-[1.6] whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-[#4338CA] text-white rounded-br-md"
                          : "bg-[#F4F5F7] text-[#191F28] rounded-bl-md"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
