/**
 * Demo-only auth storage. NOT for production:
 * - Passwords are stored as plain strings in localStorage
 * - "Kakao"/"Google" providers are simulated, not real OAuth
 * - No CSRF/XSS/session-rotation protection
 */
import type { Account, AuthSession, UserAccount, LawyerAccount } from "./types";

const ACCOUNTS_KEY = "legaladvisor.accounts.v1";
const SESSION_KEY = "legaladvisor.session.v1";

function readAccounts(): Account[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Account[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(arr: Account[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(arr));
}

export function listAccounts(): Account[] {
  return readAccounts();
}

export function getAccount(id: string): Account | null {
  return readAccounts().find((a) => a.id === id) ?? null;
}

export function findAccountByEmail(email: string): Account | null {
  const target = email.trim().toLowerCase();
  return (
    readAccounts().find((a) => a.email.trim().toLowerCase() === target) ?? null
  );
}

export function findUserByProvider(
  provider: "kakao" | "google",
): UserAccount | null {
  const found = readAccounts().find(
    (a) => a.type === "user" && a.provider === provider,
  );
  return (found as UserAccount | undefined) ?? null;
}

export function createAccount(account: Account): Account {
  const all = readAccounts();
  all.push(account);
  writeAccounts(all);
  return account;
}

export function updateAccount(account: Account): void {
  const all = readAccounts();
  const idx = all.findIndex((a) => a.id === account.id);
  if (idx >= 0) {
    all[idx] = account;
    writeAccounts(all);
  }
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession | null): void {
  if (typeof window === "undefined") return;
  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

export type { LawyerAccount, UserAccount };
