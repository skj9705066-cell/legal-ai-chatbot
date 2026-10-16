import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";
// GA4는 운영 모드 + 측정 ID가 있고 방문자가 동의한 경우에만 로드된다. CSP는 그때를 대비해 열어 둔다.
const GA_SCRIPT = "https://www.googletagmanager.com";
const GA_COLLECT = "https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com";
// Meta 픽셀도 운영 모드 + 픽셀 ID + 방문자 동의가 있을 때만 로드된다.
const META_SCRIPT = "https://connect.facebook.net";
const META_COLLECT = "https://www.facebook.com";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} ${GA_SCRIPT} ${META_SCRIPT}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: https:",
  `connect-src 'self' ${GA_SCRIPT} ${GA_COLLECT} ${META_COLLECT}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig = {
  // 상위 저장소(legal-ai-chatbot)의 lockfile과 분리된 독립 앱
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
