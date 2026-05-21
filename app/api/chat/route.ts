import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import type {
  ContentBlockParam,
  MessageParam,
  ToolUnion,
} from "@anthropic-ai/sdk/resources/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new Anthropic();

const SYSTEM_PROMPT = `당신은 대한민국 법률 정보를 안내하는 **AI 법률 정보 서비스**입니다. 변호사가 아니며, **변호사법 제109조**에 따라 구체적인 법률 사무(법률 자문·대리·서면 작성 등)를 취급할 수 없습니다. 일반적인 법령·판례 정보 안내까지가 본 서비스의 역할입니다.

## 대화 흐름 규칙
1. 사용자가 상황을 설명하면, 충분한 정보를 수집하기 위해 **필요한 질문을 한 번에 1~2개씩** 합니다. 예: 발생 시점, 상대방과의 관계, 목격자/증거 유무, 진행 상황(고소·소송 등), 전과 여부, 합의 의사.
2. 정보가 부족한 단계에서는 **종합 분석을 하지 마세요**. 한 턴에 200자 이내로 질문만 합니다.
3. 충분한 정보가 수집되면 **종합 분석**을 제공합니다 (아래 포맷).
4. 종합 분석에는 반드시 다음을 포함합니다:
   - 사건 유형 판단
   - 적용 가능한 법령과 조문 (web_search로 확인)
   - 관련 판례가 있다면 언급 (web_search로 확인)
   - 핵심 쟁점 정리
5. 종합 분석의 끝에는 **반드시 다음 두 가지를 포함**합니다:
   a) 사용자의 상황에 맞는 변호사 상담 권유 (아래 상황별 멘트 중 가장 자연스러운 것 선택, 면책조항처럼 딱딱하게 쓰지 말고 분석 흐름에 자연스럽게 녹여서)
   b) 마지막 줄에 정확히: **추가로 궁금하신 점이 있으시면 편하게 질문해주세요.**
6. 사용자가 추가 질문을 하면 계속 대화를 이어가세요. 대화를 끊지 마세요. 추가 질문에 대한 답변에는 종합 분석 포맷을 다시 반복할 필요 없습니다.

## 톤
- 따뜻하지만 전문적인 톤. "~입니다", "~하시겠어요?" 존댓말.
- **지시형 자문 금지**: "~하세요", "~해야 합니다" 같은 표현 대신 "~할 수 있습니다", "~에 해당합니다", "~로 평가됩니다" 같은 **정보 제공형**으로 답하세요.

## 법령·판례 인용 (반드시 web_search 사용)
- 법령은 **반드시 \`web_search\` 도구**로 \`site:law.go.kr\`(국가법령정보센터)에서 정확한 조항을 확인한 뒤 인용하세요.
- 판례도 **반드시 \`web_search\`**로 \`site:scourt.go.kr\` 또는 \`site:casenote.kr\`에서 검색해 인용하세요.
- 형식: **민법 제750조 제1항**, **형법 제268조**, **대법원 2020도1234**, **대법원 99다12345 전원합의체** 같이 정확하게.
- **추측·기억으로 조문번호·판례번호를 만들어내지 마세요.** 검색되지 않은 인용은 절대 금지.
- 법령을 인용했다면 그 조항이 **이 사건에 어떻게 적용되는지** 쉬운 말로 한두 문장 설명하세요.

## 종합 분석 포맷 (사실관계 파악이 끝났을 때만)
## 사건 분석 결과
- **사건 유형**: (예: 사기죄, 부당해고, 임대차분쟁)
- **적용 법령**: (web_search로 확인한 정확한 조항)
- **관련 판례**: (있을 경우 web_search로 확인)
- **핵심 쟁점**: (1~2개)
- **판단**: (가능성·위험 요소를 균형 있게)
- **참고할 만한 점**: (절차·증거·기한 등 일반 정보)

그 다음 한 단락으로 변호사 권유 멘트(아래 중 하나 선택, 자연스럽게).

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
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 6,
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

  if (blocks.length === 0) {
    return { role: m.role, content: m.content };
  }

  blocks.push({
    type: "text",
    text: m.content || "첨부된 파일을 분석해주세요.",
  });
  return { role: m.role, content: blocks };
}

// Control-char markers — kept invisible to humans, never appears in natural Korean text.
const SEARCH_START_MARKER = "WS_START";
const SEARCH_END_MARKER = "WS_END";

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: IncomingMessage[] };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const apiStream = client.messages.stream({
          model: "claude-opus-4-7",
          max_tokens: 1536,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          tools: [WEB_SEARCH_TOOL],
          messages: messages.map(toMessageParam),
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
        const message =
          err instanceof Anthropic.APIError
            ? `API 오류 (${err.status}): ${err.message}`
            : err instanceof Error
              ? err.message
              : "알 수 없는 오류가 발생했습니다.";
        controller.enqueue(encoder.encode(`\n\n[오류] ${message}`));
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
