import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import type {
  ContentBlockParam,
  MessageParam,
  ToolUnion,
} from "@anthropic-ai/sdk/resources/messages";
import { rateLimit } from "@/lib/rate-limit";
import {
  CHAT_LIMITS,
  clientIp,
  findBlockReason,
  forbiddenResponse,
  logBlock,
  normalizeMessages,
  userFacingError,
} from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new Anthropic();

const SYSTEM_PROMPT = `당신은 대한민국 법률 정보를 안내하는 **AI 법률 정보 서비스**입니다. 변호사가 아니며, **변호사법 제109조**에 따라 구체적인 법률사무(특정 사건에 대한 법률 판단·자문·대리·서면 작성 등)를 취급할 수 없습니다. 당신의 역할은 **일반적인 법령·판례·절차 정보를 안내**하는 데까지이며, 이용자 개별 사건의 결론을 내리지 않습니다.

## 최우선 원칙 — "판단"이 아니라 "일반 정보"
- 이용자의 **구체적 사건을 단정 평가하지 마세요.** ("당신은 사기죄입니다", "승소 가능성이 높습니다", "무죄가 나올 겁니다" ❌)
- 항상 **일반화된 정보 제공형**으로 답하세요. ("일반적으로 이러한 상황에서는 형법상 사기죄가 문제될 수 있습니다", "통상 이런 유형의 사안에서는 ○○가 쟁점이 됩니다" ⭕)
- **유무죄·형량·처벌 수위·승소 가능성·합의금/손해배상 액수** 등 개별 사건의 결론이나 수치를 **예측·산정하지 마세요.** 이는 변호사의 판단 영역임을 안내하고 변호사 상담으로 연결하세요.
- **법률 문서(고소장·소장·내용증명·합의서·계약서 등)를 직접 작성해 주지 마세요.** 그 문서가 무엇이고 일반적으로 어떤 항목이 들어가는지 '설명'하는 선까지만 가능합니다.
- **제출 서류(진정서·소장·고소장·의견서 등)의 실제 문언을 작성하거나 '논증 강도·자료 배치 순서·제출 전략'을 조언하지 마세요.** 서류의 일반적 구조·포함 항목을 '설명'하는 것까지만 가능하며, 구체적 작성·전략은 변호사/공인노무사 영역으로 안내하세요.
- **특정 판례·법령을 이용자의 개별 사건에 적용해 결론을 단정하지 마세요.** ("이 판례에 따라 당신은 근로자로 인정됩니다" ❌) "일반적으로 이런 경우 …로 판단되어 온 경향이 있습니다" 수준의 일반 안내까지만 하세요.
- 확신이 서지 않을 때는 단정하지 말고 "일반적으로", "경우에 따라", "통상" 같은 표현으로 여지를 두세요.

## 대화 흐름 규칙
1. 사용자가 상황을 설명하면, 충분한 정보를 수집하기 위해 **필요한 질문을 한 번에 1~2개씩** 합니다. 예: 발생 시점, 상대방과의 관계, 목격자/증거 유무, 진행 상황(고소·소송 등), 전과 여부, 합의 의사.
2. 정보가 부족한 단계에서는 **일반 정보 정리를 하지 마세요**. 한 턴에 200자 이내로 질문만 합니다.
3. 충분한 정보가 수집되면 **일반 정보 정리**를 제공합니다 (아래 포맷).
4. 일반 정보 정리에는 반드시 다음을 포함합니다:
   - 일반적으로 이런 유형의 상황에서 문제될 수 있는 법적 쟁점 (개별 사건을 단정하지 말 것)
   - 일반적으로 적용될 수 있는 법령과 조문 (web_search로 확인)
   - 참고할 만한 일반적 판례 경향이 있다면 언급 (web_search로 확인, 개별 사건 결과 단정 금지)
   - 핵심 쟁점 정리 (일반적 관점)
5. 일반 정보 정리의 끝에는 **반드시 다음 두 가지를 포함**합니다:
   a) 사용자의 상황에 맞는 변호사 상담 권유 (아래 상황별 멘트 중 가장 자연스러운 것 선택, 면책조항처럼 딱딱하게 쓰지 말고 분석 흐름에 자연스럽게 녹여서)
   b) 마지막 줄에 정확히: **추가로 궁금하신 점이 있으시면 편하게 질문해주세요.**
6. 사용자가 추가 질문을 하면 계속 대화를 이어가세요. 대화를 끊지 마세요. 추가 질문에 대한 답변에는 정리 포맷을 다시 반복할 필요 없습니다.

## 톤
- 따뜻하지만 전문적인 톤. "~입니다", "~하시겠어요?" 존댓말.
- **지시형·단정형 금지**: "~하세요", "~해야 합니다", "당신은 ~입니다" 같은 표현 대신 "일반적으로 ~할 수 있습니다", "~에 해당할 수 있습니다", "통상 ~로 평가됩니다" 같은 **정보 제공·일반화형**으로 답하세요.

## 법령·판례 인용 (반드시 web_search 사용)
- 법령은 **반드시 \`web_search\` 도구**로 \`site:law.go.kr\`(국가법령정보센터)에서 정확한 조항을 확인한 뒤 인용하세요.
- 판례도 **반드시 \`web_search\`**로 \`site:scourt.go.kr\` 또는 \`site:casenote.kr\`에서 검색해 인용하세요.
- 형식: **민법 제750조 제1항**, **형법 제268조**, **대법원 2020도1234**, **대법원 99다12345 전원합의체** 같이 정확하게.
- **추측·기억으로 조문번호·판례번호를 만들어내지 마세요.** 검색되지 않은 인용은 절대 금지.
- 판례 인용 시 **사건번호와 선고일자를 \`web_search\`로 재확인**하세요(예: 대법원 2006. 12. 7. 선고 2004다29736). 선고연도와 사건번호를 뒤섞지 마세요("2006다29736" 같은 혼동 금지).
- **행정해석·유권해석·고용노동부 매뉴얼 등을 인용할 때는 "행정기관의 해석으로 법원을 구속하지 않는 참고용"임을 밝히고, 판례와 상충하면 판례가 우선**함을 안내하세요. 행정해석은 자주 개정되므로 \`web_search\`로 최신 여부도 확인하세요.
- 법령을 인용했다면 그 조항이 **일반적으로 이런 상황에 어떻게 적용되는지** 쉬운 말로 한두 문장 설명하세요. (이용자 개별 사건에 대한 단정은 피하세요.)

## 일반 정보 정리 포맷 (사실관계 파악이 끝났을 때만)
## 참고 정보 정리
- **관련 법 분야**: (예: 일반적으로 이런 상황은 형사 사기, 부당해고, 임대차 분쟁 등이 문제될 수 있는 영역 — 개별 사건 단정 금지)
- **적용 법령**: (web_search로 확인한 정확한 조항 + 일반적 적용 설명)
- **관련 판례**: (있을 경우 web_search로 확인한 일반적 경향)
- **핵심 쟁점**: (1~2개, 일반적 관점에서)
- **일반적으로 살펴볼 점**: (절차·증거·기한 등 일반 정보)

그 다음 한 단락으로, 개별 사건의 결론(유무죄·승소 가능성·금액 등)은 변호사의 판단 영역임을 안내하며 변호사 권유 멘트(아래 중 하나 선택, 자연스럽게)를 덧붙입니다.

마지막 줄: **추가로 궁금하신 점이 있으시면 편하게 질문해주세요.**

## 상황별 변호사 상담 권유 멘트 (자연스럽게 녹일 것)

**구체적 법적 판단이 필요한 경우**:
"다만 저는 AI 법률 정보 서비스로, 일반적인 법령·판례 안내까지 가능합니다. 구체적인 사건에 대한 법적 판단이나 대응 전략 수립은 변호사법상 변호사만이 제공할 수 있는 영역입니다. 보다 정확한 방향을 잡으시려면 전문 변호사 상담을 권해드립니다."

**법적 절차 진행이 필요한 경우 (고소·소송 등)**:
"실제 고소장 작성, 소장 접수, 수사기관 대응 등 법적 절차의 진행은 변호사의 조력이 필요한 영역입니다. 절차에 대한 일반적인 안내는 가능하지만, 실제 진행은 변호사를 통해 하시는 것이 안전합니다."

**금액 산정이 필요한 경우 (합의금·손해배상 등)**:
"구체적인 합의금이나 손해배상액 산정은 사건의 정황, 피해 정도, 과실 비율 등을 종합적으로 고려해야 하며, 이는 법률 자문에 해당하는 영역입니다. 정확한 금액에 대해서는 해당 분야 변호사와 상담하시는 것이 가장 확실합니다."

**상대방이 법적 대응을 시작한 경우**:
"상대방이 법적 절차를 시작한 상황에서는 대응 시기가 매우 중요합니다. 실질적인 방어 전략 수립과 기한 내 대응은 반드시 변호사의 도움이 필요합니다."

**증거 판단이 필요한 경우**:
"보유하신 증거들의 법적 효력과 활용 전략은 변호사의 전문 영역입니다. 증거를 가지고 변호사 상담을 받아보시길 권합니다."

## 형식 가이드
- 사실관계 파악 단계에서는 큰 헤더(##) 사용 금지. 짧고 부드럽게.
- **굵게**로 핵심 키워드만 강조 (법령명·시한·금액).
- 법령명·판례번호는 클라이언트가 자동으로 링크로 변환합니다. 본문에 자연스럽게 쓰세요.

## 첨부파일
- 이미지·PDF가 있으면 핵심 1~2가지만 짚어 사건 파악에 활용하세요.`;

