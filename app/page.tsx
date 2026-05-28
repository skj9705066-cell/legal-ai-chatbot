"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateId } from "@/lib/storage";
import { DEMO_LAWYERS } from "@/lib/lawyers";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import RobotMascot from "@/components/RobotMascot";
import type { Lawyer } from "@/lib/types";

const TRENDING = [
  "전세보증금",
  "음주운전",
  "이혼재산분할",
  "임금체불",
  "합의금",
];

interface TrustStat {
  target: number;
  decimals: number;
  suffix: string;
  label: string;
}

const TRUST_STATS: TrustStat[] = [
  { target: 10000, decimals: 0, suffix: "+", label: "AI 상담" },
  { target: 500, decimals: 0, suffix: "+", label: "검증 변호사" },
  { target: 30, decimals: 0, suffix: "분", label: "평균 매칭" },
  { target: 4.8, decimals: 1, suffix: "/5", label: "만족도" },
];

const HERO_TITLE_LINE_1 = "법률 고민,";
const HERO_TITLE_LINE_2 = "AI에게 먼저 물어보세요";

type QuickSlug = "criminal" | "divorce" | "realestate" | "labor" | "contract" | "damages";

interface MainCategory {
  icon: string;
  title: string;
  desc: string;
  bg: string;
  quickSlug: QuickSlug;
}

interface SubCategory {
  icon: string;
  title: string;
  bg: string;
}

const MAIN_CATEGORIES: MainCategory[] = [
  { icon: "⚖️", title: "형사", desc: "폭행, 사기, 횡령 등", bg: "#F1EEFE", quickSlug: "criminal" },
  { icon: "💔", title: "이혼", desc: "재산분할, 양육권 등", bg: "#FFEEF3", quickSlug: "divorce" },
  { icon: "🏠", title: "부동산", desc: "전세, 매매, 임대차 등", bg: "#E8FAF0", quickSlug: "realestate" },
  { icon: "💼", title: "노동", desc: "해고, 임금, 산재 등", bg: "#FFF1E5", quickSlug: "labor" },
  { icon: "📄", title: "계약", desc: "계약서 검토, 분쟁 등", bg: "#E8F2FF", quickSlug: "contract" },
  { icon: "🛡️", title: "손해배상", desc: "교통사고, 의료 등", bg: "#FFF8E1", quickSlug: "damages" },
];

interface CaseSample {
  category: string;
  title: string;
  ago: string;
  lawyersCount: number;
  status: "complete" | "progress";
}

const RECENT_CASES: CaseSample[] = [
  {
    category: "형사",
    title: "음주운전 1회차, 혈중알코올 0.08% 적발",
    ago: "2시간 전",
    lawyersCount: 7,
    status: "complete",
  },
  {
    category: "부동산",
    title: "전세 계약 만료 후 보증금 반환 거부",
    ago: "5시간 전",
    lawyersCount: 12,
    status: "complete",
  },
  {
    category: "이혼",
    title: "배우자 외도로 인한 이혼 재산분할 문제",
    ago: "8시간 전",
    lawyersCount: 9,
    status: "complete",
  },
  {
    category: "노동",
    title: "부당해고 통보, 근무기간 3년 정규직",
    ago: "12시간 전",
    lawyersCount: 11,
    status: "complete",
  },
  {
    category: "형사",
    title: "폭행 피해, 전치 3주 진단서 발급",
    ago: "1일 전",
    lawyersCount: 8,
    status: "complete",
  },
  {
    category: "계약",
    title: "프랜차이즈 계약 해지 위약금 분쟁",
    ago: "1일 전",
    lawyersCount: 6,
    status: "progress",
  },
];

function anonymizeName(fullName: string): string {
  return `${fullName.charAt(0)}○○`;
}

function anonymizeFirm(firm: string): string {
  if (firm.startsWith("법무법인")) return "법무법인 ○○";
  return "○○ 법률사무소";
}

