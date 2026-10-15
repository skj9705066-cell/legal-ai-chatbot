import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1.25rem", sm: "1.5rem", lg: "2rem" }, screens: { xl: "1200px" } },
    extend: {
      colors: {
        // 브랜드 팔레트 — 텍스트용 명암 대비(WCAG AA 4.5:1)를 만족하는 단계만 본문에 사용
        navy: {
          DEFAULT: "#102B4E",
          700: "#1B3A63",
          600: "#34506F",
          500: "#556A85", // 보조 텍스트 (흰 배경 대비 ≈5.4:1)
          400: "#8C9AAE", // 장식·비활성 전용
          300: "#C5CEDA",
          200: "#E1E7EF",
          100: "#EEF2F7",
          50: "#F6F8FB",
        },
        blue: {
          DEFAULT: "#1463D9",
          700: "#0E4DAD",
          600: "#1157C2",
          200: "#BFD6F8",
          100: "#DCEAFD",
          50: "#EFF6FF",
        },
        mint: {
          DEFAULT: "#19A58B", // 아이콘·도형 전용 (텍스트는 mint-700)
          700: "#0F7563",
          100: "#D3F0E9",
          50: "#EAF8F4",
        },
        caution: { DEFAULT: "#8A5A00", 50: "#FFF8E8", 200: "#F3DFB0" },
        danger: { DEFAULT: "#B42318", 50: "#FEF3F2", 200: "#FECDCA" },
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
      boxShadow: {
        card: "0 1px 2px rgba(16,43,78,0.04), 0 8px 24px -12px rgba(16,43,78,0.12)",
        lift: "0 2px 4px rgba(16,43,78,0.04), 0 18px 40px -18px rgba(16,43,78,0.25)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: { "fade-up": "fade-up 500ms cubic-bezier(.2,.7,.2,1) both" },
    },
  },
  plugins: [],
};

export default config;
