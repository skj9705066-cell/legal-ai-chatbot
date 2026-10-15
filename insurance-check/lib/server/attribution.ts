import "server-only";
import type { Attribution } from "@/lib/types";
import { sanitizeTag } from "@/lib/validation";

export function parseAttribution(raw: unknown): Attribution {
  const a = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  let referrer: string | null = null;
  if (typeof a.referrer === "string") {
    try {
      referrer = new URL(a.referrer).origin; // origin만 보존
    } catch {
      referrer = null;
    }
  }
  const landing = typeof a.landingPath === "string" && a.landingPath.startsWith("/") ? a.landingPath.split("?")[0].slice(0, 100) : null;
  return {
    utmSource: sanitizeTag(a.utmSource),
    utmMedium: sanitizeTag(a.utmMedium),
    utmCampaign: sanitizeTag(a.utmCampaign),
    utmContent: sanitizeTag(a.utmContent),
    utmTerm: sanitizeTag(a.utmTerm),
    referrer,
    landingPath: landing,
  };
}
