import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { CaseSummary } from "@/lib/types";
import { rateLimit } from "@/lib/rate-limit";
import {
  AUX_LIMITS,
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

const SYSTEM_PROMPT = `당신은 한국 변호사 매칭 플랫폼의 사건 요약 전문가입니다. 사용자와 AI 법률 자문가의 대화 전문을 읽고, 변호사가 한눈에 사건을 파악할 수 있는 사건 요약서를 JSON 형식으로 생성합니다.

반드시 다음 JSON 스키마만 출력하세요. 다른 텍스트, 마크다운 코드블록(\`\`\`), 설명을 절대 포함하지 마세요.

{
  "caseType": "string (예: 임대차 분쟁, 부당해고, 교통사고 손해배상)",
  "keyIssues": ["string", "string", ...],
  "relevantLaws": ["string (예: 주택임대차보호법 제3조)", ...],
  "urgency": "low | medium | high",
  "summary": "string (1-2문장의 사건 핵심 요약)"
}

원칙:
- keyIssues는 3-5개의 핵심 법적 쟁점을 간결한 명사구로 작성
- relevantLaws는 가능하면 조문까지 명시, 2-5개
- urgency는 소멸시효 임박, 형사 수사 진행, 즉시 대응 필요 시 high. 일반 분쟁은 medium. 단순 자문성 사안은 low.
- summary는 변호사가 사건의 본질을 즉시 이해할 수 있도록 작성`;

interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
}

function extractJson(text: string): CaseSummary | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (
      typeof parsed.caseType !== "string" ||
      !Array.isArray(parsed.keyIssues) ||
      !Array.isArray(parsed.relevantLaws) ||
      !["low", "medium", "high"].includes(parsed.urgency) ||
      typeof parsed.summary !== "string"
    ) {
      return null;
    }
    return {
      caseType: parsed.caseType,
      keyIssues: parsed.keyIssues.map(String),
      relevantLaws: parsed.relevantLaws.map(String),
      urgency: parsed.urgency,
      summary: parsed.summary,
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const blocked = await findBlockReason(req, "/api/case-summary");
  if (blocked) {
    logBlock(req, blocked, "/api/case-summary");
    return forbiddenResponse();
  }

  const ip = clientIp(req);
  const rl = rateLimit(`summary:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const messages = normalizeMessages(
    (body as { messages?: unknown })?.messages,
    AUX_LIMITS,
  ) as ChatMessageInput[];
  if (messages.length === 0) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const transcript = messages
    .map(
      (m) =>
        `[${m.role === "user" ? "의뢰인" : "AI 자문"}]\n${m.content.trim()}`,
    )
    .join("\n\n");

  try {
    const response = await client.messages.create({
      // 변호사 매칭용 내부 JSON 요약 → 최저가 Haiku 4.5로 충분(이 키로 접근 확인됨).
      // 이용자에게 노출되지 않는 추출 작업이라 Opus가 불필요.
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `다음은 의뢰인과 AI 법률 자문의 상담 전문입니다. 변호사 매칭용 사건 요약서를 JSON으로 생성하세요.\n\n---\n\n${transcript}`,
        },
      ],
    });

    const text = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("");

    const summary = extractJson(text);
    if (!summary) {
      return NextResponse.json(
        { error: "요약 결과를 해석할 수 없습니다." },
        { status: 502 },
      );
    }
    return NextResponse.json({ summary });
  } catch (err) {
    // 🔴 err.message를 그대로 내보내지 말 것 — 매칭 화면에 그대로 렌더된다.
    // 원문은 userFacingError가 서버 로그로만 남긴다.
    return NextResponse.json(
      { error: userFacingError(err, "/api/case-summary") },
      { status: 500 },
    );
  }
}
