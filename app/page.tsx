"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateId } from "@/lib/storage";
import { DEMO_LAWYERS } from "@/lib/lawyers";
import ScrollReveal from "@/components/ScrollReveal";
import LawselLogo from "@/components/LawselLogo";
import { useAuth } from "@/components/AuthProvider";
import { BLOG_POSTS, CATEGORY_COLOR } from "@/lib/blog-data";
import type { Lawyer } from "@/lib/types";

/* ─── 인라인 아이콘 ──────────────────────────────────────── */
const Ic = {
  search: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  ),
  chat: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  users: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  bell: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  userCircle: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  ),
  chevronRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  arrowRight: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  ),
  star: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
};

/* ─── 데이터 ─────────────────────────────────────────────── */
const POPULAR = [
  { emoji: "🏠", label: "전세보증금 분쟁",  seed: "전세보증금을 돌려받지 못하고 있어요" },
  { emoji: "👨‍👩‍👧", label: "이혼/재산분할",   seed: "이혼 재산분할 상담이 필요해요" },
  { emoji: "🚗", label: "교통사고 합의",   seed: "교통사고 합의금 상담이 필요해요" },
  { emoji: "👮", label: "형사 변호",       seed: "형사 사건 변호 상담이 필요해요" },
  { emoji: "💰", label: "임금체불 해결",   seed: "임금체불 해결 방법을 알고 싶어요" },
];

type QuickSlug = "criminal" | "divorce" | "realestate" | "labor" | "contract" | "damages";

const MAIN_CATEGORIES = [
  { icon: "⚖️", title: "형사",     desc: "폭행, 사기, 횡령 등",    bg: "#F1EEFE", quickSlug: "criminal"   as QuickSlug },
  { icon: "💔", title: "이혼",     desc: "재산분할, 양육권 등",     bg: "#FFEEF3", quickSlug: "divorce"    as QuickSlug },
  { icon: "🏠", title: "부동산",   desc: "전세, 매매, 임대차 등",   bg: "#E8FAF0", quickSlug: "realestate" as QuickSlug },
  { icon: "💼", title: "노동",     desc: "해고, 임금, 산재 등",     bg: "#FFF1E5", quickSlug: "labor"      as QuickSlug },
  { icon: "📄", title: "계약",     desc: "계약서 검토, 분쟁 등",    bg: "#E8F2FF", quickSlug: "contract"   as QuickSlug },
  { icon: "🛡️", title: "손해배상", desc: "교통사고, 의료 등",       bg: "#FFF8E1", quickSlug: "damages"    as QuickSlug },
];

const SUB_CATEGORIES = [
  { icon: "🍺", title: "음주운전",  bg: "#FFE5E5" },
  { icon: "👊", title: "폭행·상해", bg: "#FFEBE0" },
  { icon: "💰", title: "재산분할",  bg: "#FFF4D6" },
  { icon: "🏢", title: "임대차",    bg: "#E5F4FE" },
  { icon: "💳", title: "사기·횡령", bg: "#F3E8FF" },
  { icon: "👶", title: "양육권",    bg: "#FFE8F0" },
  { icon: "📋", title: "임금체불",  bg: "#FFF4E5" },
  { icon: "🚗", title: "교통사고",  bg: "#E5F0FF" },
  { icon: "💊", title: "의료사고",  bg: "#E8F8F2" },
  { icon: "🔒", title: "성범죄",    bg: "#FFE0E5" },
  { icon: "📱", title: "명예훼손",  bg: "#EAF2FF" },
  { icon: "🏦", title: "대출·채무", bg: "#F8F4E8" },
];

