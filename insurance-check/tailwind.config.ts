import type { Config } from "tailwindcss";

/**
 * 디자인 시스템 (2026-11 방문 점검 개편 — 50~60대 고객용 따뜻하고 차분한 팔레트)
 *
 *  고객 화면 기본색
 *    ivory    #FAF8F4  페이지 배경          sage   #E5EFE7  보조 배경·카드
 *    forest   #31594C  주요 버튼·강조(딥그린)  gold   #D5B58A  장식·포인트(글자색 금지 — 글자는 gold-700)
 *    charcoal #303B35  제목·본문
 *
 *  ⚠️ 기존 토큰 이름(blue·navy·deep·ink·mint)은 관리자·신청 완료·처리방침 화면 등 수십 곳에서 쓰므로 이름은 유지하고
 *     값만 새 팔레트로 바꿨다: blue = 딥그린 계열(주요 액션), navy = 차콜·그린그레이 계열(글자·중립), deep = 진한 숲색.
 *     새 코드는 forest·charcoal·sage·ivory·gold를 쓴다.
 *  대비(WCAG): forest/ivory 7.4:1 · charcoal/ivory 11:1 · navy-600/sage 6.0:1 · navy-500/white 5.6:1 · 흰 글자/forest 7.9:1
 */
const forest = {
  DEFAULT: "#31594C",
  800: "#1F3B32",
  700: "#264639",
  600: "#2C5044",
  400: "#5E8576",
  300: "#94B3A6",
  200: "#C4D8CE",
  100: "#DCE8E0",
  50: "#EEF4F0",
};

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1.25rem", sm: "1.5rem", lg: "2.5rem" }, screens: { xl: "1200px" } },
    extend: {
      colors: {
        ivory: "#FAF8F4",
        sage: { DEFAULT: "#E5EFE7", 200: "#D3E3D7", 50: "#F1F6F2" },
        gold: { DEFAULT: "#D5B58A", 700: "#7A5A2E", 200: "#EBDAC1", 100: "#F5ECDF" },
        charcoal: "#303B35",
        forest,
        ink: "#303B35",
        deep: { DEFAULT: "#1F3B32", 800: "#264639", 700: "#31594C" },
        navy: {
          DEFAULT: "#303B35",
          900: "#1F2722",
          800: "#28312C",
          700: "#3A4740",
          600: "#4F5B54",
          500: "#5F6B64",
          400: "#9AA39D", // 장식·비활성 전용
          300: "#C9CFC9",
          200: "#DDE2DC",
          100: "#E9ECE6",
          50: "#F3F1EB",
        },
        blue: forest,
        mint: {
          DEFAULT: "#3E8A6E",
          700: "#2D6B54",
          100: "#D6EBDF",
          50: "#EAF5EE",
        },
        caution: { DEFAULT: "#8A5A00", 50: "#FFF8EA", 200: "#F1DDAE" },
        danger: { DEFAULT: "#B3372D", 50: "#FDF3F2", 200: "#F6CCC8" },
      },
      fontFamily: {
        sans: [
          '"Pretendard Variable"',
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          '"Malgun Gothic"',
          "sans-serif",
        ],
      },
      fontSize: {
        // [size, { lineHeight, letterSpacing, fontWeight }]
        "display-xl": ["3.5rem", { lineHeight: "1.18", letterSpacing: "-0.035em", fontWeight: "800" }],
        "display-lg": ["2.75rem", { lineHeight: "1.2", letterSpacing: "-0.03em", fontWeight: "800" }],
        "display-md": ["2.125rem", { lineHeight: "1.28", letterSpacing: "-0.028em", fontWeight: "800" }],
        "title-lg": ["2rem", { lineHeight: "1.3", letterSpacing: "-0.025em", fontWeight: "800" }],
        "title-md": ["1.625rem", { lineHeight: "1.35", letterSpacing: "-0.02em", fontWeight: "700" }],
        "title-sm": ["1.25rem", { lineHeight: "1.4", letterSpacing: "-0.015em", fontWeight: "700" }],
        "body-lg": ["1.125rem", { lineHeight: "1.7", letterSpacing: "-0.01em" }],
        body: ["1rem", { lineHeight: "1.65", letterSpacing: "-0.005em" }],
        caption: ["0.875rem", { lineHeight: "1.55" }],
      },
      borderRadius: { "4xl": "2rem" },
      boxShadow: {
        card: "0 1px 2px rgba(48,59,53,0.05), 0 8px 24px -12px rgba(48,59,53,0.12)",
        lift: "0 1px 2px rgba(48,59,53,0.05), 0 20px 48px -20px rgba(48,59,53,0.22)",
        cta: "0 10px 24px -12px rgba(49,89,76,0.6)",
        glow: "0 0 0 1px rgba(94,133,118,0.18), 0 24px 80px -24px rgba(49,89,76,0.45)",
        ring: "0 0 0 1px rgba(48,59,53,0.08)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "bar-grow": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
      },
      animation: {
        "fade-up": "fade-up 560ms cubic-bezier(.2,.7,.2,1) both",
        "fade-in": "fade-in 400ms ease-out both",
        "bar-grow": "bar-grow 900ms cubic-bezier(.2,.7,.2,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
