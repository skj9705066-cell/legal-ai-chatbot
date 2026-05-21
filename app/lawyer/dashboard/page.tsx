"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import ScrollReveal from "@/components/ScrollReveal";
import Sparkline from "@/components/Sparkline";
import type { LawyerAccount } from "@/lib/types";

interface IncomingCase {
  id: string;
  caseType: string;
  urgency: "high" | "medium" | "low";
  summary: string;
  desiredFeeManwon: number;
  preferredMethod: "phone" | "video" | "inperson" | "chat";
  postedAt: string;
}

const INCOMING_CASES: IncomingCase[] = [
  {
    id: "case_001",
    caseType: "형사",
    urgency: "high",
    summary:
      "사기 혐의로 경찰 출석 요구. 가해자와의 금전거래 입증 자료는 보유. 수사 단계 대응 필요.",
    desiredFeeManwon: 40,
    preferredMethod: "video",
    postedAt: "12분 전",
  },
  {
    id: "case_002",
    caseType: "민사",
    urgency: "medium",
    summary:
      "공사 미완성으로 시공사에 대한 대금 반환 청구 검토. 계약서·견적서·공사사진 보유.",
    desiredFeeManwon: 30,
    preferredMethod: "video",
    postedAt: "1시간 전",
  },
  {
    id: "case_003",
    caseType: "기업법무",
    urgency: "low",
    summary:
      "신규 서비스 약관 검토 및 개인정보 처리방침 자문. 분쟁 발생 전 사전 자문 단계.",
    desiredFeeManwon: 50,
    preferredMethod: "chat",
    postedAt: "3시간 전",
  },
  {
    id: "case_004",
    caseType: "노동",
    urgency: "high",
    summary:
      "권고사직 강요 후 부당해고 처리. 녹취·메신저 기록 보유. 부당해고 구제신청 검토.",
    desiredFeeManwon: 25,
    preferredMethod: "phone",
    postedAt: "어제",
  },
];

const URGENCY_BAR: Record<IncomingCase["urgency"], string> = {
  high: "#dc2626",
  medium: "#d4a574",
  low: "#94a3b8",
};
const URGENCY_LABEL: Record<IncomingCase["urgency"], string> = {
  high: "긴급",
  medium: "보통",
  low: "여유",
};

const METHOD_LABEL: Record<IncomingCase["preferredMethod"], string> = {
  phone: "📞 전화",
  video: "📹 화상",
  inperson: "🤝 대면",
  chat: "💬 채팅",
};

