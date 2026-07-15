import { supabase } from "@/lib/supabase";
import type { ChatMessage, Consultation } from "@/lib/types";

// Supabase 저장용으로 첨부 base64(data)를 떼고 메타데이터만 남긴다.
// 관리자 화면은 텍스트 content만 표시하므로 base64는 불필요하고 row 용량만 키운다.
// (localStorage 저장과 동일한 strip 규칙 — lib/storage.ts 참고)
function stripAttachments(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) =>
    m.attachments && m.attachments.length > 0
      ? { ...m, attachments: m.attachments.map(({ data, ...rest }) => rest) }
      : m,
  );
}

/**
 * 로컬 Consultation을 Supabase `consultations` 테이블에 upsert 한다.
 * PK(id)가 상담 UUID라 충돌 시 갱신하므로, 백필/실시간 저장을 몇 번 재실행해도 안전하다.
 * 저장 실패가 채팅 흐름을 막지 않도록 예외를 삼키고 경고만 남긴다.
 *
 * @returns 저장 성공 여부
 */
export async function syncConsultationToSupabase(
  c: Consultation,
  userId: string,
  analysisComplete: boolean,
): Promise<boolean> {
  try {
    const { error } = await supabase.from("consultations").upsert({
      id: c.id,
      user_id: userId,
      category: c.category ?? null,
      title: c.title ?? null,
      messages: stripAttachments(c.messages) as never,
      analysis_complete: analysisComplete,
      // 원본 생성 시각을 함께 보내 백필된 과거 상담의 "시작 시간"을 보존한다.
      created_at: new Date(c.createdAt).toISOString(),
      updated_at: new Date(c.updatedAt).toISOString(),
    });
    if (error) {
      console.warn("[consultation-sync] upsert 실패:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[consultation-sync] upsert 예외:", err);
    return false;
  }
}