const SUB_CATEGORIES: SubCategory[] = [
  { icon: "🍺", title: "음주운전", bg: "#FFE5E5" },
  { icon: "👊", title: "폭행·상해", bg: "#FFEBE0" },
  { icon: "💰", title: "재산분할", bg: "#FFF4D6" },
  { icon: "🏢", title: "임대차", bg: "#E5F4FE" },
  { icon: "💳", title: "사기·횡령", bg: "#F3E8FF" },
  { icon: "👶", title: "양육권", bg: "#FFE8F0" },
  { icon: "📋", title: "임금체불", bg: "#FFF4E5" },
  { icon: "🚗", title: "교통사고", bg: "#E5F0FF" },
  { icon: "💊", title: "의료사고", bg: "#E8F8F2" },
  { icon: "🔒", title: "성범죄", bg: "#FFE0E5" },
  { icon: "📱", title: "명예훼손", bg: "#EAF2FF" },
  { icon: "🏦", title: "대출·채무", bg: "#F8F4E8" },
];

type Pastel = { bg: string; text: string };

const CATEGORY_PASTEL: Record<string, Pastel> = {
  criminal: { bg: "#F1EEFE", text: "#6E59C7" },
  divorce: { bg: "#FFEEF3", text: "#D74878" },
  realestate: { bg: "#E8FAF0", text: "#00A65A" },
  labor: { bg: "#FFF1E5", text: "#E27A1E" },
  contract: { bg: "#E8F2FF", text: "#2D7DD2" },
  damages: { bg: "#FFF8E1", text: "#B0851A" },
};

