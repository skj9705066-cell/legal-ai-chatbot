import { supabase } from "@/lib/supabase";

export interface ConsultationAccessMeta {
  adminId: string;
  adminEmail: string;
  consultationId: string;
  consultationTitle: string | null;
  category: string | null;
}

/**
 * 관리자가 상담 원문을 열람할 때 접근 기록을 남긴다.
 * (개인정보보호법 안전조치 — 접속기록. supabase/access-logs.sql 참고)
 *
 * 감사 로그는 부가 동작이므로, 실패해도 UI 흐름을 막지 않도록
 * 예외를 삼키고 경고만 남긴다.
 */
export async function logConsultationAccess(
  meta: ConsultationAccessMeta,
): Promise<void> {
  try {
    const { error } = await supabase.from("consultation_access_logs").insert({
      admin_id: meta.adminId,
      admin_email: meta.adminEmail,
      consultation_id: meta.consultationId,
      consultation_title: meta.consultationTitle,
      category: meta.category,
    });
    if (error) {
      console.warn("[access-log] insert 실패:", error.message);
    }
  } catch (err) {
    console.warn("[access-log] insert 예외:", err);
  }
}
