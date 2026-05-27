"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/admin-data";
import type { LawyerRow } from "@/lib/supabase-types";
import Toast from "@/components/admin/Toast";

interface RecentConsult {
  id: string;
  category: string | null;
  title: string | null;
  created_at: string;
  analysis_complete: boolean;
}

interface DashStats {
  todayConsultations: number;
  matchingsToday: number;
  approvedLawyers: number;
  pendingLawyers: number;
  newUsers: number;
  weekChart: { day: string; count: number }[];
  recentConsults: RecentConsult[];
  pending: LawyerRow[];
}

function todayStartISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function buildWeekBuckets(): { day: string; key: string }[] {
  const KOR = ["일", "월", "화", "수", "목", "금", "토"];
  const out: { day: string; key: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    out.push({
      day: KOR[d.getDay()],
      key: d.toISOString().slice(0, 10),
    });
  }
  return out;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const today = todayStartISO();
    const weekStart = (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - 6);
      return d.toISOString();
    })();

    const [
      todayCount,
      matchToday,
      lawyerStatuses,
      newUsersCount,
      weekConsults,
      recent,
      pending,
    ] = await Promise.all([
      supabase
        .from("consultations")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today),
      supabase
        .from("matchings")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today)
        .eq("status", "matched"),
      supabase.from("lawyers").select("status"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today),
      supabase
        .from("consultations")
        .select("created_at")
        .gte("created_at", weekStart),
      supabase
        .from("consultations")
        .select("id, category, title, created_at, analysis_complete")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("lawyers")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const buckets = buildWeekBuckets();
    const dayCounts: Record<string, number> = Object.fromEntries(
      buckets.map((b) => [b.key, 0]),
    );
    for (const row of weekConsults.data ?? []) {
      const key = row.created_at.slice(0, 10);
      if (key in dayCounts) dayCounts[key] += 1;
    }

    const lawyerRows = (lawyerStatuses.data ?? []) as { status: string }[];
    setStats({
      todayConsultations: todayCount.count ?? 0,
      matchingsToday: matchToday.count ?? 0,
      approvedLawyers: lawyerRows.filter((l) => l.status === "approved").length,
      pendingLawyers: lawyerRows.filter((l) => l.status === "pending").length,
      newUsers: newUsersCount.count ?? 0,
      weekChart: buckets.map((b) => ({ day: b.day, count: dayCounts[b.key] })),
      recentConsults: (recent.data ?? []) as RecentConsult[],
      pending: (pending.data ?? []) as LawyerRow[],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    const { error } = await supabase
      .from("lawyers")
      .update({ status: "approved", reject_reason: null })
      .eq("id", id);
    if (error) {
      setToast({ message: error.message, type: "error" });
      return;
    }
    setToast({ message: "변호사가 승인되었습니다", type: "success" });
    void load();
  }
  async function confirmReject() {
    if (!rejectingId) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setToast({ message: "거절 사유를 입력해주세요", type: "error" });
      return;
    }
    const { error } = await supabase
      .from("lawyers")
      .update({ status: "rejected", reject_reason: reason })
      .eq("id", rejectingId);
    if (error) {
      setToast({ message: error.message, type: "error" });
      return;
    }
    setRejectingId(null);
    setRejectReason("");
    setToast({ message: "변호사 신청을 거절했습니다", type: "success" });
    void load();
  }

  return (
    <div>
      <header className="mb-6 lg:mb-8">
        <h1 className="text-[22px] lg:text-[26px] font-bold text-[#191F28] tracking-tight">
          대시보드
        </h1>
        <p className="mt-1.5 text-[14px] text-[#8B95A1] font-medium">
          오늘의 서비스 현황을 한 눈에 확인하세요
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <StatCard
          label="오늘 상담 수"
          value={stats?.todayConsultations ?? 0}
          suffix="건"
          loading={loading}
        />
        <StatCard
          label="매칭 완료"
          value={stats?.matchingsToday ?? 0}
          suffix="건"
          loading={loading}
        />
        <StatCard
          label="등록 변호사"
          value={stats?.approvedLawyers ?? 0}
          suffix="명"
          badge={
            stats?.pendingLawyers && stats.pendingLawyers > 0
              ? `승인 대기 ${stats.pendingLawyers}`
              : undefined
          }
          loading={loading}
        />
        <StatCard
          label="신규 가입"
          value={stats?.newUsers ?? 0}
          suffix="명"
          loading={loading}
        />
      </div>

      <section className="bg-white rounded-xl p-5 lg:p-6 shadow-[0_1px_2px_rgba(25,31,40,0.04)] mb-6 lg:mb-8">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-[16px] lg:text-[17px] font-bold text-[#191F28]">
              최근 7일 상담 추이
            </h2>
            <p className="mt-1 text-[12px] text-[#8B95A1] font-medium">
              일별 상담 건수
            </p>
          </div>
        </div>
        <BarChart data={stats?.weekChart ?? []} loading={loading} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <section className="bg-white rounded-xl p-5 lg:p-6 shadow-[0_1px_2px_rgba(25,31,40,0.04)]">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-[16px] lg:text-[17px] font-bold text-[#191F28]">
              최근 상담
            </h2>
            <Link
              href="/admin/consultations"
              className="text-[13px] font-semibold text-[#4338CA] hover:text-[#6366F1] transition-colors duration-200"
            >
              전체보기
            </Link>
          </div>
          {loading ? (
            <SkeletonRows />
          ) : (stats?.recentConsults.length ?? 0) === 0 ? (
            <Empty>최근 상담이 없습니다</Empty>
          ) : (
            <ul className="divide-y divide-[#F2F4F6]">
              {stats!.recentConsults.map((c) => (
                <li key={c.id} className="py-3 flex items-center gap-3">
                  <span
                    className="text-[11px] font-bold px-2 h-6 leading-6 rounded-full shrink-0"
                    style={{ backgroundColor: "#EEF2FF", color: "#4338CA" }}
                  >
                    {c.category ?? "법률"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] lg:text-[14px] font-semibold text-[#191F28] truncate">
                      {c.title ?? "(제목 없음)"}
                    </p>
                    <p className="text-[11px] text-[#8B95A1] font-medium mt-0.5">
                      {formatDate(c.created_at)}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 h-6 leading-6 rounded-full shrink-0 ${
                      c.analysis_complete
                        ? "bg-[#EEF2FF] text-[#4338CA]"
                        : "bg-[#F4F5F7] text-[#8B95A1]"
                    }`}
                  >
                    {c.analysis_complete ? "분석완료" : "진행중"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl p-5 lg:p-6 shadow-[0_1px_2px_rgba(25,31,40,0.04)]">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-[16px] lg:text-[17px] font-bold text-[#191F28]">
              승인 대기 변호사
            </h2>
            <Link
              href="/admin/lawyers"
              className="text-[13px] font-semibold text-[#4338CA] hover:text-[#6366F1] transition-colors duration-200"
            >
              전체보기
            </Link>
          </div>
          {loading ? (
            <SkeletonRows />
          ) : (stats?.pending.length ?? 0) === 0 ? (
            <Empty>승인 대기 중인 신청이 없습니다</Empty>
          ) : (
            <ul className="space-y-3">
              {stats!.pending.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg bg-[#F8F9FA]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-[#191F28] truncate">
                      {l.name}{" "}
                      <span className="text-[#8B95A1] font-medium text-[12px]">
                        · {(l.specialty ?? []).slice(0, 2).join("·")}
                      </span>
                    </p>
                    <p className="text-[11px] text-[#8B95A1] font-medium mt-0.5">
                      {formatDate(l.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => approve(l.id)}
                    className="shrink-0 h-8 px-3 rounded-lg bg-[#4338CA] hover:bg-[#6366F1] text-white text-[12px] font-semibold transition-colors duration-200"
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRejectingId(l.id); setRejectReason(""); }}
                    className="shrink-0 h-8 px-3 rounded-lg bg-white border border-[#E5E8EB] hover:border-[#EF4444] hover:text-[#EF4444] text-[#4E5968] text-[12px] font-semibold transition-colors duration-200"
                  >
                    거절
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-[440px]"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F4F6]">
              <h3 className="text-[16px] font-bold text-[#191F28]">거절 사유 입력</h3>
              <button
                type="button"
                onClick={() => { setRejectingId(null); setRejectReason(""); }}
                className="w-8 h-8 -mr-2 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] text-[#8B95A1]"
                aria-label="닫기"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-[13px] text-[#4E5968] font-medium">
                변호사 신청을 거절합니다. 사유를 입력해주세요.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="예: 서류 미비 — 변호사 등록증 사본 미제출"
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5E8EB] focus:border-[#4338CA] focus:outline-none focus:ring-4 focus:ring-[#4338CA]/14 text-[13px] font-medium text-[#191F28] placeholder:text-[#8B95A1] transition-all duration-200 resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setRejectingId(null); setRejectReason(""); }}
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
            </div>
          </div>
        </div>
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

function StatCard({
  label,
  value,
  suffix,
  badge,
  loading,
}: {
  label: string;
  value: number;
  suffix?: string;
  badge?: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl p-4 lg:p-5 shadow-[0_1px_2px_rgba(25,31,40,0.04)]">
      <div className="flex items-start justify-between">
        <p className="text-[12px] lg:text-[13px] text-[#8B95A1] font-semibold">
          {label}
        </p>
        {badge && (
          <span className="text-[10px] font-bold px-1.5 h-5 leading-5 rounded-full bg-[#FEE2E2] text-[#DC2626]">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        {loading ? (
          <div className="h-8 lg:h-9 w-20 bg-[#F4F5F7] rounded animate-pulse" />
        ) : (
          <span className="text-[24px] lg:text-[28px] font-bold text-[#191F28] tracking-tight text-mono-num">
            {value.toLocaleString("ko-KR")}
          </span>
        )}
        {!loading && suffix && (
          <span className="text-[13px] text-[#8B95A1] font-semibold">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function BarChart({
  data,
  loading,
}: {
  data: { day: string; count: number }[];
  loading?: boolean;
}) {
  if (loading) {
    return <div className="h-36 lg:h-40 bg-[#F4F5F7] rounded animate-pulse" />;
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-2 lg:gap-3 h-36 lg:h-40">
      {data.map((d, i) => {
        const heightPct = (d.count / max) * 100;
        return (
          <div key={`${d.day}-${i}`} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex flex-col items-center justify-end flex-1">
              <span className="text-[11px] font-bold text-[#4E5968] mb-1">
                {d.count}
              </span>
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-[#4338CA] to-[#6366F1] transition-all duration-700"
                style={{ height: `${Math.max(2, heightPct)}%` }}
              />
            </div>
            <span className="text-[12px] font-medium text-[#8B95A1]">{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 bg-[#F4F5F7] rounded animate-pulse" />
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-8 text-center text-[13px] text-[#8B95A1] font-medium">
      {children}
    </p>
  );
}
