"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/admin-data";
import type { ConsultationAccessLogRow } from "@/lib/supabase-types";

export default function AdminAccessLogsPage() {
  const [rows, setRows] = useState<ConsultationAccessLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("consultation_access_logs")
      .select("*")
      .order("viewed_at", { ascending: false })
      .limit(300);
    if (err) {
      // 테이블 미생성(access-logs.sql 미실행) 등도 여기서 안내한다.
      setError(err.message);
      setRows([]);
    } else {
      setError(null);
      setRows((data ?? []) as ConsultationAccessLogRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[22px] lg:text-[26px] font-bold text-[#191F28] tracking-tight">
          상담 열람 기록
        </h1>
        <p className="mt-1.5 text-[14px] text-[#8B95A1] font-medium">
          관리자가 언제 어떤 상담 원문을 열람했는지에 대한 접근 기록입니다
        </p>
      </header>

      {/* 개인정보 안전조치 안내 */}
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#E5E8EB] bg-[#F8F9FA] px-4 py-3">
        <span className="mt-0.5 text-[14px]">🔒</span>
        <p className="text-[12.5px] leading-relaxed text-[#4E5968]">
          상담 원문은 민감정보를 포함하므로, 관리자의 열람은 개인정보보호법상
          접속기록으로 남습니다. 이 기록은{" "}
          <span className="font-semibold text-[#191F28]">수정·삭제할 수 없으며</span>
          , 민감정보 취급 특성상 최소 2년 이상 보관을 권장합니다.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(25,31,40,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[720px]">
            <thead>
              <tr className="bg-[#F8F9FA] text-left">
                <th className="px-4 py-3 font-semibold text-[#4E5968]">열람 시각</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">관리자</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">카테고리</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">열람한 상담</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">상담 ID</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-[13px] text-[#8B95A1] font-medium"
                  >
                    불러오는 중...
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-[13px] text-[#B45309] font-medium"
                  >
                    열람 기록을 불러올 수 없습니다. Supabase에서{" "}
                    <code className="font-mono text-[12px]">
                      supabase/access-logs.sql
                    </code>{" "}
                    을 실행했는지 확인해주세요.
                  </td>
                </tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-[13px] text-[#8B95A1] font-medium"
                  >
                    아직 열람 기록이 없습니다
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                rows.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`border-t border-[#F2F4F6] ${idx % 2 === 1 ? "bg-[#FBFCFD]" : ""}`}
                  >
                    <td className="px-4 py-3 text-[#191F28] font-medium whitespace-nowrap tabular-nums">
                      {formatDate(r.viewed_at)}
                    </td>
                    <td className="px-4 py-3 text-[#4E5968]">
                      {r.admin_email ?? r.admin_id?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-bold px-2 h-6 leading-6 rounded-full bg-[#EEF2FF] text-[#4338CA]">
                        {r.category ?? "법률"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#191F28] max-w-[280px]">
                      <span className="block truncate">
                        {r.consultation_title ?? "(제목 없음)"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#8B95A1] font-mono text-[12px]">
                      {r.consultation_id?.slice(0, 8) ?? "—"}
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
