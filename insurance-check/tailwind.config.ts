import type { Config } from "tailwindcss";

/**
 * 디자인 시스템
 *  navy  #102B4E  브랜드·제목      ink   #172B45  본문
 *  blue  #1463D9  주요 액션·강조   navy-500 #64748B 보조 글씨(흰 배경 4.8:1)
 *  navy-50 #F4F7FB 보조 배경       mint  #16A085  성공 상태(텍스트는 mint-700)
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1.25rem", sm: "1.5rem", lg: "2.5rem" }, screens: { xl: "1280px" } },
    extend: {
      colors: {
        ink: "#172B45",
        navy: {
          DEFAULT: "#102B4E",
          900: "#0B1F3A",
          800: "#0E2645",
          700: "#1B3A63",
          600: "#475569",
          500: "#64748B",
          400: "#94A3B8", // 장식·비활성 전용
          300: "#CBD5E1",
          200: "#E2E8F0",
          100: "#EDF1F7",
          50: "#F4F7FB",
        },
        blue: {
          DEFAULT: "#1463D9",
          700: "#0F4FB3",
          600: "#1259C7",
          300: "#93B8F0",
          200: "#C4D9F8",
          100: "#DDEAFC",
          50: "#EEF4FE",
        },
        mint: {
          DEFAULT: "#16A085",
          700: "#0D7563",
          100: "#D2F0E9",
          50: "#E9F7F3",
        },
        caution: { DEFAULT: "#8A5A00", 50: "#FFF8EA", 200: "#F1DDAE" },
        danger: { DEFAULT: "#C0352B", 50: "#FDF3F2", 200: "#F6CCC8" },
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
        card: "0 1px 2px rgba(16,43,78,0.04), 0 6px 20px -8px rgba(16,43,78,0.08)",
        lift: "0 1px 2px rgba(16,43,78,0.05), 0 20px 48px -20px rgba(16,43,78,0.22)",
        cta: "0 10px 24px -10px rgba(20,99,217,0.55)",
        ring: "0 0 0 1px rgba(16,43,78,0.06)",
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