const AI_CASES = [
  {
    category: "부동산",
    title: "전세보증금 5천만원 미반환",
    summary: "임대차 기간 만료 후 4개월째 보증금을 돌려받지 못하고 있습니다. 집주인이 연락을 피하고 있어요.",
    ago: "방금 전",
  },
  {
    category: "형사",
    title: "음주운전 2회 적발 처벌 수위",
    summary: "음주운전으로 두 번째 적발되었습니다. 면허 취소와 실형 가능성이 있는지 확인이 필요합니다.",
    ago: "1시간 전",
  },
  {
    category: "노동",
    title: "직장 내 괴롭힘 퇴사 후 대응",
    summary: "상사의 지속적인 폭언으로 퇴사했습니다. 퇴사 후에도 위자료 청구가 가능한지 궁금합니다.",
    ago: "3시간 전",
  },
  {
    category: "이혼",
    title: "배우자 외도 증거 확보 방법",
    summary: "배우자 외도가 의심되어 이혼을 결심했습니다. 재산분할에서 유리한 위치를 잡으려면 어떻게 해야 하나요.",
    ago: "5시간 전",
  },
  {
    category: "계약",
    title: "프리랜서 계약금 150만원 미지급",
    summary: "프로젝트 완료 후 계약금을 받지 못하고 있습니다. 법적으로 어떤 조치를 취할 수 있나요.",
    ago: "8시간 전",
  },
];

const recentBlogs = [...BLOG_POSTS]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 4);

const TRUST_STATS = [
  { target: 9999, decimals: 0, suffix: "+",  label: "AI 상담" },
  { target: 500,  decimals: 0, suffix: "+",  label: "검증 변호사" },
  { target: 30,   decimals: 0, suffix: "초", label: "평균 매칭" },
  { target: 4.8,  decimals: 1, suffix: "/5", label: "만족도" },
];

/* ─── 유틸 함수 ──────────────────────────────────────────── */
type Pastel = { bg: string; text: string };
const CATEGORY_PASTEL: Record<string, Pastel> = {
  criminal:   { bg: "#F1EEFE", text: "#6E59C7" },
  divorce:    { bg: "#FFEEF3", text: "#D74878" },
  realestate: { bg: "#E8FAF0", text: "#00A65A" },
  labor:      { bg: "#FFF1E5", text: "#E27A1E" },
  contract:   { bg: "#E8F2FF", text: "#2D7DD2" },
  damages:    { bg: "#FFF8E1", text: "#B0851A" },
};

function pillByName(name: string): Pastel {
  switch (name) {
    case "형사":                     return CATEGORY_PASTEL.criminal;
    case "이혼": case "가사":        return CATEGORY_PASTEL.divorce;
    case "부동산":                   return CATEGORY_PASTEL.realestate;
    case "노동":                     return CATEGORY_PASTEL.labor;
    case "계약":                     return CATEGORY_PASTEL.contract;
    case "손해배상": case "교통사고": return CATEGORY_PASTEL.damages;
    default: return { bg: "#F2F4F6", text: "#4E5968" };
  }
}

function anonymizeName(n: string) { return `${n.charAt(0)}○○`; }
function anonymizeFirm(f: string) {
  return f.startsWith("법무법인") ? "법무법인 ○○" : "○○ 법률사무소";
}

/* ─── 신뢰 지표 카운터 (즉시 시작, 한 번만) ─────────────── */
function StatCell({
  target, decimals, suffix, label,
}: (typeof TRUST_STATS)[0]) {
  const [n, setN] = useState(0);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || fired.current) return;
      fired.current = true;
      const dur = 1000;
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - t0) / dur, 1);
        setN(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
        else { setN(target); setDone(true); }
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);

  const display = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString("ko-KR");

  return (
    <div ref={ref} className="text-center py-4 px-2">
      <p className="text-[22px] font-extrabold text-[#4338CA] leading-none tabular-nums">
        {display}{done ? suffix : ""}
      </p>
      <p className="mt-1.5 text-[11px] text-[#6B7280] font-medium">{label}</p>
    </div>
  );
}

