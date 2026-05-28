import type { MetadataRoute } from "next";

const BASE = "https://legal-ai-chatbot-five.vercel.app";

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
