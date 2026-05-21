"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  deleteConsultation,
  listConsultations,
} from "@/lib/storage";
import {
  deleteMatchingSession,
  listMatchingSessions,
} from "@/lib/matching-storage";
import { getLawyerById } from "@/lib/lawyers";
import { formatRelativeTime } from "@/lib/markdown";
import Footer from "@/components/Footer";
import { useAuth } from "@/components/AuthProvider";
import type { Consultation, MatchingSession } from "@/lib/types";

type TabKey = "all" | "ai" | "matching" | "done";

interface Row {
  consultation: Consultation;
  session: MatchingSession | null;
  status: "ai" | "matching" | "done";
  statusLabel: string;
  statusClasses: string;
}

function deriveStatus(
  c: Consultation,
  s: MatchingSession | null,
): {
  status: "ai" | "matching" | "done";
  statusLabel: string;
  statusClasses: string;
} {
  if (s?.status === "selected") {
    return {
      status: "done",
      statusLabel: "매칭완료",
      statusClasses: "bg-gold/10 text-gold border-gold/30",
    };
  }
  if (s?.status === "matching") {
    return {
      status: "matching",
      statusLabel: "매칭중",
      statusClasses: "bg-success/10 text-success border-success/30",
    };
  }
  return {
    status: "ai",
    statusLabel: "AI상담중",
    statusClasses: "bg-ink-3 text-bone-200 border-ink-4",
  };
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "ai", label: "AI상담중" },
  { key: "matching", label: "매칭중" },
  { key: "done", label: "매칭완료" },
];

const GUEST_PROFILE = {
  name: "게스트",
  email: "로그인하시면 상담 내역을 안전하게 보관할 수 있어요",
};

export default function MyPageWrapper() {
  return (
    <Suspense fallback={null}>
      <MyPage />
    </Suspense>
  );
}

function MyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { account, signOut } = useAuth();
  const PROFILE = account
    ? { name: account.name, email: account.email }
    : GUEST_PROFILE;
  const initialTab = (searchParams.get("tab") ?? "all") as TabKey;
  const [tab, setTab] = useState<TabKey>(
    TABS.some((t) => t.key === initialTab) ? initialTab : "all",
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [mounted, setMounted] = useState(false);

  function reload() {
    const items = listConsultations();
    const sessions = listMatchingSessions();
    const map: Record<string, MatchingSession> = {};
    for (const s of sessions) map[s.consultationId] = s;
    const built: Row[] = items.map((c) => {
      const s = map[c.id] ?? null;
      const status = deriveStatus(c, s);
      return { consultation: c, session: s, ...status };
    });
    setRows(built);
  }

  useEffect(() => {
    reload();
    setMounted(true);
  }, []);

  const filtered = useMemo(() => {
    if (tab === "all") return rows;
    return rows.filter((r) => r.status === tab);
  }, [tab, rows]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      ai: rows.filter((r) => r.status === "ai").length,
      matching: rows.filter((r) => r.status === "matching").length,
      done: rows.filter((r) => r.status === "done").length,
    }),
    [rows],
  );

  function handleDelete(id: string) {
    if (!confirm("이 상담 기록을 삭제하시겠습니까?")) return;
    deleteConsultation(id);
    deleteMatchingSession(id);
    reload();
  }

  function handleTabChange(next: TabKey) {
    setTab(next);
    const url = next === "all" ? "/mypage" : `/mypage?tab=${next}`;
    router.replace(url);
  }

  return (
    <main className="min-h-screen bg-surface-subtle page-enter">
      <header className="lg:hidden sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-surface-line pt-safe-top">
        <div className="max-w-md mx-auto px-6 h-14 flex items-center justify-between">
          <h1 className="text-h2">마이</h1>
          {account ? (
            <button
              className="text-[12px] text-bone-500 hover:text-danger tracking-luxe transition-colors duration-500 ease-luxe"
              onClick={() => {
                signOut();
                router.push("/");
              }}
            >
              로그아웃
            </button>
          ) : (
            <Link
              href="/login?next=%2Fmypage"
              className="text-[12px] text-gold hover:text-gold-light tracking-luxe"
            >
              로그인
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto lg:max-w-screen-xl lg:px-10 lg:py-12 lg:grid lg:grid-cols-[300px_1fr] lg:gap-10">
        <aside className="lg:sticky lg:top-24 lg:self-start lg:space-y-5">
          <section className="px-6 pt-10 lg:px-0 lg:pt-0">
            <div className="bg-navy-900 text-white rounded-3xl p-7 lg:p-8 relative overflow-hidden shadow-card">
              <span className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gold/15 blur-2xl" />
              <div className="relative flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-[20px] font-bold text-gold">
                  {PROFILE.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="text-caption text-gold">HELLO</div>
                  <div className="text-h3 text-white leading-tight mt-1">
                    {PROFILE.name}님
                  </div>
                  <div className="text-[12px] text-white/65 truncate mt-1 font-medium">
                    {PROFILE.email}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 mt-7">
                <ProfileStat label="전체" value={counts.all} />
                <ProfileStat label="매칭중" value={counts.matching} />
                <ProfileStat label="완료" value={counts.done} />
              </div>
            </div>
          </section>

          <nav className="hidden lg:block bg-white shadow-card rounded-2xl p-2">
            {TABS.map((t) => {
              const active = tab === t.key;
              const count = counts[t.key];
              return (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key)}
                  className={`w-full flex items-center justify-between text-[15px] font-semibold tracking-luxe px-4 py-3 rounded-xl transition-all duration-500 ease-luxe ${
                    active
                      ? "bg-navy-900 text-white"
                      : "text-text-muted hover:text-navy-900 hover:bg-surface-subtle"
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`text-[13px] font-bold ${
                      active ? "text-white/65" : "text-text-muted"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>

          {account ? (
            <button
              className="hidden lg:block w-full text-[12px] text-bone-500 hover:text-danger py-3 tracking-luxe transition-colors duration-500 ease-luxe"
              onClick={() => {
                signOut();
                router.push("/");
              }}
            >
              로그아웃
            </button>
          ) : (
            <Link
              href="/login?next=%2Fmypage"
              className="hidden lg:block w-full text-center text-[12px] font-light text-gold hover:text-gold-light py-3 tracking-luxe"
            >
              로그인하여 상담 보관하기
            </Link>
          )}
        </aside>

        <div className="min-w-0">
          <section className="px-5 pt-7 lg:hidden">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {TABS.map((t) => {
                const active = tab === t.key;
                const count = counts[t.key];
                return (
                  <button
                    key={t.key}
                    onClick={() => handleTabChange(t.key)}
                    className={`shrink-0 text-[14px] font-semibold tracking-luxe px-4 h-10 rounded-full transition-all duration-500 ease-luxe ${
                      active
                        ? "bg-navy-900 text-white"
                        : "bg-white shadow-sm text-text-muted hover:text-navy-900"
                    }`}
                  >
                    {t.label}
                    <span
                      className={`ml-1.5 text-[12px] font-bold ${
                        active ? "text-white/65" : "text-text-muted"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="hidden lg:flex items-baseline justify-between mb-8">
            <h2 className="text-section text-bone-50">
              {TABS.find((t) => t.key === tab)?.label} 상담 내역
            </h2>
            <span className="text-[13px] text-bone-500 tracking-luxe">
              {filtered.length}건
            </span>
          </div>

          <section className="px-5 pt-5 pb-12 lg:px-0 lg:pt-0">
            {!mounted ? null : filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="space-y-3">
                {filtered.map((row) => (
                  <ConsultationRow
                    key={row.consultation.id}
                    row={row}
                    onDelete={() => handleDelete(row.consultation.id)}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl py-3 text-center">
      <div className="text-mono-num text-[22px] font-bold text-white">
        {value}
      </div>
      <div className="text-[11px] text-white/65 font-semibold tracking-luxe mt-1">
        {label}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-ink-2 border border-dashed border-ink-3 rounded-2xl p-10 text-center">
      <div className="text-3xl mb-3 text-gold">✦</div>
      <p className="text-[16px] text-bone-50 font-normal mb-2">
        아직 상담 내역이 없습니다
      </p>
      <p className="text-[14px] text-bone-300 mb-6 font-light">
        AI 법률상담을 시작해보세요.
      </p>
      <Link
        href="/"
        className="inline-block text-[15px] tracking-luxe px-5 h-11 leading-[44px] rounded-full btn-gold"
      >
        새 상담 시작하기
      </Link>
    </div>
  );
}

function ConsultationRow({
  row,
  onDelete,
}: {
  row: Row;
  onDelete: () => void;
}) {
  const { consultation: c, session, status, statusLabel, statusClasses } = row;
  const selectedLawyer = session?.selectedLawyerId
    ? getLawyerById(session.selectedLawyerId)
    : null;
  const href = status === "ai" ? `/chat/${c.id}` : `/matching/${c.id}`;
  const proposalCount = session?.proposals.length ?? 0;

  return (
    <li className="surface-card rounded-2xl group overflow-hidden">
      <Link href={href} className="block px-6 py-5">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-[10px] tracking-eyebrow px-2.5 h-6 leading-6 rounded-full border ${statusClasses}`}
          >
            {statusLabel}
          </span>
          {c.category && (
            <span className="text-[10px] tracking-luxe px-2 h-6 leading-6 rounded bg-ink-3 text-bone-300">
              {c.category}
            </span>
          )}
          <span className="text-[10px] text-bone-500 ml-auto">
            {formatRelativeTime(c.updatedAt)}
          </span>
        </div>
        <div className="text-[14px] font-light text-bone-50 line-clamp-1 leading-relaxed">
          {c.title}
        </div>
        <div className="mt-1.5 text-[11px] text-bone-500 flex items-center gap-2 flex-wrap font-light">
          <span>메시지 {c.messages.length}개</span>
          {status === "matching" && (
            <span className="text-gold">· 제안 {proposalCount}건 도착</span>
          )}
          {status === "done" && selectedLawyer && (
            <span className="text-gold">· {selectedLawyer.name} 변호사</span>
          )}
        </div>
      </Link>
      <div className="border-t border-ink-3 px-3 py-1.5 flex justify-end">
        <button
          onClick={onDelete}
          className="text-[13px] text-bone-300 hover:text-danger px-3 py-1.5 rounded-md transition-colors duration-500 ease-luxe"
        >
          삭제
        </button>
      </div>
    </li>
  );
}
