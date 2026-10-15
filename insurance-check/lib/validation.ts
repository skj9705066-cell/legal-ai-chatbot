import {
  CONTACT_METHODS,
  PREFERRED_TIMES,
  PRIVACY_REQUEST_TYPES,
  SERVICE_TYPES,
  type ContactMethod,
  type PreferredTime,
  type PrivacyRequestType,
  type ServiceType,
} from "./types";

// 브라우저와 서버가 같은 규칙을 쓴다. 서버는 이 결과만 신뢰한다.

export const LIMITS = { nameMin: 2, nameMax: 20, memoMax: 300 } as const;

/** 하이픈·공백을 제거한 휴대전화 숫자. 형식이 맞지 않으면 null. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  // 010은 11자리, 011·016·017·018·019는 10~11자리.
  if (/^010\d{8}$/.test(digits)) return digits;
  if (/^01[16789]\d{7,8}$/.test(digits)) return digits;
  return null;
}

export function formatPhoneInput(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export function maskPhone(digits: string): string {
  const last4 = digits.slice(-4);
  return `${digits.slice(0, 3)}-****-${last4}`;
}

export function normalizeName(input: string): string {
  return input.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function isValidName(name: string): boolean {
  if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) return false;
  return /^[가-힣a-zA-Z\s·.]+$/.test(name);
}

/** 주민등록번호처럼 보이는 패턴 — 메모에 들어오면 거절한다. */
export function looksLikeRrn(text: string): boolean {
  return /\d{6}\s*-?\s*[1-8]\d{6}/.test(text);
}

export type FieldErrors = Partial<Record<string, string>>;

export interface LeadInput {
  serviceType: ServiceType;
  name: string;
  phone: string;
  preferredTime: PreferredTime;
  memo: string;
  privacyConsent: true;
  marketingConsent: boolean;
}

const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === "string" && (list as readonly string[]).includes(v);

export function validateLeadInput(raw: Record<string, unknown>):
  | { ok: true; value: LeadInput }
  | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const serviceType = raw.serviceType;
  if (!isOneOf(SERVICE_TYPES, serviceType)) errors.serviceType = "점검 유형을 선택해 주세요.";

  const name = normalizeName(typeof raw.name === "string" ? raw.name : "");
  if (!name) errors.name = "이름을 입력해 주세요.";
  else if (!isValidName(name)) errors.name = "이름은 한글 또는 영문 2~20자로 입력해 주세요.";

  const phoneRaw = typeof raw.phone === "string" ? raw.phone : "";
  const phone = normalizePhone(phoneRaw);
  if (!phoneRaw.trim()) errors.phone = "휴대전화번호를 입력해 주세요.";
  else if (!phone) errors.phone = "휴대전화번호 형식을 확인해 주세요. (예: 010-1234-5678)";

  const preferredTime = raw.preferredTime;
  if (!isOneOf(PREFERRED_TIMES, preferredTime)) errors.preferredTime = "상담 희망 시간을 선택해 주세요.";

  const memo = (typeof raw.memo === "string" ? raw.memo : "").trim();
  if (memo.length > LIMITS.memoMax) errors.memo = `메모는 ${LIMITS.memoMax}자 이내로 입력해 주세요.`;
  else if (looksLikeRrn(memo)) errors.memo = "주민등록번호는 입력하지 말아 주세요.";

  if (raw.privacyConsent !== true) errors.privacyConsent = "개인정보 수집·이용에 동의해야 신청할 수 있습니다.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      serviceType: serviceType as ServiceType,
      name,
      phone: phone!,
      preferredTime: preferredTime as PreferredTime,
      memo,
      privacyConsent: true,
      marketingConsent: raw.marketingConsent === true,
    },
  };
}

export function validateCoverageInput(raw: Record<string, unknown>):
  | { ok: true; value: { contactMethod: ContactMethod; preferredTime: PreferredTime } }
  | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  if (raw.coverageConsent !== true) errors.coverageConsent = "보장 분석 상담을 위한 별도 동의가 필요합니다.";
  if (!isOneOf(CONTACT_METHODS, raw.contactMethod)) errors.contactMethod = "연락 방법을 선택해 주세요.";
  if (!isOneOf(PREFERRED_TIMES, raw.preferredTime)) errors.preferredTime = "상담 희망 시간을 선택해 주세요.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { contactMethod: raw.contactMethod as ContactMethod, preferredTime: raw.preferredTime as PreferredTime },
  };
}

export function validatePrivacyRequest(raw: Record<string, unknown>):
  | { ok: true; value: { type: PrivacyRequestType; name: string; phone: string } }
  | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  if (!isOneOf(PRIVACY_REQUEST_TYPES, raw.type)) errors.type = "요청 유형을 선택해 주세요.";
  const name = normalizeName(typeof raw.name === "string" ? raw.name : "");
  if (!isValidName(name)) errors.name = "신청 시 입력한 이름을 입력해 주세요.";
  const phone = normalizePhone(typeof raw.phone === "string" ? raw.phone : "");
  if (!phone) errors.phone = "신청 시 입력한 휴대전화번호를 입력해 주세요.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { type: raw.type as PrivacyRequestType, name, phone: phone! } };
}

/** UTM 등 외부 유입 문자열 정리: 길이 제한 + 제어문자 제거 + 이메일/전화번호처럼 보이면 버림. */
export function sanitizeTag(v: unknown, max = 80): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[\u0000-\u001f\u007f<>"'`]/g, "").trim().slice(0, max);
  if (!s) return null;
  if (/@/.test(s) || /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/.test(s)) return null;
  return s;
}
