/** @type {import('next').NextConfig} */

const { withBotId } = require("botid/next/config");

const PROD_ORIGIN = "https://legal-ai-chatbot-five.vercel.app";
const isProd = process.env.NODE_ENV === "production";

const CSP = [
  "default-src 'self'",
  // unsafe-eval is only needed by Next.js dev server (fast-refresh); remove in production
  `script-src 'self'${isProd ? "" : " 'unsafe-eval'"} 'unsafe-inline'`,
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy", value: CSP },
  // HSTS: only meaningful over HTTPS (production)
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const allowedOrigin =
  process.env.NODE_ENV === "production" ? PROD_ORIGIN : "http://localhost:3000";

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: allowedOrigin },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
};

// withBotId는 BotID 챌린지용 same-origin 리라이트 2개와, 해당 경로 전용
// 헤더(X-Frame-Options/frame-ancestors)를 기존 설정 뒤에 덧붙인다.
// 기존 rewrites가 없고 headers는 append라 위 보안 헤더 설정과 충돌하지 않는다.
module.exports = withBotId(nextConfig);
