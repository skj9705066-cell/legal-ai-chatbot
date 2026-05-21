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
  "사건 유형",
  "적용 법령",
  "핵심 쟁점",
  "관련 법령",
  "관련 판례",
  "종합 분석",
  "분석 결과",
  "사건 분석",
];

const LAWYER_KEYWORDS = [
  "변호사 상담",
  "변호사의 조력",
  "변호사를 통해",
  "전문 변호사",
  "변호사와 상담",
  "변호사법",
  "변호사 권해",
  "변호사의 도움",
];

function countMatches(text: string, keywords: string[]): number {
  let n = 0;
  for (const k of keywords) {
    if (text.includes(k)) n++;
  }
  return n;
}

export function isAnalysisMessage(content: string): boolean {
  if (!content || content.length < 60) return false;
  const analysisHits = countMatches(content, ANALYSIS_KEYWORDS);
  const lawyerHits = countMatches(content, LAWYER_KEYWORDS);
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