export default function LawyerDashboardPage() {
  const router = useRouter();
  const { account, loading, signOut } = useAuth();
  const [proposingId, setProposingId] = useState<string | null>(null);
  const [proposedIds, setProposedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (loading) return;
    if (!account || account.type !== "lawyer") {
      router.replace("/login?next=/lawyer/dashboard");
    }
  }, [account, loading, router]);

  const today = useMemo(() => {
    const d = new Date();
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${days[d.getDay()]}`;
  }, []);

  if (loading || !account || account.type !== "lawyer") {
    return <div className="min-h-screen bg-surface-subtle" />;
  }

  const lawyer = account as LawyerAccount;
  const proposingCase =
    INCOMING_CASES.find((c) => c.id === proposingId) ?? null;
  const newCount = INCOMING_CASES.filter((c) => !proposedIds.has(c.id)).length;

  return (
    <main className="min-h-screen bg-surface-subtle page-enter">
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:flex flex-col bg-navy-900 text-white min-h-screen sticky top-0">
          <div className="px-7 py-8">
            <div className="text-[20px] font-bold tracking-luxe">
              법률<span className="text-gold">AI</span>
              <span className="ml-2 text-[10px] tracking-eyebrow text-gold">
                PARTNER
              </span>
            </div>
          </div>

          <nav className="px-4 space-y-1 flex-1">
            <SideLink active label="대시보드" />
            <SideLink label="사건 관리" />
            <SideLink label="프로필" href="/lawyer/register" />
            <SideLink label="정산 내역" />
          </nav>

          <div className="px-4 pb-7 pt-6">
            <div className="rounded-2xl bg-white/5 px-4 py-4 mb-3">
              <div className="text-[11px] tracking-eyebrow text-white/55">
                LOGGED IN
              </div>
              <div className="text-[15px] font-semibold mt-1 truncate">
                {lawyer.name} 변호사
              </div>
              <div className="text-[12px] text-white/55 truncate mt-0.5">
                {lawyer.email}
              </div>
            </div>
            <button
              onClick={() => {
                signOut();
                router.push("/");
              }}
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
            </div>
          </header>

          {/* Welcome */}
          <section className="bg-white border-b border-surface-line">
            <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10 lg:py-14">
              <p className="text-caption text-gold mb-3">
                PARTNER DASHBOARD
              </p>
              <h1 className="text-h1">
                안녕하세요, {lawyer.name} 변호사님
              </h1>
              <p className="text-[14px] text-text-muted font-medium tracking-luxe mt-3">
                {today}
              </p>

              {/* Stat cards with sparklines */}
              <div className="mt-10 lg:mt-12 grid grid-cols-3 gap-3 lg:gap-5">
                <StatCard
                  label="신규 사건"
                  value={newCount}
                  unit="건"
                  accent
                  data={[2, 4, 3, 6, 5, 7, newCount]}
                />
                <StatCard
                  label="진행 중"
                  value={3}
                  unit="건"
                  data={[1, 2, 2, 3, 4, 3, 3]}
                />
                <StatCard
                  label="이번 달 수임"
                  value={2}
                  unit="건"
                  data={[0, 1, 1, 1, 2, 2, 2]}
                />
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
              <span className="text-[14px] font-medium text-text-muted tracking-luxe">
                전체 {INCOMING_CASES.length}건
              </span>
            </ScrollReveal>

            <div className="space-y-5">
              {INCOMING_CASES.map((c, i) => {
                const proposed = proposedIds.has(c.id);
                return (
                  <ScrollReveal key={c.id} delay={i * 100}>
                    <article className="surface-card flex overflow-hidden">
                      {/* Left urgency bar */}
                      <span
                        className="w-1.5 shrink-0"
                        style={{ backgroundColor: URGENCY_BAR[c.urgency] }}
                        aria-hidden
                      />
                      <div className="flex-1 p-7 lg:p-8">
                        <div className="flex items-center gap-2 mb-5 flex-wrap">
                          <span className="text-[12px] tracking-luxe px-3 h-7 leading-7 rounded-full bg-surface-subtle text-navy-900 font-semibold">
                            {c.caseType}
                          </span>
                          <span
                            className="text-[12px] tracking-luxe px-3 h-7 leading-7 rounded-full font-semibold"
                            style={{
                              backgroundColor: `${URGENCY_BAR[c.urgency]}14`,
                              color: URGENCY_BAR[c.urgency],
                            }}
                          >
                            {URGENCY_LABEL[c.urgency]}
                          </span>
                          <span className="text-[13px] text-text-muted ml-auto">
                            {c.postedAt}
                          </span>
                        </div>

                        <div className="mb-6">
                          <div className="text-caption text-gold mb-2">
                            AI SUMMARY
                          </div>
                          <p className="text-[16px] text-navy-900 leading-[1.8]">
                            {c.summary}
                          </p>
                        </div>

                        <div className="flex items-center gap-5 text-[14px] mb-6 font-medium">
                          <div className="flex items-center gap-2">
                            <span className="text-text-muted tracking-luxe">
                              희망 상담비
                            </span>
                            <span className="text-cta-600 text-[18px] font-semibold">
                              {c.desiredFeeManwon}만원
                            </span>
                          </div>
                          <span className="text-surface-line">·</span>
                          <div className="flex items-center gap-2">
                            <span className="text-text-muted tracking-luxe">
                              방식
                            </span>
                            <span className="text-navy-900">
                              {METHOD_LABEL[c.preferredMethod]}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setProposingId(c.id)}
                          disabled={proposed}
                          className={`w-full sm:w-auto sm:min-w-[200px] h-11 px-7 rounded-full text-[15px] tracking-luxe transition-all duration-500 ease-luxe ${
                            proposed
                              ? "bg-surface-subtle text-text-muted cursor-default"
                              : "btn-primary"
                          }`}
                        >
                          {proposed ? "제안 완료" : "제안하기"}
                        </button>
                      </div>
                    </article>
                  </ScrollReveal>
                );
              })}
            </div>

            <div className="mt-14 mb-10 rounded-3xl bg-white shadow-card p-7 lg:p-9 flex items-center justify-between gap-4">
              <div>
                <p className="text-h3">
                  프로필을 최신 상태로 유지하세요
                </p>
                <p className="text-body-muted mt-2 leading-[1.8]">
                  상세 소개와 전문 분야가 충실할수록 매칭 확률이 높아집니다.
                </p>
              </div>
              <Link
                href="/lawyer/register"
                className="shrink-0 h-11 px-5 rounded-full btn-ghost text-[14px] tracking-luxe leading-[44px]"
              >
                프로필 수정
              </Link>
            </div>
          </section>
        </div>
      </div>

      {proposingCase && (
        <ProposalModal
          targetCase={proposingCase}
          baseFee={lawyer.baseFeeManwon}
          onClose={() => setProposingId(null)}
          onSubmit={() => {
            setProposedIds((prev) => {
              const next = new Set(prev);
              next.add(proposingCase.id);
              return next;
            });
            setProposingId(null);
          }}
        />
      )}
    </main>
  );
}

function SideLink({
  label,
  active,
  href,
}: {
  label: string;
  active?: boolean;
  href?: string;
}) {
  const cls = `w-full flex items-center justify-between px-4 py-3 rounded-xl text-[14px] font-medium tracking-luxe transition-colors duration-500 ease-luxe ${
    active
      ? "bg-white/10 text-white"
      : "text-white/65 hover:text-white hover:bg-white/5"
  }`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        <span>{label}</span>
        <span className="text-white/40">→</span>
      </Link>
    );
  }
  return (
    <button className={cls}>
      <span>{label}</span>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-gold" />}
    </button>
  );
}

function StatCard({
  label,
  value,
  unit,
  accent,
  data,
}: {
  label: string;
  value: number;
  unit: string;
  accent?: boolean;
  data: number[];
}) {
  return (
    <div
      className={`rounded-2xl px-5 py-6 lg:px-6 lg:py-7 ${
        accent
          ? "bg-navy-900 text-white shadow-card"
          : "bg-white shadow-card"
      }`}
    >
      <div
        className={`text-[12px] font-semibold tracking-luxe ${
          accent ? "text-white/55" : "text-text-muted"
        }`}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-1 mt-3">
        <span
          className={`text-stat tracking-luxe ${
            accent ? "text-gold-grad" : "text-navy-900"
          }`}
          style={{ fontSize: 40 }}
        >
          {value}
        </span>
        <span
          className={`text-[14px] font-semibold ${
            accent ? "text-white/55" : "text-text-muted"
          }`}
        >
          {unit}
        </span>
      </div>
      <div className="mt-3 -mb-1">
        <Sparkline
          data={data}
          color={accent ? "#d4a574" : "#0f172a"}
          fill={
            accent ? "rgba(212, 165, 116, 0.18)" : "rgba(15, 23, 42, 0.08)"
          }
        />
      </div>
    </div>
  );
}

function ProposalModal({
  targetCase,
  baseFee,
  onClose,
  onSubmit,
}: {
  targetCase: IncomingCase;
  baseFee: number;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [fee, setFee] = useState(
    String(baseFee || targetCase.desiredFeeManwon),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function handleSend() {
    setError(null);
    const f = Number(fee);
    if (!Number.isFinite(f) || f < 1) {
      setError("상담비를 올바르게 입력해주세요.");
      return;
    }
    if (!message.trim()) {
      setError("간단한 메시지를 입력해주세요.");
      return;
    }
    onSubmit();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/50 backdrop-blur-md animate-fade-in">
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-elevated max-h-[92vh] overflow-y-auto banner-slide-up sm:animate-fade-up">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full hover:bg-surface-subtle text-text-muted hover:text-navy-900 flex items-center justify-center text-2xl leading-none transition-colors duration-500 ease-luxe z-10"
          aria-label="닫기"
        >
          ×
        </button>

        <div className="p-7 lg:p-9 pt-10 space-y-5">
          <div>
            <p className="text-caption text-gold mb-2">SEND PROPOSAL</p>
            <h2 className="text-h2">사건에 제안 보내기</h2>
            <p className="text-[14px] text-text-muted font-medium mt-2">
              {targetCase.caseType} · 희망 상담비{" "}
              {targetCase.desiredFeeManwon}만원
            </p>
          </div>

          <div className="rounded-2xl bg-surface-subtle px-4 py-4 text-[15px] text-navy-900 leading-[1.8]">
            {targetCase.summary}
          </div>

          <div>
            <Label>상담비 제안 (만원)</Label>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="surface-input--soft w-full h-12 pl-4 pr-16 rounded-xl text-[15px] font-medium text-navy-900"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-medium text-text-muted tracking-luxe">
                만원
              </span>
            </div>
          </div>

          <div>
            <Label>한줄 메시지</Label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="유사 사건 경험과 대응 방향을 간단히 적어주세요."
              rows={3}
              className="surface-input--soft w-full px-4 py-3 rounded-xl text-[15px] text-navy-900 placeholder:text-text-subtle font-medium resize-none leading-[1.7]"
            />
          </div>

          {error && (
            <div className="text-[13px] text-danger bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          <button
            onClick={handleSend}
            className="w-full h-12 rounded-2xl btn-primary text-[15px] tracking-luxe"
          >
            제안 보내기
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-caption text-text-muted mb-2">{children}</div>;
}
