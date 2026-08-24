import type { ChatMessage } from "./types";

/**
 * Detect whether the AI has completed a comprehensive case analysis.
 *
 * Heuristic (content-based, not message-count):
 *   - At least 2 "analysis" keywords AND at least 1 "lawyer-referral" keyword
 *     must appear in the same assistant message.
 *
 * Returning a per-message verdict (not aggregate) so the banner only shows
 * once the analysis itself is delivered, and stays after follow-up questions.
 */

const ANALYSIS_KEYWORDS = [
  // SYSTEM_PROMPT의 "일반 정보 정리 포맷" 헤더 — 가장 결정적인 신호
  "참고 정보 정리",
  "관련 법 분야",
  "사건 유형",
  "적용 법령",
  "핵심 쟁점",
  "관련 법령",
  "관련 판례",
  "종합 분석",
  "분석 결과",
  "사건 분석",
];

/**
 * 🔴 정확한 문자열이 아니라 정규식이어야 한다.
 *
 * SYSTEM_PROMPT는 변호사 권유 멘트를 "자연스럽게 녹여서" 쓰라고 지시한다.
 * 그래서 모델은 예시 문구를 그대로 쓰지 않고 변형한다. 실제로 관측된 문장:
 *   "법적 절차의 진행은 변호사나 공인노무사의 조력이 필요한 영역입니다"
 * 과거 키워드 목록에는 "변호사의 조력"이 있었으나 위 문장에는 "변호사나 공인노무사의
 * 조력"이라 부분문자열이 어긋나 매칭이 0건이 됐고, 매칭 CTA가 통째로 안 떴다.
 * (2026-08-24 확인 — opus-4-7·sonnet-5 양쪽에서 재현된 기존 버그)
 *
 * 따라서 "변호사" 뒤 20자 이내에 권유성 어휘가 오면 잡는다. 문장 경계(.!?·줄바꿈)를
 * 넘지 않게 막아 무관한 두 문장이 우연히 이어져 걸리는 오탐을 방지한다.
 */
const LAWYER_PATTERNS: RegExp[] = [
  /변호사[^.!?\n]{0,20}?(상담|조력|도움|선임|의뢰|자문|권해|통해|판단|영역)/,
  /변호사법/,
];

function countMatches(text: string, keywords: string[]): number {
  let n = 0;
  for (const k of keywords) {
    if (text.includes(k)) n++;
  }
  return n;
}

function countPatternMatches(text: string, patterns: RegExp[]): number {
  let n = 0;
  for (const p of patterns) {
    if (p.test(text)) n++;
  }
  return n;
}

export function isAnalysisMessage(content: string): boolean {
  if (!content || content.length < 60) return false;
  const analysisHits = countMatches(content, ANALYSIS_KEYWORDS);
  const lawyerHits = countPatternMatches(content, LAWYER_PATTERNS);
  return analysisHits >= 2 && lawyerHits >= 1;
}

/**
 * True if any assistant message in the conversation contains a completed analysis.
 * Once true, stays true (analysis is durable — follow-up Q&A doesn't reset it).
 */
export function hasCompletedAnalysis(messages: ChatMessage[]): boolean {
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    if (isAnalysisMessage(m.content)) return true;
  }
  return false;
}
