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
