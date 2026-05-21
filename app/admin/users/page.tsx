"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/admin-data";
import type { ProfileRole, ProfileRow } from "@/lib/supabase-types";

const ROLE_LABEL: Record<ProfileRole, string> = {
  user: "일반",
  lawyer: "변호사",
  admin: "관리자",
};

const ROLE_CLASS: Record<ProfileRole, string> = {
  user: "bg-[#ECFDF5] text-[#047857]",
  lawyer: "bg-[#EEF2FF] text-[#4338CA]",
  admin: "bg-[#FEF3C7] text-[#B45309]",
};

export default function AdminUsersPage() {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProfileRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.warn("[admin/users] load error", error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as ProfileRow[]);
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
          회원 관리
        </h1>
        <p className="mt-1.5 text-[14px] text-[#8B95A1] font-medium">
          가입한 모든 회원을 확인하세요
        </p>
      </header>

      <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(25,31,40,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[720px]">
            <thead>
              <tr className="bg-[#F8F9FA] text-left">
                <th className="px-4 py-3 font-semibold text-[#4E5968]">이름</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">이메일</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">전화번호</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">권한</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">가입일</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968] text-right">
                  액션
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-[13px] text-[#8B95A1] font-medium"
                  >
                    불러오는 중...
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-[13px] text-[#8B95A1] font-medium"
                  >
                    아직 가입한 회원이 없습니다
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((m, idx) => (
                  <tr
                    key={m.id}
                    className={`border-t border-[#F2F4F6] ${idx % 2 === 1 ? "bg-[#FBFCFD]" : ""}`}
                  >
                    <td className="px-4 py-3 font-bold text-[#191F28]">
                      {m.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[#4E5968]">
                      {m.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[#4E5968]">
                      {m.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[11px] font-bold px-2 h-6 leading-6 rounded-full ${ROLE_CLASS[m.role]}`}
                      >
                        {ROLE_LABEL[m.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#4E5968]">
                      {formatDate(m.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(m)}
                        className="h-8 px-3 rounded-lg bg-white border border-[#E5E8EB] hover:border-[#4338CA] hover:text-[#4338CA] text-[#4E5968] text-[12px] font-semibold transition-colors duration-200"
                      >
                        상세
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-[440px]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F4F6]">
              <h3 className="text-[16px] font-bold text-[#191F28]">회원 정보</h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="w-8 h-8 -mr-2 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] text-[#8B95A1]"
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
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="이름" value={selected.name ?? "—"} />
                <Field label="권한" value={ROLE_LABEL[selected.role]} />
                <Field label="이메일" value={selected.email ?? "—"} colspan />
                <Field label="전화번호" value={selected.phone ?? "—"} />
                <Field label="가입일" value={formatDate(selected.created_at)} />
                <Field label="ID" value={selected.id.slice(0, 8)} colspan />
              </div>
              <p className="mt-4 text-[12px] text-[#8B95A1] font-medium leading-[1.6]">
                회원 정지 기능은 schema에 status 컬럼 추가 후 활성화 예정입니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  colspan,
}: {
  label: string;
  value: string;
  colspan?: boolean;
}) {
  return (
    <div className={colspan ? "col-span-2" : ""}>
      <p className="text-[11px] font-semibold text-[#8B95A1] mb-1">{label}</p>
      <p className="text-[13px] text-[#191F28] font-medium break-all">
        {value}
      </p>
    </div>
  );
}