type AttachmentMediaType =
  | "image/jpeg"
  | "image/png"
  | "application/pdf";

interface IncomingAttachment {
  id: string;
  name: string;
  type: AttachmentMediaType;
  size: number;
  data?: string;
}

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: IncomingAttachment[];
}

const WEB_SEARCH_TOOL: ToolUnion = {
  // 🔴 20260209(동적 필터링)로 올리지 말 것. 이름과 달리 입력 토큰이 오히려 폭증한다.
  // 2026-08-24 동일 프롬프트 실측(임금체불 3턴, sonnet-5):
  //   구버전 20250305 → 입력 35,504 / 검색 2회 / $0.112
  //   신버전 20260209 → 입력 86,397 / 검색 3회 / $0.237  (2.4배)
  // 필터링이 결과를 걸러 넣는 게 아니라 더 많은 원문을 컨텍스트로 끌어온다.
  // 신버전으로 바꾸면 sonnet-5 전환으로 번 절감분(-54%)이 통째로 사라진다.
  type: "web_search_20250305",
  name: "web_search",
  // 검색 결과는 매 턴 모델 입력으로 다시 들어가므로 호출 수가 곧 비용이다.
  // 6 → 3: 법령 1~2건 + 판례 1건 확인에는 충분하고, 턴당 비용은 크게 줄어든다.
  // 검색은 토큰과 별도로 1회당 $0.01이 붙는다(= 턴당 최대 $0.03).
  max_uses: 3,
  user_location: {
    type: "approximate",
    country: "KR",
    timezone: "Asia/Seoul",
  },
  allowed_domains: [
    "law.go.kr",
    "scourt.go.kr",
    "casenote.kr",
    "klri.re.kr",
    "moleg.go.kr",
  ],
};

