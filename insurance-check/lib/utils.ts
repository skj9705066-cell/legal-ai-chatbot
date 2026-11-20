import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function percent(numerator: number, denominator: number): string {
  if (!denominator) return "-";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

const KST_MS = 9 * 3_600_000;
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

/** 방문 일시 표기(한국 시간, 고객 문자·관리자 공용): "11월 25일(화) 오후 2:00" */
export function formatVisitAt(iso: string | null): string {
  if (!iso) return "-";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "-";
  const d = new Date(t + KST_MS);
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${WEEKDAY[d.getUTCDay()]}) ${ampm} ${h12}:${m}`;
}

/** ISO → datetime-local 입력값(한국 시간 기준, 관리자 PC 시간대와 무관) */
export function toKstInput(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : new Date(t + KST_MS).toISOString().slice(0, 16);
}

/** datetime-local 입력값(한국 시간으로 해석) → ISO. 비었거나 형식이 다르면 null */
export function fromKstInput(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const t = Date.parse(`${v}:00+09:00`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}
