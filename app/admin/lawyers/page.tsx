"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/admin-data";
import type { LawyerRow, LawyerDBStatus } from "@/lib/supabase-types";
import Toast from "@/components/admin/Toast";

type TabKey = "all" | "pending" | "approved" | "rejected";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "pending", label: "승인 대기" },
  { key: "approved", label: "승인 완료" },
  { key: "rejected", label: "거절" },
];

const STATUS_LABEL: Record<LawyerDBStatus, string> = {
  pending: "승인대기",
  approved: "승인완료",
  rejected: "거절",
};

const STATUS_CLASS: Record<LawyerDBStatus, string> = {
  pending: "bg-[#FEF3C7] text-[#B45309]",
  approved: "bg-[#ECFDF5] text-[#047857]",
  rejected: "bg-[#FEE2E2] text-[#DC2626]",
};

const ALL_SPECIALTIES = [
  "전체",
  "형사",
  "민사",
  "이혼",
  "부동산",
  "노동",
  "교통사고",
  "의료",
  "기업법무",
  "상속",
];

export default function AdminLawyersPage() {
  const [lawyers, setLawyers] = useState<LawyerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("전체");
  const [selected, setSelected] = useState<LawyerRow | null>(null);
  const [rejecting, setRejecting] = useState<LawyerRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lawyers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setToast({ message: error.message, type: "error" });
      setLawyers([]);
    } else {
      setLawyers((data ?? []) as LawyerRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return lawyers.filter((l) => {
      if (tab !== "all" && l.status !== tab) return false;
      if (specialty !== "전체" && !(l.specialty ?? []).includes(specialty))
        return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !l.name.toLowerCase().includes(q) &&
          !(l.firm ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [lawyers, tab, search, specialty]);

  async function approve(id: string) {
    const { error } = await supabase
      .from("lawyers")
      .update({ status: "approved", reject_reason: null })
      .eq("id", id);
    if (error) {
      setToast({ message: error.message, type: "error" });
      return;
    }
    setSelected(null);
    setToast({ message: "변호사가 승인되었습니다", type: "success" });
    void load();
  }

  async function confirmReject() {
    if (!rejecting) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setToast({ message: "거절 사유를 입력해주세요", type: "error" });
      return;
    }
    const { error } = await supabase
      .from("lawyers")
      .update({ status: "rejected", reject_reason: reason })
      .eq("id", rejecting.id);
    if (error) {
      setToast({ message: error.message, type: "error" });
      return;
    }
    setRejecting(null);
    setRejectReason("");
    setSelected(null);
    setToast({ message: "변호사 신청을 거절했습니다", type: "success" });
    void load();
  }

  const tabCounts: Record<TabKey, number> = {
    all: lawyers.length,
    pending: lawyers.filter((l) => l.status === "pending").length,
    approved: lawyers.filter((l) => l.status === "approved").length,
    rejected: lawyers.filter((l) => l.status === "rejected").length,
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[22px] lg:text-[26px] font-bold text-[#191F28] tracking-tight">
          변호사 관리
        </h1>
        <p className="mt-1.5 text-[14px] text-[#8B95A1] font-medium">
          신청·승인된 변호사를 관리하세요
        </p>
      </header>

      <div className="bg-white rounded-xl p-1 inline-flex gap-1 mb-4 shadow-[0_1px_2px_rgba(25,31,40,0.04)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`h-9 px-4 rounded-lg text-[13px] font-semibold transition-colors duration-200 ${
              tab === t.key
                ? "bg-[#4338CA] text-white"
                : "text-[#4E5968] hover:bg-[#F4F5F7]"
            }`}
          >
            {t.label}
            <span
              className={`ml-1.5 text-[11px] ${
                tab === t.key ? "text-white/80" : "text-[#8B95A1]"
              }`}
            >
              {tabCounts[t.key]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B95A1]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="11" cy="11" r="7" strokeLinejoin="round" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름·소속으로 검색"
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#E5E8EB] bg-white focus:border-[#4338CA] focus:outline-none focus:ring-4 focus:ring-[#4338CA]/14 text-[13px] font-medium text-[#191F28] placeholder:text-[#8B95A1] transition-all duration-200"
          />
        </div>
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="h-10 px-3 pr-8 rounded-lg border border-[#E5E8EB] bg-white focus:border-[#4338CA] focus:outline-none focus:ring-4 focus:ring-[#4338CA]/14 text-[13px] font-medium text-[#191F28] transition-all duration-200"
        >
          {ALL_SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              전문분야: {s}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(25,31,40,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[800px]">
            <thead>
              <tr className="bg-[#F8F9FA] text-left">
                <th className="px-4 py-3 font-semibold text-[#4E5968]">이름</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">소속</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">전문분야</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">경력</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">신청일</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968]">상태</th>
                <th className="px-4 py-3 font-semibold text-[#4E5968] text-right">
                  액션
                </th>
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
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-[13px] text-[#8B95A1] font-medium"
                  >
                    {lawyers.length === 0
                      ? "아직 등록된 변호사가 없습니다"
                      : "조건에 맞는 변호사가 없습니다"}
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((l, idx) => (
                  <tr
                    key={l.id}
                    className={`border-t border-[#F2F4F6] ${idx % 2 === 1 ? "bg-[#FBFCFD]" : ""}`}
                  >
                    <td className="px-4 py-3 font-bold text-[#191F28]">
                      {l.name}
                    </td>
                    <td className="px-4 py-3 text-[#4E5968]">{l.firm ?? "—"}</td>
                    <td className="px-4 py-3 text-[#4E5968]">
                      {(l.specialty ?? []).slice(0, 3).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-[#4E5968]">
                      {l.experience_years ?? 0}년
                    </td>
                    <td className="px-4 py-3 text-[#4E5968]">
                      {formatDate(l.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[11px] font-bold px-2 h-6 leading-6 rounded-full ${STATUS_CLASS[l.status]}`}
                      >
                        {STATUS_LABEL[l.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelected(l)}
                          className="h-8 px-3 rounded-lg bg-white border border-[#E5E8EB] hover:border-[#4338CA] hover:text-[#4338CA] text-[#4E5968] text-[12px] font-semibold transition-colors duration-200"
                        >
                          상세
                        </button>
                        {l.status !== "approved" && (
                          <button
                            type="button"
                            onClick={() => approve(l.id)}
                            className="h-8 px-3 rounded-lg bg-[#4338CA] hover:bg-[#6366F1] text-white text-[12px] font-semibold transition-colors duration-200"
                          >
                            승인
                          </button>
                        )}
                        {l.status !== "rejected" && (
                          <button
                            type="button"
                            onClick={() => {
                              setRejecting(l);
                              setRejectReason("");
                            }}
                            className="h-8 px-3 rounded-lg bg-white border border-[#E5E8EB] hover:border-[#EF4444] hover:text-[#EF4444] text-[#4E5968] text-[12px] font-semibold transition-colors duration-200"
                          >
                            거절
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal onClose={() => setSelected(null)} title="변호사 신청 상세">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="이름" value={selected.name} />
              <Field
                label="경력"
                value={`${selected.experience_years ?? 0}년`}
              />
              <Field label="소속" value={selected.firm ?? "—"} />
              <Field label="신청일" value={formatDate(selected.created_at)} />
              <Field
                label="등록번호"
                value={selected.bar_number ?? "—"}
              />
              <Field
                label="평점"
                value={`${selected.rating} (리뷰 ${selected.review_count}건)`}
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#8B95A1] mb-1">
                전문분야
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(selected.specialty ?? []).map((s) => (
                  <span
                    key={s}
                    className="text-[11px] font-semibold px-2 h-6 leading-6 rounded-full bg-[#EEF2FF] text-[#4338CA]"
                  >
                    {s}
                  </span>
                ))}
                {(selected.specialty ?? []).length === 0 && (
                  <span className="text-[12px] text-[#8B95A1]">—</span>
                )}
              </div>
            </div>
            {selected.bio && (
              <div>
                <p className="text-[11px] font-semibold text-[#8B95A1] mb-1">
                  소개
                </p>
                <p className="text-[13px] text-[#191F28] font-medium leading-[1.6] bg-[#F8F9FA] rounded-lg p-3">
                  {selected.bio}
                </p>
              </div>
            )}
            {selected.status === "rejected" && selected.reject_reason && (
              <div>
                <p className="text-[11px] font-semibold text-[#DC2626] mb-1">
                  거절 사유
                </p>
                <p className="text-[13px] text-[#191F28] font-medium leading-[1.6] bg-[#FEF2F2] rounded-lg p-3">
                  {selected.reject_reason}
                </p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              {selected.status !== "approved" && (
                <button
                  type="button"
                  onClick={() => approve(selected.id)}
                  className="flex-1 h-11 rounded-lg bg-[#4338CA] hover:bg-[#6366F1] text-white text-[14px] font-semibold transition-colors duration-200"
                >
                  승인
                </button>
              )}
              {selected.status !== "rejected" && (
                <button
                  type="button"
                  onClick={() => {
                    setRejecting(selected);
                    setRejectReason("");
                  }}
                  className="flex-1 h-11 rounded-lg bg-white border border-[#E5E8EB] hover:border-[#EF4444] hover:text-[#EF4444] text-[#4E5968] text-[14px] font-semibold transition-colors duration-200"
                >
                  거절
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {rejecting && (
        <Modal
          onClose={() => {
            setRejecting(null);
            setRejectReason("");
          }}
          title="거절 사유 입력"
        >
          <p className="text-[13px] text-[#4E5968] font-medium mb-3">
            <span className="font-bold text-[#191F28]">{rejecting.name}</span>{" "}
            변호사의 신청을 거절합니다. 사유를 입력해주세요.
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="예: 서류 미비 — 변호사 등록증 사본 미제출"
            className="w-full px-3 py-2.5 rounded-lg border border-[#E5E8EB] focus:border-[#4338CA] focus:outline-none focus:ring-4 focus:ring-[#4338CA]/14 text-[13px] font-medium text-[#191F28] placeholder:text-[#8B95A1] transition-all duration-200 resize-none"
          />
          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={() => {
                setRejecting(null);
                setRejectReason("");
              }}
              className="flex-1 h-11 rounded-lg bg-white border border-[#E5E8EB] hover:bg-[#F4F5F7] text-[#4E5968] text-[14px] font-semibold transition-colors duration-200"
            >
              취소
            </button>
            <button
              type="button"
              onClick={confirmReject}
              className="flex-1 h-11 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white text-[14px] font-semibold transition-colors duration-200"
            >
              거절 확정
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-[#8B95A1] mb-1">{label}</p>
      <p className="text-[13px] text-[#191F28] font-medium">{value}</p>
    </div>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-[500px] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F4F6] sticky top-0 bg-white">
          <h3 className="text-[16px] font-bold text-[#191F28]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
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
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
