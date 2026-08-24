import { checkBotId } from "botid/server";
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

/**
 * BotID 봇 판정.
 *
 * Origin 검사는 헤더만 맞추면 통과하므로, 실제 브라우저 세션인지까지 보는
 * 레이어를 하나 더 둔다. (Hobby 플랜은 Basic 검증까지 무료)
 *
 * ⚠️ **실패 시 통과(fail-open)** 시킨다. BotID 장애나 설정 문제로 판정이 터졌을 때
 * 정상 상담까지 막히는 게 훨씬 큰 손해라서, 차단은 "봇이라고 확신할 때"만 한다.
 */
export async function isBotRequest(): Promise<boolean> {
  try {
    const { isBot } = await checkBotId();
    return isBot;
  } catch {
    return false;
  }
}

export type BlockReason = "origin" | "bot";

/**
 * BotID 차단 여부. **기본값은 관측 전용(log-only)**.
 *
 * BotID는 실이용자를 오차단할 수 있는 실질 리스크가 있다 — 시드 자동전송은 페이지
 * 마운트 즉시 API를 호출하는데, 느린 회선에서 챌린지가 아직 준비되지 않았다면
 * 정상 이용자가 봇으로 판정될 수 있다. 상담이 막히는 손해가 봇 몇 개 통과보다 크므로
 * 근거 데이터가 쌓이기 전까지는 기록만 한다.
 *
 * 켜려면 Vercel에 `BOTID_ENFORCE=1`을 추가하고 재배포하면 된다(코드 수정 불필요).
 * 판단 근거: 로그의 `reason=bot-observed`에 **브라우저 UA가 안 찍히는 것**을 확인한 뒤 켤 것.
 */
const BOTID_ENFORCE = process.env.BOTID_ENFORCE === "1";

/**
 * 차단 사유 판정 (Origin → BotID 순).
 * 통과면 null.
 *
 * Origin 검사는 항상 차단한다 — 공개 LLM 프록시 구멍을 실제로 막은 게 이 레이어다.
 * BotID는 위 플래그에 따라 차단/관측이 갈린다.
 */
export async function findBlockReason(
  req: NextRequest,
  path: string,
): Promise<BlockReason | null> {
  if (!isTrustedOrigin(req)) return "origin";

  if (await isBotRequest()) {
    if (BOTID_ENFORCE) return "bot";
    // 관측 모드: 차단하지 않고 "막았을 뻔한" 요청만 기록한다.
    const ua = (req.headers.get("user-agent") ?? "(none)").slice(0, 120);
    console.warn(
      `[api-guard] reason=bot-observed (not blocked) path=${path} ua="${ua}"`,
    );
  }

  return null;
}

/**
 * 차단을 로그로 남긴다.
 *
 * 이게 없으면 403이 "봇을 막은 것"인지 "정상 이용자가 깨진 것"인지 구분할 수 없다.
 * 판정 근거가 되는 건 결국 **User-Agent**다 — 브라우저 UA가 찍히면 실이용자가
 * 막히고 있다는 뜻이므로 즉시 되돌려야 한다.
 *
 * ⚠️ **Referer는 호스트만 남긴다.** 전체 URL에는 `/chat/xxx?seed=<이용자가 입력한
 * 법률 문제>`처럼 민감한 개인정보가 그대로 들어있어서 로그에 남기면 안 된다.
 * 같은 이유로 IP도 남기지 않는다(레이트리밋 키로만 쓰고 버린다).
 */
export function logBlock(
  req: NextRequest,
  reason: BlockReason,
  path: string,
): void {
  const ua = (req.headers.get("user-agent") ?? "(none)").slice(0, 120);
  const origin = req.headers.get("origin") ?? "(none)";
  const refererHost = hostOf(req.headers.get("referer")) ?? "(none)";
  console.warn(
    `[api-guard] blocked reason=${reason} path=${path} origin=${origin} refererHost=${refererHost} ua="${ua}"`,
  );
}

/** 외부 직접 호출 차단 응답. */
export function forbiddenResponse(): Response {
  return new Response(
    JSON.stringify({ error: "허용되지 않은 요청입니다." }),
    { status: 403, headers: { "Content-Type": "application/json" } },
  );
}

/**
 * 🔴 AI 라우트 에러를 이용자에게 보여줄 문구로 변환한다.
 *
 * 과거 라우트들이 `err.message`를 그대로 스트림/JSON에 실어 보내서, 의뢰인 화면에
 * Anthropic 원문이 노출됐다. 실제로 2026-08-23 상담 화면에 이렇게 찍혔다:
 *   API 오류 (400): {"type":"error","error":{"message":"Your credit balance is
 *   too low to access the Anthropic API..."},"request_id":"req_011Ce..."}
 * 법률 상담 서비스에서 "우리 결제가 밀렸다"는 사실과 내부 request_id가 이용자에게
 * 그대로 읽히는 건 신뢰 문제다. 원문은 서버 로그로만 남기고 화면에는 이 문구만 낸다.
 *
 * 로그에는 상담 본문을 절대 넣지 말 것(logBlock 주석의 이유와 동일).
 */
export function userFacingError(err: unknown, path: string): string {
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? (err as { status?: unknown }).status
      : undefined;
  const detail =
    err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  console.error(
    `[ai-route] error path=${path} status=${String(status ?? "(none)")} detail=${detail.slice(0, 300)}`,
  );

  if (status === 429) {
    return "지금 이용자가 많아 답변이 지연되고 있습니다. 잠시 후 다시 시도해주세요.";
  }
  if (typeof status === "number" && status >= 500) {
    return "일시적인 오류로 답변을 만들지 못했습니다. 잠시 후 다시 시도해주세요.";
  }
  // 400(크레딧 소진·요청 형식 등)을 포함한 나머지. 원인을 이용자에게 드러내지 않는다.
  return "일시적인 점검으로 답변을 만들지 못했습니다. 잠시 후 다시 시도해주세요.";
}