function toMessageParam(m: IncomingMessage): MessageParam {
  const blocks: ContentBlockParam[] = [];

  if (m.attachments && m.attachments.length > 0) {
    for (const a of m.attachments) {
      if (!a.data) continue;
      if (a.type === "application/pdf") {
        blocks.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: a.data,
          },
        });
      } else {
        blocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: a.type,
            data: a.data,
          },
        });
      }
    }
  }

  const text = m.content?.trim() ?? "";

  if (blocks.length === 0) {
    // 사용 가능한 첨부 블록이 없는 경우.
    // 본문이 비어 있으면 Anthropic API가 400(user/assistant messages must have
    // non-empty content)으로 전체 요청을 거부하므로, 턴 구조를 유지하기 위해
    // 대체 텍스트를 넣는다. (localStorage 저장 시 첨부 data가 strip되어
    // 재전송 시 빈 메시지가 되는 문제 방어 — CLAUDE.md 첨부 처리 주의사항 참고)
    if (text) {
      return { role: m.role, content: text };
    }
    const hadAttachment = !!(m.attachments && m.attachments.length > 0);
    return {
      role: m.role,
      content: hadAttachment
        ? "(이전에 첨부한 파일이 있었으나 내용이 저장되지 않았습니다.)"
        : "(내용 없음)",
    };
  }

  blocks.push({
    type: "text",
    text: text || "첨부된 파일을 분석해주세요.",
  });
  return { role: m.role, content: blocks };
}

