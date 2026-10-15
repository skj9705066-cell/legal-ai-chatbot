/** 운영 값이 비어 있으면 가짜 값을 만들지 않고 '설정 필요' 자리표시를 보여준다. */
export function orSetting(value: string | null | undefined, label: string): string {
  return value && value.trim() ? value : `[설정 필요: ${label}]`;
}

export function isPlaceholder(text: string): boolean {
  return text.startsWith("[설정 필요");
}

export function thirdPartyText(value: string | null): string {
  if (!value) return "[설정 필요: 제3자 제공 여부]";
  return value.toLowerCase() === "none" ? "제3자에게 제공하지 않습니다." : value;
}
