/** @type {import('next').NextConfig} */

const { withBotId } = require("botid/next/config");

const PROD_ORIGIN = "https://lawsel.kr";
const isProd = process.env.NODE_ENV === "production";

// GA4(gtag)는 googletagmanager에서 스크립트를 받아 google-analytics로 수집을 쏜다.
// 두 곳을 각각 script-src / connect-src에 열어줘야 하며, 하나만 열면
// "스크립트는 뜨는데 데이터가 안 쌓이는" 조용한 실패가 된다.
// (Vercel Analytics는 /_vercel/insights 로 same-origin 수집이라 'self'로 이미 커버됨)
const GA_SCRIPT = "https://www.googletagmanager.com";
const GA_COLLECT =
  "https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com";

const CSP = [
  "default-src 'self'",
  // unsafe-eval is only needed by Next.js dev server (fast-refresh); remove in production
  `script-src 'self'${isProd ? "" : " 'unsafe-eval'"} 'unsafe-inline' ${GA_SCRIPT}`,
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${GA_SCRIPT} ${GA_COLLECT}`,
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