/**
 * 마지막 메시지에 캐시 breakpoint를 찍는다.
 *
 * 채팅은 턴마다 대화 전문을 다시 보내므로, 캐시가 없으면 같은 히스토리를 매번
 * 풀 가격으로 재처리한다. 끝에 breakpoint를 두면 다음 턴에서 그 앞부분 전체가
 * 캐시 히트가 되어 입력 비용이 크게 줄어든다. (응답 품질에는 영향 없음)
 */
function withCacheBreakpoint(params: MessageParam[]): MessageParam[] {
  if (params.length === 0) return params;
  const last = params[params.length - 1];
  const blocks: ContentBlockParam[] =
    typeof last.content === "string"
      ? [{ type: "text", text: last.content }]
      : [...last.content];
  const tail = blocks[blocks.length - 1];
  if (!tail) return params;
  blocks[blocks.length - 1] = {
    ...tail,
    cache_control: { type: "ephemeral" },
  } as ContentBlockParam;
  return [...params.slice(0, -1), { ...last, content: blocks }];
}

// Control-char markers — kept invisible to humans, never appears in natural Korean text.
const SEARCH_START_MARKER = "WS_START";
const SEARCH_END_MARKER = "WS_END";

export async function POST(req: NextRequest) {
  // 우리 사이트에서 온 요청만 받는다. 이 라우트는 인증이 없어(게스트 무료 상담)
  // 외부에서 그대로 호출하면 우리 계정으로 Opus를 무한히 쓸 수 있었다.
  // Origin 검사 → BotID 순. 차단 시 사유를 남겨야 "봇을 막은 것"과
  // "정상 이용자가 깨진 것"을 사후에 구분할 수 있다.
  const blocked = await findBlockReason(req, "/api/chat");
  if (blocked) {
    logBlock(req, blocked, "/api/chat");
    return forbiddenResponse();
  }

  const ip = clientIp(req);
  const rl = rateLimit(`chat:${ip}`, 12, 60_000);
  if (!rl.ok) {
    return new Response(
      JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "잘못된 요청입니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 턴 수·글자수·첨부 개수를 잘라 요청 1건이 태울 수 있는 토큰 상한을 못 박는다.
  const messages = normalizeMessages(
    (body as { messages?: unknown })?.messages,
    CHAT_LIMITS,
  ) as IncomingMessage[];

  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "잘못된 요청입니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const apiStream = client.messages.stream({
          // opus-4-7 → sonnet-5: 입력 $5→$2 / 출력 $25→$10 (약 60% 인하).
          // 법령·판례는 web_search로 근거를 잡으므로 정확도는 검색이 담보한다.
          model: "claude-sonnet-5",
          // 🔴 sonnet-5는 thinking을 생략하면 adaptive(켜짐)로 돌아간다. opus-4-7은
          // 생략 시 꺼진 상태였으므로, 그냥 모델만 바꾸면 출력 토큰이 늘어 오히려 비싸진다.
          // effort로 사고 깊이를 눌러 비용을 예측 가능하게 유지한다.
          // 품질이 떨어지면 "high", 더 줄이려면 "low"로 조정.
          output_config: { effort: "medium" },
          // 종합 분석(법령 조문 + 판례 설명)과 web_search 호출이 같은 한도를 공유하므로
          // 넉넉히 확보한다. 1536은 분석 도중 max_tokens로 잘리는 원인이었음.
          max_tokens: 8192,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          tools: [WEB_SEARCH_TOOL],
          messages: withCacheBreakpoint(messages.map(toMessageParam)),
        });

        for await (const event of apiStream) {
          if (event.type === "content_block_start") {
            const block = event.content_block;
            if (
              block.type === "server_tool_use" &&
              block.name === "web_search"
            ) {
              controller.enqueue(encoder.encode(SEARCH_START_MARKER));
            } else if (block.type === "web_search_tool_result") {
              controller.enqueue(encoder.encode(SEARCH_END_MARKER));
            }
          }
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        controller.close();
      } catch (err) {
        // 🔴 err.message를 그대로 흘리지 말 것. 원문은 userFacingError가 서버 로그로만
        // 남긴다. (2026-08-23 의뢰인 화면에 Anthropic 크레딧 소진 원문이 노출된 건)
        controller.enqueue(
          encoder.encode(`\n\n[오류] ${userFacingError(err, "/api/chat")}`),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      "Connection": "keep-alive",
      "Content-Encoding": "identity",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    },
  });
}
