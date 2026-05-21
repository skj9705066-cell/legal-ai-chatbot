import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // === Premium light palette ===
        navy: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b", // secondary charcoal
          900: "#0f172a", // primary deep navy
        },
        gold: {
          50: "#fdf8f0",
          100: "#fbeed8",
          200: "#f5d9a8",
          300: "#e8c489",
          400: "#dcb076",
          500: "#d4a574", // accent
          600: "#b8895a",
          700: "#8a6643",
          DEFAULT: "#d4a574",
        },
        cta: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          400: "#34d399",
          500: "#10b981",
          600: "#059669", // primary CTA
          700: "#047857",
        },
        success: {
          DEFAULT: "#059669",
          light: "#10b981",
        },
        danger: "#dc2626",
        // Text
        text: {
          DEFAULT: "#111827",
          muted: "#6b7280",
          subtle: "#9ca3af",
        },
        // Surfaces
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f8fafc",
          soft: "#f1f5f9",
          line: "#e5e7eb",
        },

        // === Legacy aliases — remapped to light theme ===
        ink: {
          0: "#ffffff",
          1: "#f8fafc",
          2: "#ffffff",
          3: "#e5e7eb",
          4: "#d1d5db",
        },
        bone: {
          50: "#111827",
          200: "#1f2937",
          300: "#374151",
          500: "#6b7280",
          700: "#9ca3af",
        },
        primary: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#0f172a",
        },
        brand: {
          50: "#fdf8f0",
          100: "#fbeed8",
          200: "#f5d9a8",
          300: "#e8c489",
          400: "#dcb076",
          500: "#d4a574",
          600: "#b8895a",
          700: "#8a6643",
          800: "#6b4f31",
          900: "#4a3722",
        },
        accent: {
          50: "#fdf8f0",
          100: "#fbeed8",
          200: "#f5d9a8",
          300: "#e8c489",
          400: "#dcb076",
          500: "#d4a574",
          600: "#b8895a",
          700: "#8a6643",
        },
        canvas: "#f8fafc",
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          '"Nanum Square Neo"',
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "sans-serif",
        ],
        display: [
          "Pretendard Variable",
          "Pretendard",
          '"Nanum Square Neo"',
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "sans-serif",
        ],
        serif: [
          "Pretendard Variable",
          "Pretendard",
          '"Nanum Square Neo"',
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "sans-serif",
        ],
      },
      boxShadow: {
        // Toss-style soft depth shadows
        sm: "0 1px 2px rgba(15, 23, 42, 0.04)",
        card:
          "0 1px 3px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.04)",
        cardHover:
          "0 8px 28px -8px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.06)",
        elevated:
          "0 24px 60px -20px rgba(15, 23, 42, 0.18), 0 8px 20px -8px rgba(15, 23, 42, 0.08)",
        glow:
          "0 0 0 4px rgba(15, 23, 42, 0.05), 0 12px 32px -8px rgba(15, 23, 42, 0.12)",
        "gold-glow": "0 0 0 3px rgba(212, 165, 116, 0.18)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
        luxe: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        600: "600ms",
        700: "700ms",
        800: "800ms",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-28px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(28px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "dot-bounce": {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 600ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-in-left":
          "slide-in-left 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-in-right":
          "slide-in-right 700ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "dot-bounce": "dot-bounce 1.4s ease-in-out infinite",
        shimmer: "shimmer 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
