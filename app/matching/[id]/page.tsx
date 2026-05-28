"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getConsultation } from "@/lib/storage";
import {
  createEmptySession,
  getMatchingSession,
  upsertMatchingSession,
} from "@/lib/matching-storage";
import { generateProposals, getLawyerById } from "@/lib/lawyers";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import AuthModal from "@/components/AuthModal";
import type {
  CaseSummary,
  Consultation,
  ConsultationMethod,
  Lawyer,
  LawyerProposal,
  MatchingSession,
  Urgency,
} from "@/lib/types";
import type { LawyerRow, ProposalRow } from "@/lib/supabase-types";

const TOTAL_PROPOSALS = 5;
const FEE_FLOOR = 10_000;
const FEE_CEILING = 500_000;
const FEE_STEP = 10_000;

function formatKRW(n: number): string {
  if (n >= 10_000) {
    const man = n / 10_000;
    return Number.isInteger(man) ? `${man}만원` : `${man.toFixed(1)}만원`;
  }
  return `${n.toLocaleString("ko-KR")}원`;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const URGENCY_META: Record<Urgency, { label: string; classes: string }> = {
  low: { label: "낮음", classes: "bg-brand-50 text-brand-700 border-brand-200" },
  medium: { label: "보통", classes: "bg-accent-50 text-accent-600 border-accent-200" },
  high: { label: "높음", classes: "bg-red-50 text-red-700 border-red-200" },
};

const METHOD_OPTIONS: { value: ConsultationMethod; label: string; icon: string }[] = [
  { value: "phone", label: "전화", icon: "📞" },
  { value: "video", label: "화상", icon: "📹" },
  { value: "inperson", label: "대면", icon: "🤝" },
  { value: "chat", label: "채팅", icon: "💬" },
];

const STEP_LABELS = ["사건요약", "변호사 매칭중", "선택완료"];

/* Supabase proposal → LawyerProposal adapter */
async function adaptDbProposal(
  row: ProposalRow,
): Promise<{ proposal: LawyerProposal; lawyer: LawyerRow } | null> {
  if (!row.lawyer_id) return null;
  const { data: lawyer } = await supabase
    .from("lawyers")
    .select("*")
    .eq("id", row.lawyer_id)
    .maybeSingle();
  if (!lawyer) return null;
  return {
    proposal: {
      id: row.id,
      lawyerId: `db:${lawyer.id}`,
      fee: Number(row.fee ?? 0) * 10_000,
      message: row.message ?? "",
      arrivedAt: new Date(row.created_at).getTime(),
    },
    lawyer: lawyer as LawyerRow,
  };
}

export default function MatchingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { account, loading: authLoading } = useAuth();
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [session, setSession] = useState<MatchingSession | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [detailLawyer, setDetailLawyer] = useState<Lawyer | null>(null);
  const [detailDbLawyer, setDetailDbLawyer] = useState<LawyerRow | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Supabase matching record id
  const dbMatchingIdRef = useRef<string | null>(null);
  // Real proposals from DB keyed by proposal row id
  const dbProposalsRef = useRef<Map<string, { proposal: LawyerProposal; lawyer: LawyerRow }>>(new Map());

  const summaryRequestedRef = useRef(false);
  const simulationTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!account) setAuthPromptOpen(true);
    else setAuthPromptOpen(false);
  }, [account, authLoading]);

  useEffect(() => {
    const c = getConsultation(id);
    setConsultation(c);
    const existing = getMatchingSession(id);
    let initial = existing ?? createEmptySession(id);
    if (initial.feeRange.max > FEE_CEILING) {
      initial = { ...initial, feeRange: { min: 50_000, max: 200_000 } };
    }
    setSession(initial);
    setMounted(true);
  }, [id]);

  useEffect(() => {
    if (!session) return;
    upsertMatchingSession(session);
  }, [session]);

  const fetchSummary = useCallback(async (target: MatchingSession, source: Consultation) => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/case-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: source.messages.map((m) => ({ role: m.role, content: m.content })) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `요약 실패 (${res.status})`);
      }
      const data = (await res.json()) as { summary: CaseSummary };
      setSession({ ...target, caseSummary: data.summary, updatedAt: Date.now() });
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "요약 생성 중 오류가 발생했습니다.");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !session || !consultation) return;
    if (session.status !== "summary") return;
    if (session.caseSummary) return;
    if (summaryRequestedRef.current) return;
    summaryRequestedRef.current = true;
    void fetchSummary(session, consultation);
  }, [mounted, session, consultation, fetchSummary]);

  useEffect(() => {
    if (!session || session.status !== "matching" || !session.startedAt) return;
    const tick = () => {
      setElapsed(Math.floor((Date.now() - session.startedAt!) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session?.status, session?.startedAt]);

  /* Supabase Realtime: subscribe to proposals for this matching */
  const subscribeToProposals = useCallback((matchingId: string) => {
    if (realtimeRef.current) {
      void supabase.removeChannel(realtimeRef.current);
    }
    const ch = supabase
      .channel(`proposals:${matchingId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "proposals", filter: `matching_id=eq.${matchingId}` },
        async (payload: { new: Record<string, unknown> }) => {
          const row = payload.new as unknown as ProposalRow;
          const adapted = await adaptDbProposal(row);
          if (!adapted) return;
          dbProposalsRef.current.set(row.id, adapted);
          setSession((prev) => {
            if (!prev || prev.status !== "matching") return prev;
            if (prev.proposals.some((p) => p.id === adapted.proposal.id)) return prev;
            return {
              ...prev,
              proposals: [...prev.proposals, adapted.proposal],
              updatedAt: Date.now(),
            };
          });
        },
      )
      .subscribe();
    realtimeRef.current = ch;
  }, []);

  useEffect(() => {
    return () => {
      if (realtimeRef.current) void supabase.removeChannel(realtimeRef.current);
    };
  }, []);

  /* Start simulation for demo (runs alongside real proposals) */
  useEffect(() => {
    if (!session || session.status !== "matching") return;

    const remaining = TOTAL_PROPOSALS - session.proposals.filter((p) => !p.id.startsWith("db:")).length;
    if (remaining <= 0) return;

    const queued = generateProposals({
      count: remaining,
      feeMin: session.feeRange.min,
      feeMax: session.feeRange.max,
      preferredSpecialty: session.caseSummary?.caseType,
    });

    const interestSteps = [
      { delay: 1200, value: 2 },
      { delay: 2500, value: 4 },
      { delay: 4200, value: 7 },
      { delay: 7000, value: 10 },
      { delay: 11000, value: 14 },
      { delay: 16000, value: 18 },
    ];
    interestSteps.forEach(({ delay, value }) => {
      const t = setTimeout(() => {
        setSession((prev) => {
          if (!prev || prev.status !== "matching") return prev;
          if (prev.interestCount >= value) return prev;
          return { ...prev, interestCount: value, updatedAt: Date.now() };
        });
      }, delay);
      simulationTimers.current.push(t);
    });

    const proposalDelays = [3800, 6500, 9500, 13000, 17500];
    queued.forEach((proposal, idx) => {
      const delay = proposalDelays[idx] ?? 4000 + idx * 3000;
      const t = setTimeout(() => {
        setSession((prev) => {
          if (!prev || prev.status !== "matching") return prev;
          if (prev.proposals.length >= TOTAL_PROPOSALS) return prev;
          if (prev.proposals.some((p) => p.lawyerId === proposal.lawyerId)) return prev;
          return { ...prev, proposals: [...prev.proposals, proposal], updatedAt: Date.now() };
        });
      }, delay);
      simulationTimers.current.push(t);
    });

    return () => {
      simulationTimers.current.forEach(clearTimeout);
      simulationTimers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status]);

  if (!mounted) return null;

  if (!consultation) {
    return (
      <main className="flex flex-col h-screen items-center justify-center px-6 text-center page-enter">
        <h1 className="font-bold text-xl text-primary-900 mb-3">상담을 찾을 수 없습니다</h1>
        <p className="text-primary-600 mb-6">해당 상담 내역이 존재하지 않습니다.</p>
        <Link href="/" className="px-4 py-2 rounded-lg bg-primary-900 text-white">홈으로</Link>
      </main>
    );
  }

  if (!session) return null;

  const currentStep = session.status === "summary" ? 1 : session.status === "matching" ? 2 : 3;

  async function startMatching() {
    if (!session) return;
    setElapsed(0);

    const newSession = {
      ...session,
      status: "matching" as const,
      startedAt: Date.now(),
      interestCount: 0,
      proposals: [],
      updatedAt: Date.now(),
    };
    setSession(newSession);

    // Persist to Supabase if logged in
    if (account) {
      const { data } = await supabase.from("matchings").insert({
        consultation_id: id,
        user_id: account.id,
        status: "matching",
        case_summary: session.caseSummary as never,
        fee_min: session.feeRange.min,
        fee_max: session.feeRange.max,
        consultation_method: session.consultationMethod,
      }).select("id").single();
      if (data?.id) {
        dbMatchingIdRef.current = data.id;
        subscribeToProposals(data.id);
      }
    }
  }

  function cancelMatching() {
    if (!session) return;
    simulationTimers.current.forEach(clearTimeout);
    simulationTimers.current = [];
    if (realtimeRef.current) {
      void supabase.removeChannel(realtimeRef.current);
      realtimeRef.current = null;
    }
    setSession({
      ...session,
      status: "summary",
      startedAt: null,
      interestCount: 0,
      proposals: [],
      updatedAt: Date.now(),
    });
  }

  async function selectLawyer(lawyerId: string) {
    if (!session) return;

    // If real proposal selected, update Supabase and create chat room
    if (lawyerId.startsWith("db:") && account) {
      const realLawyerId = lawyerId.slice(3);
      const matchingId = dbMatchingIdRef.current;

      // Find the proposal row id
      const dbEntry = Array.from(dbProposalsRef.current.values()).find(
        (e) => e.lawyer.id === realLawyerId,
      );

      if (matchingId) {
        await supabase.from("matchings").update({ status: "matched" }).eq("id", matchingId);
      }

      if (dbEntry && matchingId) {
        const proposalRowId = Array.from(dbProposalsRef.current.entries()).find(
          ([, v]) => v.lawyer.id === realLawyerId,
        )?.[0];
        if (proposalRowId) {
          await supabase.from("proposals").update({ selected: true }).eq("id", proposalRowId);
        }

        // Create chat room
        const lawyerRow = dbEntry.lawyer;
        if (lawyerRow.user_id) {
          const { data: room } = await supabase.from("chat_rooms").insert({
            matching_id: matchingId,
            user_id: account.id,
            lawyer_user_id: lawyerRow.user_id,
            lawyer_id: lawyerRow.id,
          }).select("id").single();
          if (room?.id) {
            setSession({ ...session, status: "selected", selectedLawyerId: lawyerId, updatedAt: Date.now() });
            setDetailLawyer(null);
            setDetailDbLawyer(null);
            router.push(`/chat/rooms/${room.id}`);
            return;
          }
        }
      }
    }

    setSession({ ...session, status: "selected", selectedLawyerId: lawyerId, updatedAt: Date.now() });
    setDetailLawyer(null);
    setDetailDbLawyer(null);
  }

  function restartFromSelected() {
    if (!session) return;
    setSession({
      ...session,
      status: "summary",
      startedAt: null,
      selectedLawyerId: null,
      interestCount: 0,
      proposals: [],
      updatedAt: Date.now(),
    });
  }

  function retrySummary() {
    if (!consultation || !session) return;
    summaryRequestedRef.current = true;
    void fetchSummary(session, consultation);
  }

  function updateFeeRange(min: number, max: number) {
    if (!session) return;
    setSession({ ...session, feeRange: { min, max }, updatedAt: Date.now() });
  }

  function updateMethod(method: ConsultationMethod) {
    if (!session) return;
    setSession({ ...session, consultationMethod: method, updatedAt: Date.now() });
  }

  function openProposal(proposal: LawyerProposal) {
    if (proposal.lawyerId.startsWith("db:")) {
      const realId = proposal.lawyerId.slice(3);
      const dbEntry = Array.from(dbProposalsRef.current.values()).find((e) => e.lawyer.id === realId);
      if (dbEntry) {
        setDetailDbLawyer(dbEntry.lawyer);
        setDetailLawyer(null);
        return;
      }
    }
    const l = getLawyerById(proposal.lawyerId);
    if (l) { setDetailLawyer(l); setDetailDbLawyer(null); }
  }

  return (
    <main className="flex flex-col min-h-screen lg:min-h-[calc(100vh-4rem)] bg-ink-0 page-enter">
      <header className="bg-ink-2 border-b border-ink-3 z-20 pt-safe-top">
        <div className="max-w-md mx-auto px-3 h-14 flex items-center gap-2 lg:max-w-screen-xl lg:px-6">
          <button
            onClick={() => router.push(`/chat/${id}`)}
            className="w-9 h-9 rounded-lg hover:bg-ink-3 flex items-center justify-center text-primary-700 transition shrink-0"
            aria-label="뒤로"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif font-bold text-primary-900 text-base leading-tight">변호사 매칭</h1>
            <p className="text-[11px] text-primary-500 truncate mt-0.5">{consultation.title}</p>
          </div>
          {session.status === "matching" && (
            <div className="text-xs font-mono font-semibold text-primary-800 bg-ink-3 px-2.5 py-1.5 rounded-lg border border-ink-3">
              ⏱ {formatElapsed(elapsed)}
            </div>
          )}
        </div>
        <ProgressBar currentStep={currentStep} />
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-5 lg:max-w-4xl lg:px-6 lg:py-8">
          {session.status === "summary" && (
            <SummaryView
              session={session}
              loading={summaryLoading}
              error={summaryError}
              onRetry={retrySummary}
              onFeeChange={updateFeeRange}
              onMethodChange={updateMethod}
              onStart={startMatching}
            />
          )}
          {session.status === "matching" && (
            <MatchingView
              session={session}
              onCancel={cancelMatching}
              onOpenProposal={openProposal}
            />
          )}
          {session.status === "selected" && (
            <SelectedView session={session} consultationId={id} onRestart={restartFromSelected} />
          )}
        </div>
      </div>

      {/* Demo lawyer sheet */}
      {detailLawyer && !detailDbLawyer && (
        <LawyerDetailSheet
          lawyer={detailLawyer}
          proposal={session.proposals.find((p) => p.lawyerId === detailLawyer.id)}
          method={session.consultationMethod}
          onClose={() => setDetailLawyer(null)}
          onSelect={() => selectLawyer(detailLawyer.id)}
        />
      )}

      {/* Real DB lawyer sheet */}
      {detailDbLawyer && (
        <DbLawyerDetailSheet
          lawyer={detailDbLawyer}
          proposal={session.proposals.find((p) => p.lawyerId === `db:${detailDbLawyer.id}`)}
          method={session.consultationMethod}
          onClose={() => setDetailDbLawyer(null)}
          onSelect={() => selectLawyer(`db:${detailDbLawyer.id}`)}
        />
      )}

      <AuthModal
        open={authPromptOpen}
        title="변호사 매칭을 위해 가입이 필요해요"
        description="가입 즉시 변호사 매칭이 시작됩니다. 1분이면 끝나요."
        onClose={() => router.push(`/chat/${id}`)}
        onSuccess={() => setAuthPromptOpen(false)}
      />
    </main>
  );
}

/* ---------- Progress bar ---------- */
function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="max-w-md mx-auto px-4 pb-3 pt-1 lg:max-w-screen-xl lg:px-6 lg:pb-4">
      <div className="flex items-center">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition ${isDone ? "bg-brand-600 text-white" : isActive ? "bg-primary-900 text-white" : "bg-ink-3 text-primary-400"}`}>
                  {isDone ? "✓" : stepNum}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-primary-900" : isDone ? "text-brand-700" : "text-primary-400"}`}>
                  {label}
                </span>
              </div>
              {idx < STEP_LABELS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition ${stepNum < currentStep ? "bg-brand-600" : "bg-ink-3"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Summary view ---------- */
function SummaryView({ session, loading, error, onRetry, onFeeChange, onMethodChange, onStart }: {
  session: MatchingSession; loading: boolean; error: string | null;
  onRetry: () => void; onFeeChange: (min: number, max: number) => void;
  onMethodChange: (m: ConsultationMethod) => void; onStart: () => void;
}) {
  const summary = session.caseSummary;
  return (
    <div className="space-y-5">
      {loading && (
        <div className="bg-ink-2 rounded-2xl border border-ink-3 p-5 shadow-card">
          <div className="flex items-center gap-2 text-primary-600">
            {[0, 0.15, 0.3].map((d) => (
              <span key={d} className="inline-block w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
            ))}
            <span className="text-sm ml-1">사건 요약서를 생성 중입니다...</span>
          </div>
        </div>
      )}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 flex items-start justify-between gap-3">
          <div><div className="font-semibold mb-1">요약 생성에 실패했습니다</div><div>{error}</div></div>
          <button onClick={onRetry} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium shrink-0 hover:bg-red-700">다시 시도</button>
        </div>
      )}
      {summary && (
        <section className="bg-ink-2 rounded-2xl border border-ink-3 shadow-card p-8 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[11px] text-brand-700 mb-1 font-semibold tracking-widest">사건 요약서</div>
              <div className="font-serif font-bold text-xl text-primary-900">{summary.caseType}</div>
            </div>
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${URGENCY_META[summary.urgency].classes}`}>
              긴급도 {URGENCY_META[summary.urgency].label}
            </span>
          </div>
          <p className="text-sm text-primary-800 leading-relaxed">{summary.summary}</p>
          <div>
            <div className="text-[11px] font-semibold text-primary-500 mb-1.5 uppercase tracking-wide">핵심 쟁점</div>
            <ul className="space-y-1.5">
              {summary.keyIssues.map((issue, idx) => (
                <li key={idx} className="text-sm text-primary-900 leading-relaxed flex gap-2">
                  <span className="text-brand-600 shrink-0 font-bold">•</span><span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-primary-500 mb-1.5 uppercase tracking-wide">관련 법령</div>
            <div className="flex flex-wrap gap-1.5">
              {summary.relevantLaws.map((law, idx) => (
                <span key={idx} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-ink-3 text-primary-700 border border-ink-3">{law}</span>
              ))}
            </div>
          </div>
        </section>
      )}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <FeeRangeCard min={session.feeRange.min} max={session.feeRange.max} onChange={onFeeChange} />
          <MethodPicker value={session.consultationMethod} onChange={onMethodChange} />
        </div>
      )}
      {summary && (
        <button onClick={onStart} className="w-full bg-brand-gradient text-white font-semibold rounded-2xl py-4 lg:py-5 text-base lg:text-lg shadow-card hover:shadow-cardHover transition flex items-center justify-center gap-2 active:scale-[0.98]">
          변호사 매칭 시작
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

function FeeRangeCard({ min, max, onChange }: { min: number; max: number; onChange: (min: number, max: number) => void }) {
  const range = FEE_CEILING - FEE_FLOOR;
  const lowPct = ((min - FEE_FLOOR) / range) * 100;
  const highPct = ((max - FEE_FLOOR) / range) * 100;
  return (
    <section className="bg-ink-2 rounded-2xl border border-ink-3 shadow-card p-8">
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="font-serif font-bold text-primary-900 text-base">희망 상담비</div>
        <div className="text-sm font-bold text-accent-600">{formatKRW(min)} ~ {formatKRW(max)}</div>
      </div>
      <p className="text-xs text-primary-500 mb-6">변호사가 이 범위 내에서 제안을 보냅니다.</p>
      <div className="relative h-6 mb-1">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-ink-3 rounded-full" />
        <div className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-brand-500 rounded-full" style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }} />
        <input type="range" min={FEE_FLOOR} max={FEE_CEILING} step={FEE_STEP} value={min} onChange={(e) => onChange(Math.min(Number(e.target.value), max - FEE_STEP), max)} className="range-thumb absolute inset-0 w-full" />
        <input type="range" min={FEE_FLOOR} max={FEE_CEILING} step={FEE_STEP} value={max} onChange={(e) => onChange(min, Math.max(Number(e.target.value), min + FEE_STEP))} className="range-thumb absolute inset-0 w-full" />
      </div>
      <div className="flex justify-between text-[10px] text-primary-400 mt-1">
        <span>{formatKRW(FEE_FLOOR)}</span><span>{formatKRW(FEE_CEILING)}</span>
      </div>
    </section>
  );
}

function MethodPicker({ value, onChange }: { value: ConsultationMethod; onChange: (m: ConsultationMethod) => void }) {
  return (
    <section className="bg-ink-2 rounded-2xl border border-ink-3 shadow-card p-8">
      <div className="font-serif font-bold text-primary-900 mb-1.5 text-base">희망 상담방식</div>
      <p className="text-xs text-primary-500 mb-4">변호사와 어떻게 상담받고 싶으신가요?</p>
      <div className="grid grid-cols-4 gap-2.5">
        {METHOD_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button key={opt.value} onClick={() => onChange(opt.value)} className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border text-xs font-medium transition-all duration-500 ease-out ${active ? "bg-brand-50 border-brand-500 text-brand-700" : "bg-ink-0 border-ink-3 text-primary-600 hover:border-primary-300"}`}>
              <span className="text-xl">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Matching view ---------- */
function MatchingView({ session, onCancel, onOpenProposal }: {
  session: MatchingSession; onCancel: () => void; onOpenProposal: (p: LawyerProposal) => void;
}) {
  const allArrived = session.proposals.length >= TOTAL_PROPOSALS;
  return (
    <div className="space-y-5">
      <div className="text-center pt-2 pb-3">
        <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
          <span className="pulse-ring" /><span className="pulse-ring delay-1" /><span className="pulse-ring delay-2" />
          <span className="pulse-hub relative z-10 w-16 h-16 rounded-full bg-brand-gradient text-white flex items-center justify-center text-3xl">⚖</span>
        </div>
        <h2 className="font-serif font-bold text-2xl text-primary-900 mb-2">
          {allArrived ? "제안이 모두 도착했습니다" : "변호사를 찾고 있습니다"}
        </h2>
        <p className="text-sm text-primary-500">
          {allArrived ? "마음에 드는 변호사를 선택해주세요" : "관심 변호사가 사건을 검토 중입니다"}
        </p>
        <div className="mt-4 flex justify-center gap-2.5 flex-wrap">
          <CounterChip icon="👀" label="관심 변호사" value={session.interestCount} unit="명" />
          <CounterChip icon="📨" label="제안 도착" value={session.proposals.length} unit="건" highlight />
        </div>
      </div>

      {session.proposals.length === 0 ? (
        <div className="bg-ink-2/60 border border-dashed border-ink-3 rounded-2xl p-6 text-center text-primary-500 text-sm">첫 제안이 곧 도착합니다...</div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-bold text-primary-900 text-base lg:text-lg">변호사 제안 ({session.proposals.length}/{TOTAL_PROPOSALS})</h3>
            {!allArrived && <span className="text-[10px] lg:text-xs text-brand-700 font-medium">● 실시간 도착중</span>}
          </div>
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
            {session.proposals.map((proposal, idx) => {
              const isReal = proposal.lawyerId.startsWith("db:");
              const realId = isReal ? proposal.lawyerId.slice(3) : proposal.lawyerId;
              const dbEntry = isReal ? Array.from((window as never as { dbProposals?: Map<string, { lawyer: LawyerRow; proposal: LawyerProposal }> }).dbProposals?.values() ?? []).find((e) => e.lawyer.id === realId) : null;
              const demoLawyer = !isReal ? getLawyerById(proposal.lawyerId) : null;

              if (!isReal && !demoLawyer) return null;

              return (
                <ProposalCard
                  key={proposal.id}
                  name={isReal ? (dbEntry?.lawyer.name ?? "변호사") + " 변호사" : (demoLawyer?.name ?? "변호사") + " 변호사"}
                  firm={isReal ? (dbEntry?.lawyer.firm ?? "") : (demoLawyer?.firm ?? "")}
                  rating={isReal ? (dbEntry?.lawyer.rating ?? 0) : (demoLawyer?.rating ?? 0)}
                  reviewCount={isReal ? (dbEntry?.lawyer.review_count ?? 0) : (demoLawyer?.reviewCount ?? 0)}
                  yearsExperience={isReal ? (dbEntry?.lawyer.experience_years ?? 0) : (demoLawyer?.yearsExperience ?? 0)}
                  specialties={isReal ? (dbEntry?.lawyer.specialty ?? []) : (demoLawyer?.specialties ?? [])}
                  fee={proposal.fee}
                  message={proposal.message}
                  isReal={isReal}
                  index={idx}
                  onOpen={() => onOpenProposal(proposal)}
                />
              );
            })}
          </div>
        </div>
      )}
      <div className="pt-1">
        <button onClick={onCancel} className="w-full text-xs text-primary-500 hover:text-primary-800 py-2">매칭 중단하기</button>
      </div>
    </div>
  );
}

function CounterChip({ icon, label, value, unit, highlight = false }: { icon: string; label: string; value: number; unit: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium shadow-sm ${highlight ? "bg-brand-gradient text-white border-transparent" : "bg-ink-2 text-primary-800 border-ink-3"}`}>
      <span aria-hidden>{icon}</span>
      <span className={highlight ? "text-white/85" : "text-primary-500"}>{label}</span>
      <span key={value} className={`font-bold ${value > 0 ? "counter-pop" : ""} inline-block min-w-[1rem] text-center`}>{value}</span>
      <span className={highlight ? "text-white/75" : "text-primary-400"}>{unit}</span>
    </div>
  );
}

function ProposalCard({ name, firm, rating, reviewCount, yearsExperience, specialties, fee, message, isReal, index, onOpen }: {
  name: string; firm: string; rating: number; reviewCount: number; yearsExperience: number;
  specialties: string[]; fee: number; message: string; isReal: boolean; index: number; onOpen: () => void;
}) {
  return (
    <button onClick={onOpen} className="proposal-enter card-hover w-full text-left bg-ink-2 border border-ink-3 hover:border-brand-500 hover:shadow-cardHover rounded-2xl p-6 flex gap-4 group" style={{ animationDelay: `${Math.min(index, 4) * 80}ms` }}>
      <div className="relative w-16 h-16 shrink-0">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-100 via-primary-50 to-accent-100" />
        <div className="absolute inset-0.5 rounded-full bg-ink-2 flex items-center justify-center text-xl font-bold text-brand-700">
          {name.slice(0, 2)}
        </div>
        {isReal && <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-green-500 text-white px-1.5 h-4 leading-4 rounded-full">실제</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif font-bold text-primary-900 text-base">{name}</span>
              <span className="text-xs text-accent-600 font-semibold">★ {rating.toFixed(1)}</span>
              <span className="text-[11px] text-primary-400">({reviewCount})</span>
            </div>
            <div className="text-xs text-brand-700 font-semibold mt-0.5 truncate">{firm}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-serif font-bold text-primary-900 text-base">{formatKRW(fee)}</div>
            <div className="text-[10px] text-primary-400 mt-0.5">제안 상담비</div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-primary-600 font-medium">
          <span>경력 {yearsExperience}년</span>
          <span className="text-primary-200">|</span>
          <span>상담 {reviewCount}건</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {specialties.slice(0, 3).map((s) => (
            <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded bg-ink-3 text-primary-700 border border-ink-3">#{s}</span>
          ))}
        </div>
        <p className="mt-2.5 text-sm text-primary-700 leading-relaxed line-clamp-2">"{message}"</p>
        <div className="mt-2 text-[11px] text-brand-700 font-medium">프로필 보기 →</div>
      </div>
    </button>
  );
}

/* ---------- Demo lawyer detail sheet ---------- */
const METHOD_LABEL: Record<ConsultationMethod, string> = { phone: "전화", video: "화상", inperson: "대면", chat: "채팅" };

function LawyerDetailSheet({ lawyer, proposal, method, onClose, onSelect }: {
  lawyer: Lawyer; proposal?: LawyerProposal; method: ConsultationMethod; onClose: () => void; onSelect: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-ink-2 w-full max-w-md rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto proposal-enter" role="dialog" aria-modal="true">
        <div className="sticky top-0 bg-ink-2 border-b border-ink-3 px-5 py-3 flex items-center justify-between z-10">
          <div className="font-bold text-primary-900 text-sm">변호사 프로필</div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-ink-3 flex items-center justify-center text-primary-700 text-xl" aria-label="닫기">×</button>
        </div>
        <div className="p-5 space-y-5 pb-24">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-ink-3 flex items-center justify-center text-4xl shrink-0">{lawyer.avatar}</div>
            <div className="min-w-0">
              <div className="font-bold text-xl text-primary-900">{lawyer.name} 변호사</div>
              <div className="text-sm text-primary-600 mt-0.5">{lawyer.firm}</div>
              <div className="text-xs text-accent-600 font-semibold mt-1">★ {lawyer.rating.toFixed(1)} <span className="text-primary-400 font-normal">({lawyer.reviewCount} 리뷰)</span></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {lawyer.specialties.map((s) => <span key={s} className="text-xs font-medium px-2.5 py-1 rounded-full bg-ink-3 text-primary-700 border border-ink-3">#{s}</span>)}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatBox label="승소율" value={`${lawyer.winRate}%`} />
            <StatBox label="상담건수" value={`${lawyer.reviewCount.toLocaleString("ko-KR")}건`} />
            <StatBox label="유사사건" value={`${lawyer.similarCases}건`} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-primary-500 mb-1.5 uppercase tracking-wide">변호사 소개</div>
            <p className="text-sm text-primary-800 leading-relaxed">{lawyer.bio}</p>
          </div>
          {proposal && (
            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-brand-700">제안 상담비</div>
                  <div className="text-[10px] text-primary-500 mt-0.5">상담방식: {METHOD_LABEL[method]}</div>
                </div>
                <div className="font-bold text-xl text-brand-700">{formatKRW(proposal.fee)}</div>
              </div>
              <p className="text-sm text-primary-800 mt-2">"{proposal.message}"</p>
            </div>
          )}
        </div>
        <div className="fixed bottom-0 inset-x-0 max-w-md mx-auto bg-ink-2 border-t border-ink-3 px-5 py-3">
          <button onClick={onSelect} className="w-full bg-brand-gradient text-white font-semibold rounded-xl py-3.5 transition active:scale-[0.98] shadow-card">이 변호사와 상담하기</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Real DB lawyer detail sheet ---------- */
function DbLawyerDetailSheet({ lawyer, proposal, method, onClose, onSelect }: {
  lawyer: LawyerRow; proposal?: LawyerProposal; method: ConsultationMethod; onClose: () => void; onSelect: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-ink-2 w-full max-w-md rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto proposal-enter" role="dialog" aria-modal="true">
        <div className="sticky top-0 bg-ink-2 border-b border-ink-3 px-5 py-3 flex items-center justify-between z-10">
          <div className="font-bold text-primary-900 text-sm">변호사 프로필 <span className="text-[10px] text-green-600 font-bold ml-1">실제 변호사</span></div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-ink-3 flex items-center justify-center text-primary-700 text-xl" aria-label="닫기">×</button>
        </div>
        <div className="p-5 space-y-5 pb-24">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4338CA] to-[#6366F1] flex items-center justify-center text-white text-2xl font-bold shrink-0">{lawyer.name.slice(0, 2)}</div>
            <div className="min-w-0">
              <div className="font-bold text-xl text-primary-900">{lawyer.name} 변호사</div>
              <div className="text-sm text-primary-600 mt-0.5">{lawyer.firm ?? "개인사무소"}</div>
              <div className="text-xs text-accent-600 font-semibold mt-1">★ {(lawyer.rating ?? 0).toFixed(1)} <span className="text-primary-400 font-normal">({lawyer.review_count ?? 0} 리뷰)</span></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(lawyer.specialty ?? []).map((s) => <span key={s} className="text-xs font-medium px-2.5 py-1 rounded-full bg-ink-3 text-primary-700 border border-ink-3">#{s}</span>)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="경력" value={`${lawyer.experience_years ?? 0}년`} />
            <StatBox label="상담건수" value={`${lawyer.review_count ?? 0}건`} />
          </div>
          {lawyer.bio && (
            <div>
              <div className="text-[11px] font-semibold text-primary-500 mb-1.5 uppercase tracking-wide">변호사 소개</div>
              <p className="text-sm text-primary-800 leading-relaxed">{lawyer.bio}</p>
            </div>
          )}
          {proposal && (
            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-brand-700">제안 상담비</div>
                  <div className="text-[10px] text-primary-500 mt-0.5">상담방식: {METHOD_LABEL[method]}</div>
                </div>
                <div className="font-bold text-xl text-brand-700">{formatKRW(proposal.fee)}</div>
              </div>
              <p className="text-sm text-primary-800 mt-2">"{proposal.message}"</p>
            </div>
          )}
        </div>
        <div className="fixed bottom-0 inset-x-0 max-w-md mx-auto bg-ink-2 border-t border-ink-3 px-5 py-3">
          <button onClick={onSelect} className="w-full bg-brand-gradient text-white font-semibold rounded-xl py-3.5 transition active:scale-[0.98] shadow-card">
            이 변호사 선택 → 채팅 시작
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-0 border border-ink-3 rounded-xl py-2.5 text-center">
      <div className="text-[10px] text-primary-500">{label}</div>
      <div className="font-bold text-primary-900 mt-0.5 text-sm">{value}</div>
    </div>
  );
}

/* ---------- Selected view ---------- */
function SelectedView({ session, consultationId, onRestart }: {
  session: MatchingSession; consultationId: string; onRestart: () => void;
}) {
  const isReal = session.selectedLawyerId?.startsWith("db:");
  const lawyer = !isReal && session.selectedLawyerId ? getLawyerById(session.selectedLawyerId) : null;
  const proposal = session.proposals.find((p) => p.lawyerId === session.selectedLawyerId);

  return (
    <div className="space-y-5">
      <div className="text-center pt-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-3xl mb-3 cta-pulse">✓</div>
        <h2 className="font-serif font-bold text-2xl text-primary-900 mb-2">매칭이 완료되었습니다</h2>
        <p className="text-sm text-primary-500">
          {isReal ? "채팅방이 개설되었습니다." : "선택하신 변호사로부터 곧 연락드릴 예정입니다."}
        </p>
      </div>
      {!isReal && lawyer && (
        <div className="bg-ink-2 border border-ink-3 rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-ink-3 flex items-center justify-center text-3xl shrink-0">{lawyer.avatar}</div>
            <div className="min-w-0">
              <div className="font-bold text-primary-900">{lawyer.name} 변호사</div>
              <div className="text-xs text-primary-500">{lawyer.firm}</div>
              <div className="text-[11px] text-accent-600 font-semibold mt-0.5">★ {lawyer.rating.toFixed(1)} ({lawyer.reviewCount})</div>
            </div>
          </div>
          {proposal && (
            <div className="mt-4 pt-4 border-t border-ink-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-primary-600">상담비</span>
                <span className="font-bold text-brand-700">{formatKRW(proposal.fee)}</span>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 text-xs text-brand-800 leading-relaxed">
        {isReal ? "💬 채팅방에서 변호사와 직접 소통하실 수 있습니다." : "💡 변호사가 24시간 이내에 등록하신 연락처로 연락드릴 예정입니다."}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={onRestart} className="bg-ink-2 border border-ink-3 text-primary-700 hover:bg-ink-3 font-medium rounded-xl py-3 text-sm transition">다시 매칭</button>
        <Link href={`/chat/${consultationId}`} className="bg-gold hover:bg-gold-light text-white font-medium rounded-xl py-3 text-sm transition text-center">상담으로</Link>
      </div>
    </div>
  );
}