function pillByName(name: string): Pastel {
  switch (name) {
    case "형사":
      return CATEGORY_PASTEL.criminal;
    case "이혼":
    case "가사":
      return CATEGORY_PASTEL.divorce;
    case "부동산":
      return CATEGORY_PASTEL.realestate;
    case "노동":
      return CATEGORY_PASTEL.labor;
    case "계약":
      return CATEGORY_PASTEL.contract;
    case "손해배상":
      return CATEGORY_PASTEL.damages;
    default:
      return { bg: "#F2F4F6", text: "#4E5968" };
  }
}

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showAllCases, setShowAllCases] = useState(false);

  function startWithText(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    router.push(`/chat/${generateId()}?seed=${encodeURIComponent(trimmed)}`);
  }
  function startWithQuick(slug: string) {
    router.push(`/chat/${generateId()}?quick=${slug}`);
  }

  return (
    <main className="min-h-screen bg-[#F4F5F7] page-enter">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E8EB] pt-safe-top">
        <div className="max-w-md mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[20px] font-bold tracking-tight text-[#191F28]">
            <RobotMascot size="sm" className="w-7 h-auto" />
            법률<span className="text-[#4338CA]">AI</span>
          </Link>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section
        className="px-6 lg:px-8 pt-16 pb-4 lg:pt-20 lg:pb-6"
        style={{
          background: "linear-gradient(180deg, #F8F7FF 0%, #F4F5F7 100%)",
        }}
      >
        <div className="max-w-[800px] mx-auto">
          <div className="lg:flex lg:items-start lg:gap-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="lg:hidden">
                  <RobotMascot size="sm" className="w-9 h-auto animate-float" />
                </span>
                <span className="inline-flex items-center text-[13px] lg:text-[14px] font-semibold px-3.5 h-8 rounded-full bg-[#4338CA] text-white tracking-tight">
                  AI 법률 상담
                </span>
              </div>

              <h1 className="mt-6 text-[28px] lg:text-[56px] font-bold leading-[1.2] tracking-[-0.025em] text-[#191F28]">
                {renderWaveChars(HERO_TITLE_LINE_1, 0)}
                <br />
                {renderWaveChars(HERO_TITLE_LINE_2, HERO_TITLE_LINE_1.length)}
              </h1>

              <p className="text-gold-shimmer mt-5 lg:mt-6 text-[18px] lg:text-[19px] leading-[1.6]">
                한국 법령·판례 기반 분석부터 전문 변호사 매칭까지
              </p>
            </div>

            {/* Desktop mascot — to the right of title block */}
            <div className="hidden lg:block shrink-0 pt-2">
              <RobotMascot size="md" className="animate-float" />
            </div>
          </div>

          {/* Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = query.trim();
              if (trimmed) {
                startWithText(trimmed);
              } else {
                router.push(`/chat/${generateId()}`);
              }
            }}
            className="mt-8"
          >
            <div className="search-indigo flex items-center gap-2 pr-2 pl-5 rounded-2xl h-[64px]">
              <svg
                className="w-5 h-5 text-[#8B95A1] shrink-0"
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="법률 고민을 입력하세요"
                aria-label="법률 고민 입력"
                className="lg:hidden min-w-0 flex-1 bg-transparent outline-none pl-1 text-[16px] font-medium text-[#191F28] placeholder:text-[#8B95A1]"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="어떤 법률 문제가 있으신가요?"
                aria-label="법률 고민 입력"
                className="hidden lg:block min-w-0 flex-1 bg-transparent outline-none pl-1 text-[17px] font-medium text-[#191F28] placeholder:text-[#8B95A1]"
              />
              <button
                type="submit"
                className="btn-indigo btn-indigo-pulse rounded-xl px-5 lg:px-6 h-12 text-[15px] lg:text-[16px] shrink-0 whitespace-nowrap font-semibold"
              >
                상담 시작
              </button>
            </div>
          </form>

          {/* Trending keywords */}
          <div className="mt-7">
            <p className="text-[14px] font-medium text-[#8B95A1] mb-3">
              요즘 많이 묻는 상담
            </p>
            <div className="flex flex-wrap gap-2">
              {TRENDING.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => startWithText(kw)}
                  className="inline-flex items-center text-[15px] font-medium text-[#4E5968] bg-white border border-[#E5E8EB] hover:border-[#4338CA] hover:text-[#4338CA] px-4 h-10 rounded-full transition-colors duration-200"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {/* Trust stats card */}
          <div className="mt-8 bg-white rounded-2xl px-2 py-5 lg:px-3 lg:py-6 grid grid-cols-2 lg:grid-cols-4 shadow-[0_1px_2px_rgba(25,31,40,0.04),0_1px_4px_rgba(25,31,40,0.04)]">
            {TRUST_STATS.map((s, i) => {
              const borders = [
                (i === 0 || i === 2) && "border-r border-[#F2F4F6]",
                (i === 0 || i === 1) && "border-b border-[#F2F4F6] lg:border-b-0",
                i === 1 && "lg:border-r lg:border-[#F2F4F6]",
                i < 2 ? "pb-4 lg:pb-0" : "pt-4 lg:pt-0",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <div
                  key={s.label}
                  className={`text-center px-1 lg:px-2 ${borders}`}
                >
                  <div className="text-[22px] lg:text-[36px] font-bold text-[#4338CA] leading-none tracking-tight text-mono-num">
                    <CountUpLoop
                      target={s.target}
                      decimals={s.decimals}
                      suffix={s.suffix}
                    />
                  </div>
                  <div className="mt-1.5 lg:mt-2 text-[11px] lg:text-[13px] text-[#8B95A1] font-medium">
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Categories — auto-rolling marquee ===== */}
      <section className="pt-3 pb-12 lg:pt-4 lg:pb-16">
        <ScrollReveal className="px-6 lg:px-8 max-w-[800px] mx-auto">
          <div className="mb-6 lg:mb-7">
            <h2 className="text-[24px] lg:text-[28px] font-bold text-[#191F28] tracking-tight">
              상담 분야
            </h2>
            <p className="mt-1.5 text-[14px] lg:text-[15px] text-[#8B95A1] font-medium">
              어떤 고민이든 시작해보세요
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-3 lg:space-y-4">
          {/* Row 1 — main 6, scrolls left */}
          <div className="marquee-wrap">
            <div className="marquee-track marquee-track--left">
              {[...MAIN_CATEGORIES, ...MAIN_CATEGORIES, ...MAIN_CATEGORIES].map((cat, i) => (
                <button
                  key={`row1-${i}`}
                  type="button"
                  onClick={() => startWithQuick(cat.quickSlug)}
                  aria-hidden={i >= MAIN_CATEGORIES.length || undefined}
                  className="shrink-0 mr-4 inline-flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-transparent hover:border-[#4338CA] transition-colors duration-200 cursor-pointer"
                >
                  <span
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-[22px] shrink-0"
                    style={{ backgroundColor: cat.bg }}
                  >
                    {cat.icon}
                  </span>
                  <div className="text-left">
                    <p className="text-[15px] font-bold text-[#191F28] tracking-tight whitespace-nowrap">
                      {cat.title}
                    </p>
                    <p className="text-[12px] text-[#8B95A1] font-medium whitespace-nowrap">
                      {cat.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-16 lg:w-24"
              style={{ background: "linear-gradient(to right, #F4F5F7 0%, rgba(244,245,247,0) 100%)" }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-16 lg:w-24"
              style={{ background: "linear-gradient(to left, #F4F5F7 0%, rgba(244,245,247,0) 100%)" }}
            />
          </div>

          {/* Row 2 — sub 12, scrolls right */}
          <div className="marquee-wrap">
            <div className="marquee-track marquee-track--right">
              {[...SUB_CATEGORIES, ...SUB_CATEGORIES, ...SUB_CATEGORIES].map((cat, i) => (
                <button
                  key={`row2-${i}`}
                  type="button"
                  onClick={() => startWithText(cat.title)}
                  aria-hidden={i >= SUB_CATEGORIES.length || undefined}
                  className="shrink-0 mr-3 inline-flex items-center gap-2 bg-white border border-[#E5E8EB] hover:border-[#4338CA] rounded-full pl-1.5 pr-3.5 h-10 transition-colors duration-200 cursor-pointer"
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[15px] shrink-0"
                    style={{ backgroundColor: cat.bg }}
                  >
                    {cat.icon}
                  </span>
                  <span className="text-[14px] font-medium text-[#191F28] whitespace-nowrap">
                    {cat.title}
                  </span>
                </button>
              ))}
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-16 lg:w-24"
              style={{ background: "linear-gradient(to right, #F4F5F7 0%, rgba(244,245,247,0) 100%)" }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-16 lg:w-24"
              style={{ background: "linear-gradient(to left, #F4F5F7 0%, rgba(244,245,247,0) 100%)" }}
            />
          </div>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section className="px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto">
          <ScrollReveal>
            <h2 className="text-[24px] lg:text-[28px] font-bold text-[#191F28] tracking-tight mb-7 lg:mb-9 max-w-[800px]">
              어떻게 진행되나요?
            </h2>
          </ScrollReveal>
          <HowItWorks />
        </div>
      </section>

      {/* ===== Why 법률AI ===== */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto">
          <ScrollReveal className="px-6 lg:px-8 mb-7 lg:mb-9 max-w-[800px]">
            <h2 className="text-[24px] lg:text-[28px] font-bold text-[#191F28] tracking-tight">
              왜 법률AI인가요?
            </h2>
          </ScrollReveal>
          <WhyCards />
        </div>
      </section>

      {/* ===== Recent cases ===== */}
      <section className="px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto">
          <ScrollReveal className="max-w-[800px] mb-7 lg:mb-9">
            <h2 className="text-[24px] lg:text-[28px] font-bold text-[#191F28] tracking-tight">
              최근 상담 사례
            </h2>
            <p className="mt-2 text-[14px] lg:text-[15px] text-[#8B95A1] font-medium leading-[1.6]">
              실제 사용자들의 AI 상담 후 변호사 매칭 현황입니다
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {RECENT_CASES.map((c, i) => (
              <ScrollReveal
                key={i}
                delay={i * 80}
                className={i >= 3 && !showAllCases ? "hidden md:block" : ""}
              >
                <CaseCard {...c} />
              </ScrollReveal>
            ))}
          </div>

          {!showAllCases && (
            <div className="md:hidden mt-5 text-center">
              <button
                type="button"
                onClick={() => setShowAllCases(true)}
                className="inline-flex items-center gap-1.5 px-6 h-11 rounded-full bg-white border border-[#E5E8EB] hover:border-[#4338CA] text-[14px] font-semibold text-[#191F28] hover:text-[#4338CA] transition-colors duration-200"
              >
                더보기
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ===== CTA banner ===== */}
      <section className="px-6 lg:px-8 py-16 lg:py-20">
        <ScrollReveal className="max-w-[800px] mx-auto">
          <button
            type="button"
            onClick={() => router.push(`/chat/${generateId()}`)}
            className="w-full text-left bg-white rounded-2xl p-6 lg:p-7 flex items-center gap-4 relative overflow-hidden hover:bg-[#FAFBFC] transition-colors duration-200"
            style={{
              boxShadow: "0 1px 2px rgba(25,31,40,0.04), 0 1px 4px rgba(25,31,40,0.04)",
            }}
          >
            <span
              aria-hidden
              className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-[#4338CA]"
            />
            <div className="flex-1 min-w-0 pl-3">
              <p className="text-[18px] lg:text-[20px] font-bold text-[#191F28] leading-[1.4]">
                법률 문제, 혼자 고민하지 마세요
              </p>
              <p className="mt-1.5 text-[15px] lg:text-[16px] font-semibold text-[#4338CA] inline-flex items-center gap-1.5">
                지금 바로 AI에게 물어보세요
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </p>
            </div>
            <RobotMascot size="md" className="shrink-0 animate-float" />
          </button>
        </ScrollReveal>
      </section>

      {/* ===== Lawyer section ===== */}
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto">
          <ScrollReveal className="px-6 lg:px-8 mb-7 lg:mb-9 max-w-[800px]">
            <div className="flex items-end justify-between">
              <h2 className="text-[24px] lg:text-[28px] font-bold text-[#191F28] tracking-tight">
                함께하는 전문 변호사
              </h2>
              <Link
                href="/lawyers"
                className="text-[14px] lg:text-[15px] font-semibold text-[#4338CA] hover:text-[#6366F1] transition-colors"
              >
                전체 보기 →
              </Link>
            </div>
          </ScrollReveal>
          <LawyerScroll lawyers={DEMO_LAWYERS} />
        </div>
      </section>

      <Footer />
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function renderWaveChars(text: string, startIdx: number) {
  return Array.from(text).map((ch, i) => {
    if (ch === " ") {
      return (
        <span key={i} className="inline-block">
          {" "}
        </span>
      );
    }
    return (
      <span
        key={i}
        className="hero-wave-char"
        style={{ animationDelay: `${(startIdx + i) * 0.05}s` }}
      >
        {ch}
      </span>
    );
  });
}

function CountUpLoop({
  target,
  decimals,
  suffix,
  duration = 5000,
  hold = 2000,
}: {
  target: number;
  decimals: number;
  suffix: string;
  duration?: number;
  hold?: number;
}) {
  const [value, setValue] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    let cycleStart = performance.now();
    const cycleLength = duration + hold;

    const tick = (now: number) => {
      if (cancelled) return;
      let elapsed = now - cycleStart;
      if (elapsed >= cycleLength) {
        cycleStart = now;
        elapsed = 0;
        setValue(0);
        setDone(false);
      } else if (elapsed < duration) {
        const t = elapsed / duration;
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(target * eased);
        setDone(false);
      } else {
        setValue(target);
        setDone(true);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [target, duration, hold]);

  const display =
    decimals > 0
      ? value.toFixed(decimals)
      : Math.round(value).toLocaleString("ko-KR");

  return (
    <>
      {display}
      {done && suffix}
    </>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: "상황을 설명해주세요",
      desc: "채팅으로 법률 상황을 알려주시면 됩니다. 어려운 법률 용어를 몰라도 괜찮아요.",
    },
    {
      title: "AI가 분석해드립니다",
      desc: "적용 법령, 관련 판례, 핵심 쟁점을 정리해서 알려드립니다. 무료예요.",
    },
    {
      title: "변호사가 제안합니다",
      desc: "분석 결과를 본 전문 변호사들이 상담비와 의견을 보내드립니다. 비교하고 선택하세요.",
    },
  ];

  return (
    <ol className="relative lg:grid lg:grid-cols-3 lg:gap-6 space-y-3 lg:space-y-0">
      {steps.map((s, i) => (
        <ScrollReveal as="li" key={i} delay={i * 100} className="relative">
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className="lg:hidden absolute left-[33px] top-[60px] bottom-[-12px] w-px"
              style={{
                backgroundImage:
                  "linear-gradient(to bottom, rgba(67,56,202,0.4) 50%, transparent 50%)",
                backgroundSize: "1px 8px",
                backgroundRepeat: "repeat-y",
              }}
            />
          )}
          <article className="card-toss h-full px-6 py-6 lg:px-7 lg:py-8 flex items-start gap-4">
            <span className="shrink-0 w-10 h-10 rounded-full bg-[#4338CA] text-white text-[16px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[18px] lg:text-[20px] font-bold text-[#191F28] leading-[1.4]">
                {s.title}
              </p>
              <p className="mt-2 text-[15px] lg:text-[16px] text-[#8B95A1] leading-[1.65]">
                {s.desc}
              </p>
            </div>
          </article>
        </ScrollReveal>
      ))}
    </ol>
  );
}

function WhyCards() {
  const items = [
    {
      bg: "#EEF2FF",
      emoji: "🤖",
      title: "일반 AI와 다릅니다",
      desc: "일반 AI는 한국 법을 정확히 알지 못합니다. 법률AI는 한국 법령·판례를 기반으로 분석합니다.",
    },
    {
      bg: "#E8FAF0",
      emoji: "💰",
      title: "무료로 먼저 파악합니다",
      desc: "기존 서비스는 상담비를 먼저 내야 합니다. 법률AI는 AI 분석이 무료입니다.",
    },
    {
      bg: "#F0EBFF",
      emoji: "⚡",
      title: "변호사가 먼저 제안합니다",
      desc: "변호사를 찾아다닐 필요 없습니다. 분석 결과를 본 변호사가 직접 견적을 보냅니다.",
    },
  ];

  return (
    <div className="overflow-x-auto no-scrollbar md:overflow-visible">
      <ul
        className="flex gap-3 px-6
                   md:grid md:grid-cols-2 md:gap-4 md:px-6 md:max-w-[768px] md:mx-auto
                   lg:grid-cols-3 lg:gap-6 lg:px-8 lg:max-w-none"
      >
        {items.map((it, i) => (
          <ScrollReveal
            as="li"
            key={it.title}
            delay={i * 100}
            className="snap-start shrink-0 w-[80%] max-w-[340px]
                       md:w-auto md:max-w-none md:shrink md:h-full"
          >
            <div
              className="rounded-2xl p-7 lg:p-9 lg:min-h-[280px] h-full flex flex-col"
              style={{ backgroundColor: it.bg }}
            >
              <span className="block text-[48px] lg:text-[56px] leading-none">
                {it.emoji}
              </span>
              <p className="mt-5 text-[20px] lg:text-[22px] font-bold text-[#191F28] tracking-tight leading-[1.35]">
                {it.title}
              </p>
              <p className="mt-3 text-[15px] lg:text-[16px] text-[#4E5968] leading-[1.65]">
                {it.desc}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </ul>
    </div>
  );
}

function CaseCard({
  category,
  title,
  ago,
  lawyersCount,
  status,
}: CaseSample) {
  const pill = pillByName(category);
  const isDone = status === "complete";
  return (
    <article className="bg-white rounded-2xl p-5 lg:p-6 shadow-[0_1px_2px_rgba(25,31,40,0.04),0_1px_4px_rgba(25,31,40,0.04)] hover:shadow-[0_8px_24px_-8px_rgba(25,31,40,0.12)] hover:-translate-y-0.5 transition-all duration-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[12px] font-semibold px-2.5 h-6 leading-6 rounded-full"
          style={{ backgroundColor: pill.bg, color: pill.text }}
        >
          {category}
        </span>
        <span className="text-[12px] text-[#B0B8C1] font-medium">{ago}</span>
      </div>
      <p className="text-[15px] lg:text-[16px] text-[#191F28] font-bold leading-[1.5] line-clamp-2 min-h-[48px]">
        {title}
      </p>
      <div className="mt-auto pt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[13px] text-[#4338CA] font-bold min-w-0">
          <svg
            className="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="9" cy="8" r="3" />
            <circle cx="17" cy="8" r="2.5" />
            <path
              d="M3 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1M14 14h3a3 3 0 0 1 3 3v1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="truncate">{lawyersCount}명의 변호사가 제안</span>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 h-6 leading-6 rounded-full ${
            isDone
              ? "bg-[#ECFDF5] text-[#047857]"
              : "bg-[#FFF7ED] text-[#C2410C]"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isDone ? "bg-[#10B981]" : "bg-[#F97316]"
            }`}
          />
          {isDone ? "매칭 완료" : "매칭 진행중"}
        </span>
      </div>
    </article>
  );
}

function LawyerScroll({ lawyers }: { lawyers: Lawyer[] }) {
  const tripled = [...lawyers, ...lawyers, ...lawyers];
  return (
    <div className="marquee-wrap">
      <div className="marquee-track marquee-track--lawyers">
        {tripled.map((lawyer, i) => (
          <div
            key={`lw-${i}`}
            aria-hidden={i >= lawyers.length || undefined}
            className="shrink-0 mr-3 lg:mr-4 w-[220px] lg:w-[260px]"
          >
            <LawyerCard lawyer={lawyer} />
          </div>
        ))}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-12 lg:w-20"
        style={{
          background:
            "linear-gradient(to right, #ffffff 0%, rgba(255,255,255,0) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-12 lg:w-20"
        style={{
          background:
            "linear-gradient(to left, #ffffff 0%, rgba(255,255,255,0) 100%)",
        }}
      />
    </div>
  );
}

function LawyerCard({ lawyer }: { lawyer: Lawyer }) {
  return (
    <div className="h-full bg-white rounded-2xl border border-[#E5E8EB] p-5 lg:p-6 text-center flex flex-col">
      <div className="relative w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full bg-[#F2F4F6]" />
        <div className="absolute inset-0 rounded-full flex items-center justify-center text-[28px] lg:text-[32px]">
          {lawyer.avatar}
        </div>
      </div>

      <p className="text-[15px] lg:text-[16px] font-bold text-[#191F28] tracking-tight">
        {anonymizeName(lawyer.name)} 변호사
      </p>
      <p className="mt-1 text-[12px] lg:text-[13px] text-[#8B95A1] font-medium truncate">
        {anonymizeFirm(lawyer.firm)}
      </p>

      <div className="mt-3 flex flex-wrap gap-1 justify-center">
        {lawyer.specialties.slice(0, 2).map((s) => {
          const p = pillByName(s);
          return (
            <span
              key={s}
              className="text-[11px] font-semibold px-2 h-6 leading-6 rounded-full"
              style={{ backgroundColor: p.bg, color: p.text }}
            >
              {s}
            </span>
          );
        })}
      </div>

      <div className="mt-auto pt-4 border-t border-[#F2F4F6] flex items-center justify-center gap-2 text-[12px] lg:text-[13px] text-[#8B95A1] font-medium">
        <span>경력 {lawyer.yearsExperience}년</span>
        <span className="text-[#E5E8EB]">·</span>
        <span className="text-[#191F28] font-bold inline-flex items-center gap-0.5">
          <svg className="w-3 h-3 text-[#FFB400]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {lawyer.rating.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
