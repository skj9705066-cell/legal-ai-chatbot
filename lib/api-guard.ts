import type { NextRequest } from "next/server";

/**
 * AI 라우트 공용 방어막.
 *
 * 배경: `/api/chat`·`/api/suggest-questions`·`/api/case-summary`는 인증 없이 열려 있고
 * (게스트 무료 상담을 위해 의도된 것), 유일한 보호가 IP 기반 인메모리 레이트리밋이었다.
 * 그 결과 외부에서 curl 한 번이면 우리 계정으로 Opus를 무한히 쓸 수 있는
 * **공개 LLM 프록시**가 되어 있었다. (실제로 lawsel.kr에서 재현 확인)
 *
 * 인증 요구는 게스트 무료 상담 퍼널을 깨므로 쓰지 않는다. 대신
 *   1) 우리 사이트에서 온 요청만 받고(Origin/Referer 바인딩),
 *   2) 레이트리밋 키를 위조 불가능한 IP로 잡고,
 *   3) 요청 하나가 태울 수 있는 토큰 상한을 못 박는다.
 */

const PRODUCTION_HOSTS = new Set(["lawsel.kr", "www.lawsel.kr"]);

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isOwnHost(host: string | null, req: NextRequest): boolean {
  if (!host) return false;
  if (PRODUCTION_HOSTS.has(host)) return true;
  // 프리뷰 배포(*.vercel.app)와 로컬 개발.
  if (host.endsWith(".vercel.app")) return true;
  if (host === "localhost" || host === "127.0.0.1") return true;
  // 커스텀 도메인이 늘어나도 자동으로 따라가도록 요청 Host와도 대조한다.
  const self = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  return !!self && host === self;
}

/**
 * 브라우저는 same-origin이라도 POST에는 Origin 헤더를 붙인다.
 * Origin이 없으면 Referer로 한 번 더 봐준 뒤, 둘 다 우리 것이 아니면 거절한다.
 * (curl·봇·타사이트 스크립트가 여기서 걸린다.)
 */
export function isTrustedOrigin(req: NextRequest): boolean {
  const origin = hostOf(req.headers.get("origin"));
  if (origin) return isOwnHost(origin, req);

  const referer = hostOf(req.headers.get("referer"));
  if (referer) return isOwnHost(referer, req);

  return false;
}

/**
 * 위조 불가능한 클라이언트 IP.
 *
 * ⚠️ 기존 코드는 `x-forwarded-for`의 **첫** 항목을 썼는데, 그 자리는 클라이언트가
 * 직접 채워 보낼 수 있는 구간이라 헤더만 바꿔가며 레이트리밋을 무한 우회할 수 있었다.
 * 프록시가 직접 세팅하는 `x-real-ip`/`x-vercel-forwarded-for`를 먼저 신뢰하고,
 * XFF를 쓸 때는 프록시가 덧붙인 **마지막** 항목을 쓴다.
 */
export function clientIp(req: NextRequest): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const vercel = req.headers.get("x-vercel-forwarded-for")?.split(",").pop()?.trim();
  if (vercel) return vercel;

  const xff = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  if (xff) return xff;

  return "unknown";
}

export interface GuardedMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: {
    id: string;
    name: string;
    type: string;
    size: number;
    data?: string;
  }[];
}

export interface MessageLimits {
  /** 유지할 최대 턴 수 (오래된 것부터 버린다). */
  maxMessages: number;
  /** 메시지 1개의 최대 글자 수. */
  maxCharsPerMessage: number;
  /** 대화 전체 최대 글자 수. */
  maxTotalChars: number;
  /** 전체 첨부 개수 상한 (클라이언트와 동일: 5). */
  maxAttachments: number;
}

export const CHAT_LIMITS: MessageLimits = {
  maxMessages: 40,
  maxCharsPerMessage: 8000,
  maxTotalChars: 40000,
  maxAttachments: 5,
};

/** 부가 기능(예시칩·요약)은 본문보다 더 좁게 잡는다. 첨부는 아예 안 쓴다. */
export const AUX_LIMITS: MessageLimits = {
  maxMessages: 20,
  maxCharsPerMessage: 4000,
  maxTotalChars: 16000,
  maxAttachments: 0,
};

/**
 * 요청 본문을 신뢰 가능한 형태로 정규화한다.
 * 거절이 아니라 **잘라내기**가 기본이다 — 정상 이용자의 긴 상담을 깨지 않으면서
 * 악용자가 한 방에 태울 수 있는 토큰 총량만 못 박기 위해서다.
 */
export function normalizeMessages(
  raw: unknown,
  limits: MessageLimits,
): GuardedMessage[] {
  if (!Array.isArray(raw)) return [];

  // 최신 대화가 중요하므로 뒤에서부터 유지한다.
  const recent = raw.slice(-limits.maxMessages);

  const cleaned: GuardedMessage[] = [];
  let totalChars = 0;
  let attachmentCount = 0;

  for (const item of recent) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;
    const role = m.role === "assistant" ? "assistant" : "user";

    const content =
      typeof m.content === "string"
        ? m.content.slice(0, limits.maxCharsPerMessage)
        : "";

    const attachments: GuardedMessage["attachments"] = [];
    if (limits.maxAttachments > 0 && Array.isArray(m.attachments)) {
      for (const a of m.attachments) {
        if (attachmentCount >= limits.maxAttachments) break;
        if (!a || typeof a !== "object") continue;
        const att = a as Record<string, unknown>;
        if (typeof att.data !== "string" || att.data.length === 0) continue;
        attachments.push({
          id: String(att.id ?? ""),
          name: String(att.name ?? ""),
          type: String(att.type ?? ""),
          size: Number(att.size ?? 0),
          data: att.data,
        });
        attachmentCount++;
      }
    }

    if (!content && attachments.length === 0) continue;

    totalChars += content.length;
    cleaned.push({
      role,
      content,
      ...(attachments.length > 0 ? { attachments } : {}),
    });
  }

  // 전체 글자수 상한을 넘으면 오래된 턴부터 버린다.
  while (cleaned.length > 1 && totalChars > limits.maxTotalChars) {
    const dropped = cleaned.shift();
    totalChars -= dropped?.content.length ?? 0;
  }

  // Anthropic API는 첫 턴이 user여야 한다.
  while (cleaned.length > 0 && cleaned[0].role === "assistant") {
    cleaned.shift();
  }

  return cleaned;
}

/** 외부 직접 호출 차단 응답. */
export function forbiddenResponse(): Response {
  return new Response(
    JSON.stringify({ error: "허용되지 않은 요청입니다." }),
    { status: 403, headers: { "Content-Type": "application/json" } },
  );
}
