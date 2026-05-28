"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import ScrollReveal from "@/components/ScrollReveal";
import Sparkline from "@/components/Sparkline";
import type { LawyerAccount } from "@/lib/types";
import type { MatchingRow } from "@/lib/supabase-types";

type Urgency = "high" | "medium" | "low";

interface CaseSummaryJson {
  caseType?: string;
  urgency?: Urgency;
  summary?: string;
  keyIssues?: string[];
  relevantLaws?: string[];
}

const URGENCY_BAR: Record<Urgency, string> = { high: "#dc2626", medium: "#d4a574", low: "#94a3b8" };
const URGENCY_LABEL: Record<Urgency, string> = { high: "긴급", medium: "보통", low: "여유" };
const METHOD_LABEL: Record<string, string> = { phone: "📞 전화", video: "📹 화상", inperson: "🤝 대면", chat: "💬 채팅" };

function getUrgency(cs: CaseSummaryJson | null): Urgency {
  return (cs?.urgency as Urgency) ?? "low";
}

export default function LawyerDashboardPage() {
  const router = useRouter();
  const { account, loading, signOut } = useAuth();
  const [matchings, setMatchings] = useState<MatchingRow[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [proposingId, setProposingId] = useState<string | null>(null);
  const [proposedIds, setProposedIds] = useState<Set<string>>(new Set());
  const [chatRoomCount, setChatRoomCount] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!account || account.type !== "lawyer") router.replace("/login?next=/lawyer/dashboard");
  }, [account, loading, router]);

  const lawyer = account?.type === "lawyer" ? (account as LawyerAccount) : null;

  const loadCases = useCallback(async () => {
    if (!lawyer) return;
    setLoadingCases(true);
    const { data } = await supabase
      .from("matchings")
      .select("*")
      .eq("status", "matching")
      .order("created_at", { ascending: false })
      .limit(20);
    setMatchings(data ?? []);
    setLoadingCases(false);
  }, [lawyer]);

  const loadChatCount = useCallback(async () => {
    if (!account) return;
    const { count } = await supabase
      .from("chat_rooms")
      .select("*", { count: "exact", head: true })
      .eq("lawyer_user_id", account.id);
    setChatRoomCount(count ?? 0);
  }, [account]);

  useEffect(() => {
    void loadCases();
    void loadChatCount();
  }, [loadCases, loadChatCount]);

  // Check which matchings this lawyer has already proposed
  useEffect(() => {
    if (!account) return;
    supabase
      .from("proposals")
      .select("matching_id")
      .in("lawyer_id", supabase.from("lawyers").select("id").eq("user_id", account.id) as never)
      .then(({ data }: { data: { matching_id: string | null }[] | null }) => {
        if (data) setProposedIds(new Set(data.map((r: { matching_id: string | null }) => r.matching_id ?? "")));
      });
  }, [account]);

  const today = useMemo(() => {
    const d = new Date();
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${days[d.getDay()]}`;
  }, []);

  if (loading || !account || account.type !== "lawyer") {
    return <div className="min-h-screen bg-surface-subtle" />;
  }

  const proposingCase = matchings.find((m) => m.id === proposingId) ?? null;
  const newCount = matchings.filter((m) => !proposedIds.has(m.id)).length;

  return (
    <main className="min-h-screen bg-surface-subtle page-enter">
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex flex-col bg-navy-900 text-white min-h-screen sticky top-0">
          <div className="px-7 py-8">
            <div className="text-[20px] font-bold tracking-luxe">
              법률<span className="text-gold">AI</span>
              <span className="ml-2 text-[10px] tracking-eyebrow text-gold">PARTNER</span>
            </div>
          </div>
          <nav className="px-4 space-y-1 flex-1">
            <SideLink active label="대시보드" />
            <SideLink label="채팅방" href="/chat/rooms" />
            <SideLink label="변호사 목록" href="/lawyers" />
          </nav>
          <div className="px-4 pb-7 pt-6">
            <div className="rounded-2xl bg-white/5 px-4 py-4 mb-3">
              <div className="text-[11px] tracking-eyebrow text-white/55">LOGGED IN</div>
              <div className="text-[15px] font-semibold mt-1 truncate">{lawyer?.name} 변호사</div>
              <div className="text-[12px] text-white/55 truncate mt-0.5">{lawyer?.email}</div>
            </div>
            <button
              onClick={() => { signOut(); router.push("/"); }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-medium text-white/65 hover:text-white hover:bg-white/5 transition-colors duration-500 ease-luxe"
            >
              로그아웃
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="min-h-screen pb-20">
          {/* Mobile header */}
          <header className="lg:hidden sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-surface-line pt-safe-top">
            <div className="max-w-md mx-auto h-14 px-6 flex items-center justify-between">
              <div className="text-[18px] font-bold tracking-luxe text-navy-900">
                법률<span className="text-gold">AI</span>
                <span className="ml-2 text-caption text-gold-700">PARTNER</span>
              </div>
              <Link href="/chat/rooms" className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-subtle">
                <svg className="w-5 h-5 text-navy-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {chatRoomCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{chatRoomCount}</span>}
              </Link>
            </div>
          </header>

          {/* Welcome */}
          <section className="bg-white border-b border-surface-line">
            <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10 lg:py-14">
              <p className="text-caption text-gold mb-3">PARTNER DASHBOARD</p>
              <h1 className="text-h1">안녕하세요, {lawyer?.name} 변호사님</h1>
              <p className="text-[14px] text-text-muted font-medium tracking-luxe mt-3">{today}</p>
              <div className="mt-10 lg:mt-12 grid grid-cols-3 gap-3 lg:gap-5">
                <StatCard label="신규 사건" value={newCount} unit="건" accent data={[2, 4, 3, 6, 5, 7, newCount]} />
                <StatCard label="채팅방" value={chatRoomCount} unit="개" data={[0, 1, 1, 2, 2, chatRoomCount, chatRoomCount]} />
                <StatCard label="이번 달 수임" value={proposedIds.size} unit="건" data={[0, 1, 1, 1, proposedIds.size, proposedIds.size, proposedIds.size]} />
              </div>
            </div>
          </section>

          {/* New cases */}
          <section className="max-w-5xl mx-auto px-6 lg:px-10 pt-12 lg:pt-16">
            <ScrollReveal className="flex items-end justify-between mb-7 lg:mb-9">
              <div>
                <p className="text-caption text-gold mb-2">NEW CASES</p>
                <h2 className="text-h2">새로 도착한 사건</h2>
              </div>
              <button onClick={loadCases} className="text-[14px] font-medium text-text-muted tracking-luxe hover:text-navy-900 transition-colors">
                새로고침
              </button>
            </ScrollReveal>

            {loadingCases ? (
              <div className="space-y-5">
                {[0, 1, 2].map((i) => <div key={i} className="surface-card h-[200px] animate-pulse" />)}
              </div>
            ) : matchings.length === 0 ? (
              <div className="surface-card p-10 text-center">
                <p className="text-[16px] text-text-muted font-medium">아직 새로운 사건이 없습니다</p>
                <p className="text-[13px] text-text-subtle mt-2">일반인이 AI 상담 후 매칭을 요청하면 여기에 표시됩니다</p>
              </div>
            ) : (
              <div className="space-y-5">
                {matchings.map((m, i) => {
                  const cs = m.case_summary as CaseSummaryJson | null;
                  const urgency = getUrgency(cs);
                  const proposed = proposedIds.has(m.id);
                  const timeAgo = formatTimeAgo(m.created_at);

                  return (
                    <ScrollReveal key={m.id} delay={i * 100}>
                      <article className="surface-card flex overflow-hidden">
                        <span className="w-1.5 shrink-0" style={{ backgroundColor: URGENCY_BAR[urgency] }} aria-hidden />
                        <div className="flex-1 p-7 lg:p-8">
                          <div className="flex items-center gap-2 mb-5 flex-wrap">
                            <span className="text-[12px] tracking-luxe px-3 h-7 leading-7 rounded-full bg-surface-subtle text-navy-900 font-semibold">{cs?.caseType ?? "법률"}</span>
                            <span className="text-[12px] tracking-luxe px-3 h-7 leading-7 rounded-full font-semibold" style={{ backgroundColor: `${URGENCY_BAR[urgency]}14`, color: URGENCY_BAR[urgency] }}>{URGENCY_LABEL[urgency]}</span>
                            <span className="text-[13px] text-text-muted ml-auto">{timeAgo}</span>
                          </div>

                          {cs?.summary && (
                            <div className="mb-6">
                              <div className="text-caption text-gold mb-2">AI SUMMARY</div>
                              <p className="text-[16px] text-navy-900 leading-[1.8]">{cs.summary}</p>
                            </div>
                          )}

                          {cs?.keyIssues && cs.keyIssues.length > 0 && (
                            <div className="mb-4">
                              <div className="text-caption text-gold mb-2">핵심 쟁점</div>
                              <ul className="space-y-1">
                                {cs.keyIssues.slice(0, 2).map((issue, idx) => (
                                  <li key={idx} className="text-[14px] text-navy-900 flex gap-2">
                                    <span className="text-gold shrink-0">•</span><span>{issue}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex items-center gap-5 text-[14px] mb-6 font-medium">
                            <div className="flex items-center gap-2">
                              <span className="text-text-muted tracking-luxe">희망 상담비</span>
                              <span className="text-cta-600 text-[18px] font-semibold">{Math.floor((m.fee_min ?? 50000) / 10000)}~{Math.floor((m.fee_max ?? 200000) / 10000)}만원</span>
                            </div>
                            <span className="text-surface-line">·</span>
                            <div className="flex items-center gap-2">
                              <span className="text-text-muted tracking-luxe">방식</span>
                              <span className="text-navy-900">{METHOD_LABEL[m.consultation_method ?? "phone"] ?? "전화"}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setProposingId(m.id)}
                            disabled={proposed}
                            className={`w-full sm:w-auto sm:min-w-[200px] h-11 px-7 rounded-full text-[15px] tracking-luxe transition-all duration-500 ease-luxe ${proposed ? "bg-surface-subtle text-text-muted cursor-default" : "btn-primary"}`}
                          >
                            {proposed ? "제안 완료" : "제안하기"}
                          </button>
                        </div>
                      </article>
                    </ScrollReveal>
                  );
                })}
              </div>
            )}

            <div className="mt-14 mb-10 rounded-3xl bg-white shadow-card p-7 lg:p-9 flex items-center justify-between gap-4">
              <div>
                <p className="text-h3">채팅으로 의뢰인과 소통하세요</p>
                <p className="text-body-muted mt-2 leading-[1.8]">매칭 완료 후 개설된 채팅방에서 의뢰인과 직접 소통합니다.</p>
              </div>
              <Link href="/chat/rooms" className="shrink-0 h-11 px-5 rounded-full btn-ghost text-[14px] tracking-luxe leading-[44px]">채팅 보기</Link>
            </div>
          </section>
        </div>
      </div>

      {proposingCase && account && (
        <ProposalModal
          targetCase={proposingCase}
          lawyerUserId={account.id}
          onClose={() => setProposingId(null)}
          onSubmit={(matchingId) => {
            setProposedIds((prev) => { const n = new Set(prev); n.add(matchingId); return n; });
            setProposingId(null);
          }}
        />
      )}
    </main>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function SideLink({ label, active, href }: { label: string; active?: boolean; href?: string }) {
  const cls = `w-full flex items-center justify-between px-4 py-3 rounded-xl text-[14px] font-medium tracking-luxe transition-colors duration-500 ease-luxe ${active ? "bg-white/10 text-white" : "text-white/65 hover:text-white hover:bg-white/5"}`;
  if (href) return <Link href={href} className={cls}><span>{label}</span><span className="text-white/40">→</span></Link>;
  return <button className={cls}><span>{label}</span>{active && <span className="w-1.5 h-1.5 rounded-full bg-gold" />}</button>;
}

function StatCard({ label, value, unit, accent, data }: { label: string; value: number; unit: string; accent?: boolean; data: number[] }) {
  return (
    <div className={`rounded-2xl px-5 py-6 lg:px-6 lg:py-7 ${accent ? "bg-navy-900 text-white shadow-card" : "bg-white shadow-card"}`}>
      <div className={`text-[12px] font-semibold tracking-luxe ${accent ? "text-white/55" : "text-text-muted"}`}>{label}</div>
      <div className="flex items-baseline gap-1 mt-3">
        <span className={`tracking-luxe ${accent ? "text-gold-grad" : "text-navy-900"}`} style={{ fontSize: 40 }}>{value}</span>
        <span className={`text-[14px] font-semibold ${accent ? "text-white/55" : "text-text-muted"}`}>{unit}</span>
      </div>
      <div className="mt-3 -mb-1">
        <Sparkline data={data} color={accent ? "#d4a574" : "#0f172a"} fill={accent ? "rgba(212, 165, 116, 0.18)" : "rgba(15, 23, 42, 0.08)"} />
      </div>
    </div>
  );
}

function ProposalModal({ targetCase, lawyerUserId, onClose, onSubmit }: {
  targetCase: MatchingRow; lawyerUserId: string; onClose: () => void; onSubmit: (matchingId: string) => void;
}) {
  const [fee, setFee] = useState(String(Math.floor((targetCase.fee_min ?? 50000) / 10000)));
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  async function handleSend() {
    setError(null);
    const f = Number(fee);
    if (!Number.isFinite(f) || f < 1) { setError("상담비를 올바르게 입력해주세요."); return; }
    if (!message.trim()) { setError("간단한 메시지를 입력해주세요."); return; }
    setSubmitting(true);

    // Get lawyer row id
    const { data: lawyerRows } = await supabase.from("lawyers").select("id").eq("user_id", lawyerUserId).limit(1);
    const lawyerId = lawyerRows?.[0]?.id;
    if (!lawyerId) { setError("변호사 정보를 찾을 수 없습니다."); setSubmitting(false); return; }

    const { error: insertErr } = await supabase.from("proposals").insert({
      matching_id: targetCase.id,
      lawyer_id: lawyerId,
      fee: String(f),
      message: message.trim(),
      selected: false,
    });

    if (insertErr) { setError(insertErr.message); setSubmitting(false); return; }
    onSubmit(targetCase.id);
  }

  const cs = targetCase.case_summary as { caseType?: string; summary?: string } | null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/50 backdrop-blur-md animate-fade-in">
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-elevated max-h-[92vh] overflow-y-auto banner-slide-up sm:animate-fade-up">
        <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full hover:bg-surface-subtle text-text-muted hover:text-navy-900 flex items-center justify-center text-2xl leading-none transition-colors duration-500 ease-luxe z-10" aria-label="닫기">×</button>
        <div className="p-7 lg:p-9 pt-10 space-y-5">
          <div>
            <p className="text-caption text-gold mb-2">SEND PROPOSAL</p>
            <h2 className="text-h2">사건에 제안 보내기</h2>
            <p className="text-[14px] text-text-muted font-medium mt-2">{cs?.caseType ?? "법률"} · 희망 {Math.floor((targetCase.fee_min ?? 50000) / 10000)}~{Math.floor((targetCase.fee_max ?? 200000) / 10000)}만원</p>
          </div>
          {cs?.summary && <div className="rounded-2xl bg-surface-subtle px-4 py-4 text-[15px] text-navy-900 leading-[1.8]">{cs.summary}</div>}
          <div>
            <div className="text-caption text-text-muted mb-2">상담비 제안 (만원)</div>
            <div className="relative">
              <input type="number" min={1} value={fee} onChange={(e) => setFee(e.target.value)} className="surface-input--soft w-full h-12 pl-4 pr-16 rounded-xl text-[15px] font-medium text-navy-900" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-medium text-text-muted tracking-luxe">만원</span>
            </div>
          </div>
          <div>
            <div className="text-caption text-text-muted mb-2">한줄 메시지</div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="유사 사건 경험과 대응 방향을 간단히 적어주세요." rows={3} className="surface-input--soft w-full px-4 py-3 rounded-xl text-[15px] text-navy-900 placeholder:text-text-subtle font-medium resize-none leading-[1.7]" />
          </div>
          {error && <div className="text-[13px] text-danger bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">{error}</div>}
          <button onClick={handleSend} disabled={submitting} className="w-full h-12 rounded-2xl btn-primary text-[15px] tracking-luxe disabled:opacity-50">{submitting ? "전송 중..." : "제안 보내기"}</button>
        </div>
      </div>
    </div>
  );
}
