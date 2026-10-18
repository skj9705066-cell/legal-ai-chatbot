/** 화면을 그리는 모드(lib/config.ts의 AppMode와 같은 값). 클라이언트에서도 쓰므로 config를 import하지 않는다. */
export type DisplayMode = "demo" | "staging" | "production";

/** 운영 화면에서 아직 채워지지 않은 운영 정보 자리에 보이는 고객용 문구 */
export const PENDING_TEXT = "준비 중";

/**
 * 운영 값이 비어 있을 때 가짜 값을 만들지 않는다.
 * 데모·테스트: 어떤 설정이 빠졌는지 '[설정 필요: …]'로 보여 준다(운영자 확인용).
 * 운영: 내부 설정 문구 대신 '준비 중'. 운영 모드는 이 값이 모두 채워져야 접수가 열린다.
 */
export function orSetting(value: string | null | undefined, label: string, mode: DisplayMode): string {
  if (value && value.trim()) return value;
  return mode === "production" ? PENDING_TEXT : `[설정 필요: ${label}]`;
}

/** 여러 값을 한 줄로 묶은 표시(예: "GA명 · 등록번호 …"). 운영 화면에서 하나라도 비면 줄 전체를 '준비 중'으로 */
export function settingLine(text: string, mode: DisplayMode): string {
  return mode === "production" && text.includes(PENDING_TEXT) ? PENDING_TEXT : text;
}

/**
 * "이름 · 등록번호 …" 한 줄. 운영 화면에서 등록번호가 아직 없으면 확인된 이름만 보여 준다(등록번호를 지어내거나 '준비 중'으로 이름까지 가리지 않음).
 * 데모·테스트는 빠진 등록번호를 '[설정 필요]'로 드러낸다.
 */
export function nameWithRegNo(name: string | null, regNo: string | null, nameLabel: string, regLabel: string, mode: DisplayMode): string {
  const n = orSetting(name, nameLabel, mode);
  if (regNo && regNo.trim()) return `${n} · 등록번호 ${regNo}`;
  return mode === "production" ? n : `${n} · 등록번호 ${orSetting(null, regLabel, mode)}`;
}

/** 데모·테스트 화면의 '[설정 필요]' 자리표시인지(강조 색 표시용) */
export function isPlaceholder(text: string): boolean {
  return text.startsWith("[설정 필요");
}

export function thirdPartyText(value: string | null, mode: DisplayMode): string {
  if (!value) return orSetting(null, "제3자 제공 여부", mode);
  return value.toLowerCase() === "none" ? "제3자에게 제공하지 않습니다." : value;
}
