"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { listConsultations } from "@/lib/storage";
import { syncConsultationToSupabase } from "@/lib/consultation-sync";
import { hasCompletedAnalysis } from "@/lib/analysis-detection";

/**
 * 로그인 사용자가 감지되면, 이 브라우저 localStorage에 쌓여 있던(=아직 DB에 안 올라간)
 * 과거 상담을 Supabase `consultations` 테이블로 일괄 업로드한다.
 *
 * - 계정+브라우저당 1회만 실행 (완료 플래그로 중복 방지)
 * - 부분 실패 시 플래그를 남기지 않아 다음 로그인 때 재시도
 * - 화면 출력 없음 (side-effect 전용 컴포넌트)
 *
 * 주의: 다른 사용자가 쓰던 브라우저의 상담도 현재 로그인 계정으로 귀속된다(데모 한계).
 * 서버에 사본이 없는 과거 상담은 이 브라우저에 남아있는 것만 복구 가능하다.
 */
export default function ConsultationBackfill() {
  const { account } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!account || ranRef.current) return;
    if (typeof window === "undefined") return;

    const flagKey = `legaladvisor.consultations.backfilled.${account.id}`;
    if (window.localStorage.getItem(flagKey)) {
      ranRef.current = true;
      return;
    }
    ranRef.current = true;

    const locals = listConsultations().filter((c) => c.messages.length > 0);
    if (locals.length === 0) {
      window.localStorage.setItem(flagKey, "1");
      return;
    }

    void (async () => {
      let ok = 0;
      for (const c of locals) {
        const success = await syncConsultationToSupabase(
          c,
          account.id,
          hasCompletedAnalysis(c.messages),
        );
        if (success) ok++;
      }
      // 전부 성공했을 때만 완료 처리 — 부분 실패는 다음 로그인에 재시도한다.
      if (ok === locals.length) {
        window.localStorage.setItem(flagKey, "1");
      }
      if (ok > 0) {
        console.info(
          `[backfill] 과거 상담 ${ok}/${locals.length}건을 Supabase에 업로드했습니다.`,
        );
      }
    })();
  }, [account]);

  return null;
}
