import "server-only";
import { getAppMode } from "@/lib/config";
import { demoRepository } from "./demo";
import { supabaseRepository } from "./supabase";
import type { Repository } from "./types";

/** 모드에 따라 저장소를 고른다. 운영 모드는 절대 데모 저장소로 떨어지지 않는다. */
export function repo(): Repository {
  return getAppMode() === "production" ? supabaseRepository : demoRepository;
}

export type { LeadFilter, LeadRow, Repository } from "./types";
export { toLead, toPrivacyRequest } from "./types";
