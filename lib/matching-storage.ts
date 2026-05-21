import type { MatchingSession } from "./types";

const STORAGE_KEY = "legaladvisor.matching.v1";

function read(): MatchingSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MatchingSession[]) : [];
  } catch {
    return [];
  }
}

function write(items: MatchingSession[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getMatchingSession(
  consultationId: string,
): MatchingSession | null {
  return read().find((s) => s.consultationId === consultationId) ?? null;
}

export function upsertMatchingSession(session: MatchingSession): void {
  const all = read();
  const idx = all.findIndex((s) => s.consultationId === session.consultationId);
  if (idx >= 0) {
    all[idx] = session;
  } else {
    all.push(session);
  }
  write(all);
}

export function deleteMatchingSession(consultationId: string): void {
  write(read().filter((s) => s.consultationId !== consultationId));
}

export function createEmptySession(consultationId: string): MatchingSession {
  const now = Date.now();
  return {
    consultationId,
    caseSummary: null,
    feeRange: { min: 50_000, max: 300_000 },
    consultationMethod: "chat",
    status: "summary",
    interestCount: 0,
    proposals: [],
    startedAt: null,
    selectedLawyerId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function listMatchingSessions(): MatchingSession[] {
  return read();
}
