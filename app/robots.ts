import type { MetadataRoute } from "next";

// 정식 도메인. app/sitemap.ts와 반드시 같은 값을 쓸 것 —
// 여기가 옛 vercel.app 주소로 남아 있어 크롤러에 다른 도메인을 알리고 있었다.
const BASE = "https://lawsel.kr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/lawyers", "/lawyer/register", "/login", "/signup", "/terms", "/privacy"],
        disallow: [
          "/admin/",
          "/api/",
          "/mypage",
          "/lawyer/dashboard",
          "/chat/",
          "/matching/",
          "/auth/",
          "/offline",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
