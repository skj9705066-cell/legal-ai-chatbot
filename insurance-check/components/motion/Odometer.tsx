"use client";

import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { wheelPosition } from "@/lib/odometer";

/**
 * 오도미터 숫자 애니메이션.
 *
 * - template(최종 표기)의 숫자 자리마다 0~9 세로 띠를 두고, 진행값 v(t)에 따라 각 자리를 연속으로 굴린다.
 *   낮은 자리는 빠르게, 높은 자리는 느리게 돌고 easeOutCubic으로 감속해 정확한 최종값에 멈춘다.
 * - 화면 진입(IntersectionObserver) 시 한 번만 실행. 리렌더링으로 다시 돌지 않는다.
 * - 프레임마다 React state를 바꾸지 않고 rAF에서 transform만 갱신(모바일 성능).
 * - 모든 자리를 처음부터 렌더해 너비가 고정 → 애니메이션 중 레이아웃 흔들림 없음.
 * - SSR·JS 실패·prefers-reduced-motion에서는 최종 수치가 그대로 보인다.
 * - 화면 숫자는 aria-hidden, 보조기기·검색엔진에는 sr-only 실제 텍스트(label)를 준다.
 */

type Token = { kind: "digit"; place: number; final: number } | { kind: "char"; ch: string; leftPlaces: number[] };

function tokenize(template: string): Token[] {
  const digitCount = template.replace(/\D/g, "").length;
  let seen = 0;
  const places: number[] = [];
  return Array.from(template).map((ch) => {
    if (/\d/.test(ch)) {
      const place = digitCount - 1 - seen++;
      places.push(place);
      return { kind: "digit", place, final: Number(ch) } as const;
    }
    return { kind: "char", ch, leftPlaces: [...places] } as const;
  });
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

export function Odometer({
  value,
  template,
  label,
  duration = 2600,
  delay = 0,
  className,
}: {
  /** 최종 정수 (template의 숫자들을 이어 붙인 값과 같아야 한다) */
  value: number;
  /** 최종 표기, 예: "10조 3,000억원" */
  template: string;
  /** 보조기기·검색엔진용 실제 텍스트 */
  label: string;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const tokens = useMemo(() => tokenize(template), [template]);
  const rootRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  if (process.env.NODE_ENV !== "production" && Number(template.replace(/\D/g, "")) !== value) {
    console.warn(`[Odometer] template "${template}" 의 숫자와 value ${value} 가 다릅니다.`);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root || started.current) return;
    const cols = Array.from(root.querySelectorAll<HTMLElement>("[data-place]"));
    const chars = Array.from(root.querySelectorAll<HTMLElement>("[data-left]"));

    const paint = (v: number) => {
      for (const col of cols) {
        const place = Number(col.dataset.place);
        col.firstElementChild!.setAttribute("style", `transform: translateY(${(-wheelPosition(v, place) * 100) / STRIP.length}%)`);
        // 아직 도달하지 않은 앞자리(선행 0)는 흐리게 → 도달하면서 서서히 나타남
        col.style.opacity = String(Math.min(1, Math.max(0.12, v / Math.pow(10, place))));
      }
      for (const ch of chars) {
        const left = ch.dataset.left ? ch.dataset.left.split(",").map(Number) : [];
        if (!left.length) continue;
        const reach = Math.max(...left.map((p) => v / Math.pow(10, p)));
        ch.style.opacity = String(Math.min(1, Math.max(0.12, reach)));
      }
    };

    const finish = () => {
      paint(value);
      root.dataset.state = "done";
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      started.current = true;
      finish();
      return;
    }
    // 이미 화면에 보이는 상태로 시작했다면(새로고침 등) 깜빡임 없이 최종값 유지
    const rect = root.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      started.current = true;
      root.dataset.state = "done";
      return;
    }

    paint(0);
    root.dataset.state = "idle";
    let raf = 0;
    let timer = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || started.current) return;
        started.current = true;
        io.disconnect();
        timer = window.setTimeout(() => {
          root.dataset.state = "running";
          const t0 = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - t0) / duration);
            if (t >= 1) return finish();
            paint(value * easeOutCubic(t));
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        }, delay);
      },
      { threshold: 0.4 },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      // 언마운트 중 멈췄다면 다음 마운트에서 최종값이 보이도록
      if (root.dataset.state === "running") finish();
    };
  }, [value, duration, delay]);

  return (
    <>
      <span ref={rootRef} aria-hidden="true" className={cn("odo", className)} data-state="static" data-final={template}>
        {tokens.map((t, i) =>
          t.kind === "digit" ? (
            <span key={i} className="odo-col" data-place={t.place}>
              <span className="odo-strip" style={{ transform: `translateY(${(-t.final * 100) / STRIP.length}%)` }}>
                {STRIP.map((d, j) => (
                  <span key={j}>{d}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={i} className="odo-char" data-left={t.leftPlaces.join(",")}>
              {t.ch === " " ? " " : t.ch}
            </span>
          ),
        )}
      </span>
      <span className="sr-only">{label}</span>
    </>
  );
}
