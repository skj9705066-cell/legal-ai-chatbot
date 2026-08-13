import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new Anthropic();

const SYSTEM_PROMPT = `당신은 법률 상담 대화를 읽고, 의뢰인(사용자)이 방금 AI 자문의 말에 곧바로 보낼 수 있는 "예시 답변" 3개를 만드는 도우미입니다.

방금 AI 자문이 한 말(특히 되묻는 질문)에 대해, 의뢰인이 탭 한 번으로 보낼 수 있는 '답변 문장'을 생성하세요.

규칙:
- 의뢰인(1인칭) 시점의 '답변/진술' 문장. 절대 질문이 아닙니다.
  예) AI가 "언제 발생했나요?"라고 물으면 → "3일 전에 발생했어요", "정확한 날짜는 기억나지 않아요"
  예) AI가 "상대방과 어떤 관계인가요?"라고 물으면 → "직장 동료입니다", "모르는 사람이에요"
- 절대 물음표(?)로 끝내지 마세요. 질문을 만들면 안 됩니다.
- 각 문장은 한 문장, 25자 이내로 간결하게.
- 방금 AI가 물어본 내용에 대한, 서로 다른 현실적인 답변 3개.
- AI가 질문이 아니라 분석·설명을 했다면, 의뢰인이 이어서 할 만한 반응이나 추가로 알려줄 정보를 답변 형태로 생성. 예: "합의는 하고 싶지 않아요", "증거 사진이 있어요", "이미 고소를 당했어요"

출력은 아래 JSON 배열 형식만. 다른 텍스트·설명·코드블록(\`\`\`) 절대 금지:
["답변1", "답변2", "답변3"]`;

interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
}

function extractQuestions(text: string): string[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(arr)) return [];
    const items = arr
      .filter((q): q is string => typeof q === "string")
      .map((q) => q.trim())
      .filter((q) => q.length > 0 && q.length <= 60);
    // 답변형만 원하므로 물음표로 끝나는(질문형) 항목은 제외한다.
    const answers = items.filter((q) => !q.endsWith("?") && !q.endsWith("？"));
    return (answers.length > 0 ? answers : items).slice(0, 3);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  // 답변당 1회 부가 호출. 실패해도 부가 기능이라 조용히 빈 배열로 처리한다.
  const rl = rateLimit(`suggest:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ questions: [] });
  }

  const { messages } = (await req.json()) as { messages: ChatMessageInput[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ questions: [] });
  }

  // 최근 대화만 사용해 토큰을 제한. 첨부는 제외하고 텍스트만.
  const transcript = messages
    .slice(-12)
    .map((m) => {
      const who = m.role === "user" ? "의뢰인" : "AI 자문";
      const body = (m.content ?? "").trim() || "(첨부 파일)";
      return `[${who}]\n${body}`;
    })
    .join("\n\n");

  try {
    const response = await client.messages.create({
      // 예시 답변 3개 생성은 단순 잡무 → 최저가 Haiku 4.5 사용(이 키로 접근 확인됨).
      // 답변마다 매번 호출되는 부가 기능이라 Opus를 쓰면 비용이 크게 새어, 저가화가 핵심.
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `다음은 의뢰인과 AI 법률 자문의 상담 대화입니다. 의뢰인이 이어서 보낼 예시 답변 3개를 JSON 배열로 생성하세요.\n\n---\n\n${transcript}`,
        },
      ],
    });

    const text = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("");

    return NextResponse.json({ questions: extractQuestions(text) });
  } catch {
    return NextResponse.json({ questions: [] });
  }
}
