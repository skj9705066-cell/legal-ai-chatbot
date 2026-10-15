"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 가로 카드 캐러셀: 데스크톱 3장 / 태블릿 2장 / 모바일 1장.
 * - CSS scroll-snap으로 손가락 스와이프, 이전·다음·점 버튼
 * - 자동 슬라이드: 화면에 보일 때만, 마우스·포커스·터치 중에는 멈춤, 끝에서 처음으로. 정지 버튼 제공(WCAG 2.2.2)
 * - prefers-reduced-motion이면 자동 슬라이드·부드러운 스크롤을 끈다
 */
export function Carousel({
  id,
  label,
  slides,
  autoplayMs = 0,
  slideClassName,
}: {
  id: string;
  label: string;
  slides: { key: string; label: string; node: React.ReactNode }[];
  autoplayMs?: number;
  slideClassName?: (i: number) => string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });
  const [paused, setPaused] = useState(false); // 사용자가 정지 버튼으로 멈춤
  const [hold, setHold] = useState(false); // 마우스·포커스·터치로 일시 정지
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(true);

  const step = useCallback(() => {
    const el = track.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return 1;
    const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 0;
    return first.getBoundingClientRect().width + gap;
  }, []);

  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / step()));
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, [step]);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    sync();
    const el = track.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      io.disconnect();
    };
  }, [sync]);

  const go = useCallback(
    (i: number) => track.current?.scrollTo({ left: i * step(), behavior: reduced ? "auto" : "smooth" }),
    [reduced, step],
  );

  const scrollable = !(edges.start && edges.end);
  const autoplay = autoplayMs > 0 && !reduced && scrollable;
  const running = autoplay && !paused && !hold && inView;

  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => go(edges.end ? 0 : index + 1), autoplayMs);
    return () => window.clearTimeout(t);
  }, [running, index, edges.end, autoplayMs, go]);

  return (
    <div
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHold(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHold(false)}
      onTouchStart={() => setHold(true)}
      onTouchEnd={() => window.setTimeout(() => setHold(false), 4000)}
      onFocus={() => setHold(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setHold(false)}
    >
      <div
        ref={track}
        id={id}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        data-testid={id}
        data-autoplay={running ? "running" : "stopped"}
        // relative: 카드 안의 sr-only(절대 위치) 글자가 스크롤 영역 밖으로 빠져 페이지 폭을 넓히지 않게 가둔다
        className="relative -mx-1 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-1 pb-3 pt-1 [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/20 lg:items-start lg:gap-5 [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s, i) => (
          <div
            key={s.key}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${slides.length} · ${s.label}`}
            className={cn("w-full shrink-0 snap-start sm:w-[calc((100%-16px)/2)] lg:w-[calc((100%-40px)/3)]", slideClassName?.(i))}
            data-testid={`${id}-slide`}
          >
            {s.node}
          </div>
        ))}
      </div>

      {scrollable && (
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                aria-label={`${i + 1}번째 카드 보기`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => go(i)}
                className="flex h-6 items-center px-0.5"
              >
                <span className={cn("block h-2 rounded-full transition-all duration-500", i === index ? "w-6 bg-blue" : "w-2 bg-navy-300")} />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {autoplayMs > 0 && !reduced && (
              <button
                type="button"
                aria-controls={id}
                aria-label={paused ? "자동 넘김 다시 시작" : "자동 넘김 멈추기"}
                onClick={() => setPaused((p) => !p)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy shadow-card ring-1 ring-navy-100 transition hover:bg-navy-50"
              >
                {paused ? <Play className="h-[18px] w-[18px]" aria-hidden="true" /> : <Pause className="h-[18px] w-[18px]" aria-hidden="true" />}
              </button>
            )}
            <button
              type="button"
              aria-controls={id}
              aria-label="대화 카드 왼쪽으로 넘기기"
              disabled={edges.start}
              onClick={() => go(Math.max(0, index - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy shadow-card ring-1 ring-navy-100 transition hover:bg-navy-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-controls={id}
              aria-label="대화 카드 오른쪽으로 넘기기"
              disabled={edges.end}
              onClick={() => go(index + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy shadow-card ring-1 ring-navy-100 transition hover:bg-navy-50 disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