/* ─── 어떻게 진행되나요 ──────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      n: 1,
      title: "상황을 설명해주세요",
      desc: "채팅으로 법률 상황을 알려주시면 됩니다. 어려운 법률 용어를 몰라도 괜찮아요.",
    },
    {
      n: 2,
      title: "AI가 분석해드립니다",
      desc: "적용 법령, 관련 판례, 핵심 쟁점을 정리해서 알려드립니다. 무료예요.",
    },
    {
      n: 3,
      title: "변호사가 제안합니다",
      desc: "분석 결과를 본 전문 변호사들이 상담비와 의견을 보내드립니다. 비교하고 선택하세요.",
    },
  ];

  return (
    <div className="space-y-3 px-5">
      {steps.map((s, i) => (
        <ScrollReveal key={i} delay={i * 80}>
          <div className="bg-white rounded-2xl px-5 py-5 flex items-start gap-4 shadow-[0_1px_6px_rgba(0,0,0,0.05)] border border-[#F0F0F0]">
            <span className="shrink-0 w-9 h-9 rounded-full bg-[#4338CA] text-white text-[14px] font-extrabold flex items-center justify-center">
              {s.n}
            </span>
            <div>
              <p className="text-[15px] font-bold text-[#111827] leading-snug">{s.title}</p>
              <p className="mt-1 text-[13px] text-[#6B7280] leading-relaxed">{s.desc}</p>
            </div>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}

const WHY_ITEMS = [
  {
    bg: "#EEF2FF",
    emoji: "🤖",
    title: "일반 AI와 다릅니다",
    desc: "일반 AI는 한국 법을 정확히 알지 못합니다. 로셀은 한국 법령·판례를 기반으로 분석합니다.",
  },
  {
    bg: "#E8FAF0",
    emoji: "💰",
    title: "무료로 먼저 파악합니다",
    desc: "기존 서비스는 상담비를 먼저 내야 합니다. 로셀은 AI 분석이 무료입니다.",
  },
  {
    bg: "#F0EBFF",
    emoji: "⚡",
    title: "변호사가 먼저 제안합니다",
    desc: "변호사를 찾아다닐 필요 없습니다. 분석 결과를 본 변호사가 직접 견적을 보냅니다.",
  },
];

/* ─── 최근 AI 상담 사례 카드 ─────────────────────────────── */
function AICaseCard({ category, title, summary, ago }: (typeof AI_CASES)[0]) {
  const pill = pillByName(category);
  return (
    <article className="w-[268px] bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#F3F4F6] flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span
          className="text-[12px] font-semibold px-2.5 h-6 leading-6 rounded-full"
          style={{ backgroundColor: pill.bg, color: pill.text }}
        >
          {category}
        </span>
        <span className="text-[12px] text-[#9CA3AF]">{ago}</span>
      </div>
      <p className="text-[15px] font-bold text-[#111827] leading-snug">{title}</p>
      <p className="text-[13px] text-[#6B7280] leading-relaxed line-clamp-2 flex-1">{summary}</p>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#4338CA] bg-[#EEF2FF] px-2.5 h-6 rounded-full self-start">
        <span className="w-1.5 h-1.5 rounded-full bg-[#4338CA]" />
        AI가 분석한 사례
      </span>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────
   AutoCarousel
   - 3초마다 한 칸 자동 이동 (setInterval + scrollTo smooth)
   - 터치/마우스 드래그로 수동 스와이프
   - 상호작용 중 정지, 0.5초 후 재개
   - 내부적으로 items를 2배 복제하여 무한 루프
   - 끝에서 첫 복제본(= 원본 첫 카드)으로 smooth 이동 후
     즉시 원본 위치로 silent reset → 끊김 없는 루프
───────────────────────────────────────────────────────── */
function AutoCarousel({
  children,
  interval = 3000,
  className = "",
}: {
  children: React.ReactNode;
  interval?: number;
  className?: string;
}) {
  const ref      = useRef<HTMLDivElement>(null);
  const idxRef   = useRef(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const interRef  = useRef(false);
  const resetRef  = useRef(false);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const childArr = Children.toArray(children);
  const n = childArr.length;

  // [data-ci] 속성으로 DOM 아이템 조회
  const getItem = useCallback((i: number) => {
    return ref.current?.querySelectorAll<HTMLElement>("[data-ci]")[i] ?? null;
  }, []);

  const scrollTo = useCallback((i: number, instant = false) => {
    const el = ref.current;
    const item = getItem(i);
    if (!el || !item) return;
    el.scrollTo({ left: item.offsetLeft, behavior: instant ? "auto" : "smooth" });
  }, [getItem]);

  const advance = useCallback(() => {
    if (interRef.current || resetRef.current || n === 0) return;
    const next = idxRef.current + 1;

    if (next >= n) {
      // n번째 = 원본 0번 복제본 → 여기로 smooth 이동
      scrollTo(n);
      idxRef.current = n;
      resetRef.current = true;
      // 애니메이션(~500ms) 완료 후 invisible 복귀
      setTimeout(() => {
        scrollTo(0, true);
        idxRef.current = 0;
        resetRef.current = false;
      }, 700);
    } else {
      scrollTo(next);
      idxRef.current = next;
    }
  }, [n, scrollTo]);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(advance, interval);
  }, [advance, interval]);

  useEffect(() => {
    startTimer();
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(resumeRef.current);
    };
  }, [startTimer]);

  const onStart = useCallback(() => {
    interRef.current = true;
    clearInterval(timerRef.current);
    clearTimeout(resumeRef.current);
  }, []);

  const onEnd = useCallback(() => {
    clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => {
      // 현재 스크롤 위치에서 가장 가까운 원본 아이템 인덱스 동기화
      const el = ref.current;
      if (el && n > 0) {
        const cx = el.scrollLeft + el.clientWidth / 2;
        let best = 0, bestD = Infinity;
        for (let i = 0; i < n; i++) {
          const item = getItem(i);
          if (!item) continue;
          const d = Math.abs(item.offsetLeft + item.offsetWidth / 2 - cx);
          if (d < bestD) { bestD = d; best = i; }
        }
        idxRef.current = best;
      }
      interRef.current = false;
      startTimer();
    }, 500);
  }, [n, getItem, startTimer]);

  const doubled = [...childArr, ...childArr];

  return (
    <div
      ref={ref}
      className={`flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden ${className}`}
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      onTouchStart={onStart}
      onTouchEnd={onEnd}
      onMouseDown={onStart}
      onMouseUp={onEnd}
    >
      {doubled.map((child, i) => (
        <div key={i} data-ci={i} className="flex-none snap-start">
          {child}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   ContinuousMarquee
   CSS transform + animation 방식의 끊김 없는 연속 스크롤.
   globals.css의 marquee-track--left/right/lawyers 클래스 사용.
   아이템을 3배 복제하여 -33.33% translateX 루프.
   마우스 호버: CSS (.marquee-wrap:hover) 자동 정지.
   터치: animationPlayState 직접 제어.
───────────────────────────────────────────────────────── */
function ContinuousMarquee({
  children,
  trackClass = "marquee-track--left",
  itemGap = "mr-3",
  fadeBg = "#F9FAFB",
}: {
  children: React.ReactNode;
  trackClass?: string;
  itemGap?: string;
  fadeBg?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const childArr = Children.toArray(children);
  const tripled  = [...childArr, ...childArr, ...childArr];

  const onTouchStart = () => {
    if (trackRef.current) trackRef.current.style.animationPlayState = "paused";
  };
  const onTouchEnd = () => {
    if (trackRef.current) trackRef.current.style.animationPlayState = "";
  };

  return (
    <div
      className="marquee-wrap"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div ref={trackRef} className={`marquee-track ${trackClass}`}>
        {tripled.map((child, i) => (
          <div key={i} className={`shrink-0 ${itemGap}`} aria-hidden={i >= childArr.length || undefined}>
            {child}
          </div>
        ))}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-12"
        style={{ background: `linear-gradient(to right, ${fadeBg}, transparent)` }} />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-12"
        style={{ background: `linear-gradient(to left, ${fadeBg}, transparent)` }} />
    </div>
  );
}

/* ─── 변호사 캐러셀 ─────────────────────────────────────── */
function LawyerScroll({ lawyers }: { lawyers: Lawyer[] }) {
  return (
    <ContinuousMarquee trackClass="marquee-track--lawyers" itemGap="mr-3" fadeBg="#F9FAFB">
      {lawyers.map((lawyer, i) => (
        <div key={i} className="w-[200px]">
          <LawyerCard lawyer={lawyer} />
        </div>
      ))}
    </ContinuousMarquee>
  );
}

function LawyerCard({ lawyer }: { lawyer: Lawyer }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0F0F0] p-4 text-center flex flex-col shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#F2F4F6] flex items-center justify-center text-[26px]">
        {lawyer.avatar}
      </div>
      <p className="text-[14px] font-bold text-[#111827]">{anonymizeName(lawyer.name)} 변호사</p>
      <p className="mt-0.5 text-[12px] text-[#9CA3AF] truncate">{anonymizeFirm(lawyer.firm)}</p>
      <div className="mt-2 flex flex-wrap gap-1 justify-center">
        {lawyer.specialties.slice(0, 2).map((s) => {
          const p = pillByName(s);
          return (
            <span key={s} className="text-[11px] font-semibold px-2 h-5 leading-5 rounded-full"
              style={{ backgroundColor: p.bg, color: p.text }}>{s}</span>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-[#F2F4F6] flex items-center justify-center gap-1.5 text-[12px] text-[#6B7280]">
        <span>경력 {lawyer.yearsExperience}년</span>
        <span className="text-[#E5E8EB]">·</span>
        <span className="text-[#111827] font-bold inline-flex items-center gap-0.5">
          <span className="text-[#FFB400]">{Ic.star}</span>
          {lawyer.rating.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

/* ─── 법률 가이드 캐러셀 (수동 스와이프 + 도트/화살표) ────── */
function BlogCarousel() {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const n = recentBlogs.length;
  const SLOT = 268 + 12; // card width + gap-3

  const scrollToIdx = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-bc]");
    const target = cards[idx];
    if (target) el.scrollTo({ left: target.offsetLeft, behavior: "smooth" });
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setActive(Math.min(Math.round(el.scrollLeft / SLOT), n - 1));
  };

  return (
    <div>
      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory gap-3 px-5 pb-2 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {recentBlogs.map((post) => {
          const c = CATEGORY_COLOR[post.category] ?? { bg: "#F3F4F6", text: "#4B5563" };
          return (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              data-bc
              className="flex-none w-[268px] snap-start bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#F3F4F6] overflow-hidden block active:scale-[0.97] transition-transform"
            >
              <div className="h-1" style={{ background: c.text }} />
              <div className="p-4">
                <span className="inline-flex items-center px-2 h-5 rounded text-[11px] font-bold mb-2.5"
                  style={{ background: c.bg, color: c.text }}>{post.category}</span>
                <p className="text-[15px] font-bold text-[#111827] leading-snug mb-2 line-clamp-2">{post.title}</p>
                <p className="text-[13px] text-[#6B7280] leading-relaxed line-clamp-2">{post.summary}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 화살표 + 도트 + 힌트 */}
      <div className="px-5 mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {/* 왼쪽 화살표 */}
          <button
            onClick={() => scrollToIdx(Math.max(0, active - 1))}
            disabled={active === 0}
            aria-label="이전"
            className="w-8 h-8 rounded-full border border-[#E5E8EB] flex items-center justify-center text-[#4E5968] transition-all disabled:opacity-25 hover:border-[#4338CA] hover:text-[#4338CA]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>

          {/* 도트 인디케이터 */}
          <div className="flex items-center gap-1.5">
            {recentBlogs.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIdx(i)}
                aria-label={`${i + 1}번째 카드`}
                className={`rounded-full transition-all duration-300 ${
                  i === active
                    ? "w-5 h-2 bg-[#4338CA]"
                    : "w-2 h-2 bg-[#D1D5DB] hover:bg-[#A5B4FC]"
                }`}
              />
            ))}
          </div>

          {/* 오른쪽 화살표 */}
          <button
            onClick={() => scrollToIdx(Math.min(n - 1, active + 1))}
            disabled={active === n - 1}
            aria-label="다음"
            className="w-8 h-8 rounded-full border border-[#E5E8EB] flex items-center justify-center text-[#4E5968] transition-all disabled:opacity-25 hover:border-[#4338CA] hover:text-[#4338CA]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>

        <p className="text-center text-[11px] text-[#B0B8C1]">좌우로 넘겨보세요</p>
      </div>
    </div>
  );
}

/* ─── 메인 홈 페이지 ─────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter();
  const { account, loading } = useAuth();

  function go(seed?: string) {
    const id = generateId();
    router.push(seed ? `/chat/${id}?seed=${encodeURIComponent(seed)}` : `/chat/${id}`);
  }
  function goQuick(slug: string) {
    router.push(`/chat/${generateId()}?quick=${slug}`);
  }

  return (
    <div className="bg-[#F3F4F6] min-h-screen">
      <div className="max-w-[480px] mx-auto bg-white min-h-screen flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.07)]">

        {/* ══ ① 상단 헤더 ══════════════════════════════════ */}
        <header className="sticky top-0 z-40 bg-white border-b border-[#F0F0F0] pt-safe-top shrink-0">
          <div className="h-14 flex items-center justify-between px-5">
            <LawselLogo iconSize={22} textClass="text-[18px]" />
            <div className="flex items-center gap-2">
              <button aria-label="알림" className="w-9 h-9 flex items-center justify-center text-[#9CA3AF] hover:text-[#4338CA] transition-colors">
                {Ic.bell}
              </button>
              {!loading && (
                account ? (
                  <Link href={account.type === "lawyer" ? "/lawyer/dashboard" : "/mypage"}
                    className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4338CA]"
                    aria-label="마이페이지">
                    {Ic.userCircle}
                  </Link>
                ) : (
                  <Link href="/login" className="text-[14px] font-bold text-[#4338CA] px-3 h-9 flex items-center rounded-lg hover:bg-[#EEF2FF] transition-colors">
                    로그인
                  </Link>
                )
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">

          {/* ══ ② 검색 바 ════════════════════════════════════ */}
          <section className="px-5 pt-5 pb-3 bg-white">
            <Link href="/ai-consultation"
              className="flex items-center gap-3 h-[52px] px-4 rounded-[26px] border-2 border-[#4338CA] text-[#9CA3AF] hover:bg-[#F8F7FF] transition-colors">
              <span className="text-[#4338CA] shrink-0">{Ic.search}</span>
              <span className="text-[15px] truncate">어떤 법률 문제가 있으신가요?</span>
            </Link>
          </section>

          {/* ══ ③ 신뢰 지표 ══════════════════════════════════ */}
          <section className="px-5 pb-4 bg-white">
            <div className="bg-[#F8F7FF] rounded-2xl grid grid-cols-4 divide-x divide-[#E8E5FF]">
              {TRUST_STATS.map((s, i) => (
                <div key={i} className={i < 2 ? "border-r-0" : ""}>
                  <StatCell {...s} />
                </div>
              ))}
            </div>
          </section>

          {/* ══ ④ 퀵 액션 카드 ════════════════════════════════ */}
          <section className="px-5 pb-5 bg-white">
            <div className="grid grid-cols-2 gap-3">
              <Link href="/ai-consultation"
                className="group bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#F3F4F6] hover:border-[#C7D2FE] active:scale-[0.97] transition-all">
                <div className="w-11 h-11 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4338CA] mb-3 group-hover:bg-[#E0E7FF] transition-colors">
                  {Ic.chat}
                </div>
                <p className="text-[16px] font-bold text-[#111827]">AI 법률 상담</p>
                <p className="mt-1 text-[13px] text-[#6B7280]">무료로 AI에게 물어보세요</p>
              </Link>
              <Link href="/lawyers"
                className="group bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#F3F4F6] hover:border-[#A7F3D0] active:scale-[0.97] transition-all">
                <div className="w-11 h-11 rounded-full bg-[#D1FAE5] flex items-center justify-center text-[#059669] mb-3 group-hover:bg-[#A7F3D0] transition-colors">
                  {Ic.users}
                </div>
                <p className="text-[16px] font-bold text-[#111827]">변호사 찾기</p>
                <p className="mt-1 text-[13px] text-[#6B7280]">전문 변호사 매칭</p>
              </Link>
            </div>
          </section>

          {/* ══ ⑤ 인기 서비스 ════════════════════════════════ */}
          <section className="bg-[#F9FAFB] pt-5 pb-5">
            <ContinuousMarquee trackClass="marquee-track--left" itemGap="mr-3" fadeBg="#F9FAFB">
              {POPULAR.map((item) => (
                <button key={item.label} onClick={() => go(item.seed)}
                  className="min-w-[148px] bg-white rounded-[14px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-[#F3F4F6] text-left active:scale-[0.97] hover:border-[#C7D2FE] transition-all">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-[4px] leading-none">인기</span>
                    <span className="text-2xl leading-none">{item.emoji}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-[#111827] leading-snug">{item.label}</p>
                </button>
              ))}
            </ContinuousMarquee>
          </section>

          {/* ══ ⑥ 상담 분야 (연속 마퀴 스크롤) ══════════════ */}
          <section className="bg-[#F9FAFB] pt-7 pb-7">
            <ScrollReveal className="px-5 mb-5">
              <h2 className="text-[20px] font-extrabold text-[#111827]">상담 분야</h2>
              <p className="mt-1 text-[13px] text-[#6B7280]">어떤 고민이든 시작해보세요</p>
            </ScrollReveal>

            <div className="space-y-3">
              {/* 메인 카테고리 — 왼쪽으로 흘러가기 */}
              <ContinuousMarquee trackClass="marquee-track--left" itemGap="mr-4" fadeBg="#F9FAFB">
                {MAIN_CATEGORIES.map((cat) => (
                  <button key={cat.title} type="button"
                    onClick={() => goQuick(cat.quickSlug)}
                    className="inline-flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-[#F0F0F0] hover:border-[#4338CA] hover:shadow-[0_2px_8px_rgba(67,56,202,0.1)] active:scale-[0.97] transition-all cursor-pointer">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center text-[20px] shrink-0"
                      style={{ backgroundColor: cat.bg }}>{cat.icon}</span>
                    <div className="text-left">
                      <p className="text-[14px] font-bold text-[#111827] whitespace-nowrap">{cat.title}</p>
                      <p className="text-[11px] text-[#9CA3AF] whitespace-nowrap">{cat.desc}</p>
                    </div>
                  </button>
                ))}
              </ContinuousMarquee>

              {/* 서브 카테고리 — 오른쪽으로 흘러가기 */}
              <ContinuousMarquee trackClass="marquee-track--right" itemGap="mr-3" fadeBg="#F9FAFB">
                {SUB_CATEGORIES.map((cat) => (
                  <button key={cat.title} type="button"
                    onClick={() => go(cat.title)}
                    className="inline-flex items-center gap-2 bg-white border border-[#E5E8EB] hover:border-[#4338CA] rounded-full pl-1.5 pr-3 h-9 active:scale-[0.97] transition-all cursor-pointer">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[13px] shrink-0"
                      style={{ backgroundColor: cat.bg }}>{cat.icon}</span>
                    <span className="text-[13px] font-medium text-[#111827] whitespace-nowrap">{cat.title}</span>
                  </button>
                ))}
              </ContinuousMarquee>
            </div>
          </section>

          {/* ══ ⑦ 왜 로셀인가요 (세로 스택) ════════════════ */}
          <section className="bg-white pt-7 pb-7">
            <ScrollReveal className="px-5 mb-5">
              <h2 className="text-[20px] font-extrabold text-[#111827]">왜 로셀인가요?</h2>
              <p className="mt-1 text-[13px] text-[#6B7280]">일반 AI, 기존 법률 서비스와 다릅니다</p>
            </ScrollReveal>
            <div className="px-5 space-y-3">
              {WHY_ITEMS.map((it, i) => (
                <ScrollReveal key={it.title} delay={i * 60}>
                  <div
                    className="rounded-2xl p-5 flex items-start gap-4"
                    style={{ backgroundColor: it.bg }}
                  >
                    <span className="text-[40px] leading-none shrink-0 mt-0.5">{it.emoji}</span>
                    <div>
                      <p className="text-[15px] font-bold text-[#111827] leading-snug">{it.title}</p>
                      <p className="mt-1.5 text-[13px] text-[#4B5563] leading-relaxed">{it.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </section>

          {/* ══ ⑧ 어떻게 진행되나요 ══════════════════════════ */}
          <section className="bg-[#F9FAFB] pt-7 pb-7">
            <ScrollReveal className="px-5 mb-5">
              <h2 className="text-[20px] font-extrabold text-[#111827]">어떻게 진행되나요?</h2>
              <p className="mt-1 text-[13px] text-[#6B7280]">3단계로 간단하게</p>
            </ScrollReveal>
            <HowItWorks />
          </section>

          {/* ══ ⑨ 최근 상담 사례 ══════════════════════════════ */}
          <section className="bg-[#F9FAFB] pt-7 pb-7">
            <ScrollReveal className="px-5 mb-5">
              <h2 className="text-[20px] font-extrabold text-[#111827]">최근 상담 사례</h2>
              <p className="mt-1 text-[13px] text-[#6B7280]">실제로 AI가 분석한 법률 고민들</p>
            </ScrollReveal>
            <ContinuousMarquee trackClass="marquee-track--left" itemGap="mr-3" fadeBg="#F9FAFB">
              {AI_CASES.map((c) => (
                <AICaseCard key={c.title} {...c} />
              ))}
            </ContinuousMarquee>
          </section>

          {/* ══ ⑩ 법률 가이드 (수동 스와이프 + 도트/화살표) ══ */}
          <section className="bg-white pt-7 pb-7">
            <div className="flex items-center justify-between px-5 mb-5">
              <h2 className="text-[20px] font-extrabold text-[#111827]">법률 가이드</h2>
              <Link href="/blog" className="flex items-center gap-0.5 text-[14px] font-semibold text-[#4338CA] hover:opacity-75 transition-opacity">
                더보기 {Ic.chevronRight}
              </Link>
            </div>
            <BlogCarousel />
          </section>

          {/* ══ 함께하는 전문 변호사 ══════════════════════════ */}
          <section className="bg-[#F9FAFB] pt-7 pb-7">
            <ScrollReveal className="px-5 mb-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[20px] font-extrabold text-[#111827]">함께하는 변호사</h2>
                <Link href="/lawyers" className="flex items-center gap-0.5 text-[14px] font-semibold text-[#4338CA] hover:opacity-75 transition-opacity">
                  전체보기 {Ic.chevronRight}
                </Link>
              </div>
            </ScrollReveal>
            <LawyerScroll lawyers={DEMO_LAWYERS} />
          </section>

          {/* ══ ⑪ 하단 CTA 배너 ══════════════════════════════ */}
          <section className="px-5 pt-3 pb-8 bg-white">
            <div className="rounded-2xl bg-gradient-to-r from-[#4338CA] to-[#6366F1] px-6 py-7 flex flex-col items-center text-center gap-4">
              <div>
                <p className="text-[22px] font-extrabold text-white leading-snug">법률 고민, 로셀에 맡기세요</p>
                <p className="mt-1.5 text-[14px] text-white/70">24시간 무료 AI 상담 · 전국 전문 변호사 매칭</p>
              </div>
              <button onClick={() => go()}
                className="flex items-center gap-2 px-7 py-3 bg-white text-[#4338CA] font-bold text-[15px] rounded-[12px] hover:bg-[#F5F3FF] active:scale-[0.97] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                무료 AI 상담 시작하기 {Ic.arrowRight}
              </button>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
