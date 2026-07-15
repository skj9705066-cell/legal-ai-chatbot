import type { Consultation } from "./types";

const STORAGE_KEY = "legaladvisor.consultations.v1";

// Base64-encoded attachment payloads are too large for localStorage.
// We keep file metadata in history but drop `data` on persist.
function stripAttachmentPayloads(c: Consultation): Consultation {
  return {
    ...c,
    messages: c.messages.map((m) =>
      m.attachments && m.attachments.length > 0
        ? {
            ...m,
            attachments: m.attachments.map(({ data, ...rest }) => rest),
          }
        : m,
    ),
  };
}

function read(): Consultation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Consultation[]) : [];
  } catch {
    return [];
  }
}

function write(items: Consultation[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listConsultations(): Consultation[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getConsultation(id: string): Consultation | null {
  return read().find((c) => c.id === id) ?? null;
}

export function upsertConsultation(c: Consultation): void {
  const persisted = stripAttachmentPayloads(c);
  const all = read();
  const idx = all.findIndex((x) => x.id === persisted.id);
  if (idx >= 0) {
    all[idx] = persisted;
  } else {
    all.push(persisted);
  }
  write(all);
}

export function deleteConsultation(id: string): void {
  write(read().filter((c) => c.id !== id));
}

// ── 비로그인 무료 상담 카운트 (브라우저 전역) ────────────────────
// 채팅방(consultation id) 단위로 "무료로 시작한 상담 세션"을 누적 기록한다.
// 채팅방마다 카운터가 리셋되던 문제를 막고, 브라우저 기준으로 총 N회만 허용.
const FREE_CHATS_KEY = "legaladvisor.free-chats.v1";

export function getFreeConsultationIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FREE_CHATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

// 이미 기록된 방이면 무시. 새 방이면 무료 세션으로 등록한다.
export function registerFreeConsultation(id: string): void {
  if (typeof window === "undefined") return;
  const ids = getFreeConsultationIds();
  if (ids.includes(id)) return;
  ids.push(id);
  try {
    window.localStorage.setItem(FREE_CHATS_KEY, JSON.stringify(ids));
  } catch {
    // 쿼터 초과 등은 조용히 무시 (부가 기능).
  }
}

// ── 비로그인 무료 상담 답변 카운트 (브라우저 전역) ────────────────
// "받은 AI 답변 수" 기준으로 무료 N회를 센다. 방을 나눠도 총합으로 계산하며,
// 한 방 안의 추가 질문도 각각 1회로 집계된다. (방 개수 기준이던 위 로직 대체)
const FREE_ANSWERS_KEY = "legaladvisor.free-answers.v1";

export function getGuestAnswerCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(FREE_ANSWERS_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

// 게스트가 유효한 AI 답변을 1회 받을 때마다 호출한다.
export function incrementGuestAnswerCount(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      FREE_ANSWERS_KEY,
      String(getGuestAnswerCount() + 1),
    );
  } catch {
    // 쿼터 초과 등은 조용히 무시.
  }
}

export function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim().replace(/\s+/g, " ");
  return trimmed.length > 32 ? trimmed.slice(0, 32) + "…" : trimmed;
}
