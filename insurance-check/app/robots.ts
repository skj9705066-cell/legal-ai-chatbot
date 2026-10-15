import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  if (process.env.APP_MODE !== "production") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/apply"] }] };
}
