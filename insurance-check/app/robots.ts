import type { MetadataRoute } from "next";
import { getAppMode } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  if (getAppMode() !== "production") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/apply"] }] };
}
