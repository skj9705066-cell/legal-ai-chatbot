"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/admin-data";
import type { MatchingDBStatus } from "@/lib/supabase-types";

const STATUS_LABEL: Record<MatchingDBStatus, string> = {
  matching: "매칭중",
  matched: "매칭완료",
  cancelled: "취소",
};

const STATUS_CLASS: Record<MatchingDBStatus, string> = {
  matching: "bg-[#FFF7ED] text-[#C2410C]",
  matched: "bg-[#ECFDF5] text-[#047857]",
  cancelled: "bg-[#F4F5F7] text-[#8B95A1]",
};

interface MatchingDisplayRow {
  id: string;
  caseTitle: string;
  category: string;
  userId: string;
  proposalCount: number;
  selectedLawyer: string | null;
  status: MatchingDBStatus;
  createdAt: string;
}

export default function AdminMatchingsPage() {
  const [rows, setRows] = useState<MatchingDisplayRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    type MatchingShort = {
      id: string;
      status: MatchingDBStatus;
      created_at: string;
      user_id: string | null;
      consultation_id: string | null;
    };
    type ConsultShort = {
      id: string;
      title: string | null;
      category: string | null;
    };
    type ProposalShort = {
      matching_id: string | null;
      lawyer_id: string | null;
      selected: boolean;
    };
    type LawyerShort = { id: string; name: string };

    const { data: matchingsRaw, error } = await supabase
      .from("matchings")
      .select("id, status, created_at, user_id, consultation_id")
      .order("created_at", { ascending: false });
    if (error || !matchingsRaw) {
      setRows([]);
      setLoading(false);
      return;
    }
    const matchings = matchingsRaw as MatchingShort[];

    const consultationIds = Array.from(
      new Set(
        matchings
          .map((m) => m.consultation_id)
          .filter((x): x is string => !!x),
      ),
    );
    const matchingIds = matchings.map((m) => m.id);

    const [consultsRes, proposalsRes] = await Promise.all([
      consultationIds.length > 0
        ? supabase
            .from("consultations")
            .select("id, title, category")
            .in("id", consultationIds)
        : Promise.resolve({ data: [] }),
      matchingIds.length > 0
        ? supabase
            .from("proposals")
            .select("matching_id, lawyer_id, selected")
            .in("matching_id", matchingIds)
        : Promise.resolve({ data: [] }),
    ]);
    const consults = (consultsRes.data ?? []) as ConsultShort[];
    const proposals = (proposalsRes.data ?? []) as ProposalShort[];

    const consultMap = new Map<string, ConsultShort>(
      consults.map((c) => [c.id, c]),
    );

    const propsByMatching = new Map<string, ProposalShort[]>();
    for (const p of proposals) {
      if (!p.matching_id) continue;
      const list = propsByMatching.get(p.matching_id) ?? [];
      list.push(p);
      propsByMatching.set(p.matching_id, list);
    }

    const selectedLawyerIds = proposals
      .filter((p) => p.selected && p.lawyer_id)
      .map((p) => p.lawyer_id as string);
    const lawyerRes = selectedLawyerIds.length
      ? await supabase.from("lawyers").select("id, name").in("id", selectedLawyerIds)
      : { data: [] };
    const lawyerNames = (lawyerRes.data ?? []) as LawyerShort[];
    const lawyerMap = new Map<string, string>(
      lawyerNames.map((l) => [l.id, l.name]),
    );

    const display: MatchingDisplayRow[] = matchings.map((m) => {
      const consult = m.consultation_id ? consultMap.get(m.consultation_id) : null;
      const props = propsByMatching.get(m.id) ?? [];
      const sel = props.find((p) => p.selected);
      const selectedName = sel?.lawyer_id ? lawyerMap.get(sel.lawyer_id) ?? null : null;
      return {
        id: m.id,
        caseTitle: consult?.title ?? "(제목 없음)",
        category: consult?.category ?? "법률",
        userId: m.user_id?.slice(0, 8) ?? "—",
        proposalCount: props.length,
        selectedLawyer: selectedName,
        status: m.status,
        createdAt: m.created_at,
      };
    });

    setRows(display);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[22px] lg:text-[26px] font-bold text-[#191F28] tracking-tight">
          매칭 관리
        </h1>
        <p className="mt-1.5 text-[14px] text-[#8B95A1] font-medium">
          변호사 매칭 진행 현황을 확인하세요
        </p>
      </header>

      <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(25,31,40,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[800px]">
            <thead>
              <tr className="bg-[#F8F9FA] text-left">
                <th className="px-4 py-3 font-semibold text-[#4E5968]">사건 제목</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">카테고리</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">사용자</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">
                  제안 변호사
                </th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">
                  선택 변호사
                </th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">상태</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">일시</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-[13px] text-[#8B95A1] font-medium"
                  >
                    불러오는 중...
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-[13px] text-[#8B95A1] font-medium"
                  >
                    아직 진행된 매칭이 없습니다
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((m, idx) => (
                  <tr
                    key={m.id}
                    className={`border-t border-[#F2F4F6] ${idx % 2 === 1 ? "bg-[#FBFCFD]" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold text-[#191F28] max-w-[280px] truncate">
                      {m.caseTitle}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-bold px-2 h-6 leading-6 rounded-full bg-[#EEF2FF] text-[#4338CA]">
                        {m.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#4E5968] font-mono text-[12px]">
                      {m.userId}
                    </td>
                    <td className="px-4 py-3 text-[#191F28] font-bold">
                      {m.proposalCount}명
                    </td>
                    <td className="px-4 py-3 text-[#4E5968]">
                      {m.selectedLawyer ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[11px] font-bold px-2 h-6 leading-6 rounded-full ${STATUS_CLASS[m.status]}`}
                      >
                        {STATUS_LABEL[m.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#4E5968]">
                      {formatDate(m.createdAt)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
