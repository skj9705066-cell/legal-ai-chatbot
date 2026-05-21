"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/admin-data";
import type { ConsultationRow } from "@/lib/supabase-types";

const CATEGORIES = ["전체", "형사", "이혼", "부동산", "노동", "계약", "손해배상"];

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export default function AdminConsultationsPage() {
  const [rows, setRows] = useState<ConsultationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("전체");
  const [analyzedOnly, setAnalyzedOnly] = useState(false);
  const [selected, setSelected] = useState<ConsultationRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.warn("[admin/consultations] load error", error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as ConsultationRow[]);
    }
    setLoading(false);
  }, []);

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
                      <td className="px-4 py-3 text-[#4E5968] font-mono text-[12px]">
                        {c.user_id?.slice(0, 8) ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-bold px-2 h-6 leading-6 rounded-full bg-[#EEF2FF] text-[#4338CA]">
                          {c.category ?? "법률"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#191F28] max-w-[260px] truncate">
                        {c.title ?? "(제목 없음)"}
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
