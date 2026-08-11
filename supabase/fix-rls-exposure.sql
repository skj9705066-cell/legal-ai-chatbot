-- ============================================================
-- 🔴 RLS 노출 긴급 패치 (상담 원문·프로필 무단 열람 차단)
-- ============================================================
-- 실행 방법: Supabase 대시보드 → SQL Editor → 아래 전체 붙여넣고 Run.
-- (idempotent: 여러 번 실행해도 안전)
--
-- 배경:
--   schema.sql 의 "Service role full access ..." 정책들은 `using (true)` 에
--   역할(TO) 제한이 없어, 실제로는 anon/authenticated 역할 전체에 적용된다.
--   anon 키는 NEXT_PUBLIC_ 로 클라이언트 JS에 공개 배포되므로, 사실상
--   "아무나 공개 키로 consultations/profiles/lawyers 전체를 읽을 수 있는"
--   상태였다. (상담 원문 = 형사·이혼 등 민감정보 → 개인정보보호법 안전조치 위반)
--
--   관리자 접근은 이 파일 아래가 아니라 schema.sql 의 is_admin() 정책으로
--   이미 커버되므로, 아래 3개 정책은 제거해도 관리자 대시보드는 정상 동작한다.

-- ── 1) 치명적: anon 전체 열람 정책 제거 ──────────────────────
drop policy if exists "Service role full access consultations" on consultations;
drop policy if exists "Service role full access profiles"      on profiles;
drop policy if exists "Service role full access lawyers"       on lawyers;

-- ── 2) 부차적: 변호사의 상담 열람 범위를 "매칭 연결분"으로 축소 ──
-- 기존 정책은 승인 변호사면 '모든' 상담을 읽을 수 있었다. 대시보드의 실제
-- 목적(대기 중 매칭 + 그 매칭에 연결된 상담 검토)에 맞게, 변호사는
--   (a) 아직 매칭 대기 중(status='matching')인 상담  또는
--   (b) 본인이 제안(proposal)을 넣은 매칭에 연결된 상담
-- 만 볼 수 있도록 제한한다.
drop policy if exists "Approved lawyers can view consultations" on consultations;
create policy "Approved lawyers can view consultations"
on consultations for select
using (
  exists (
    select 1 from lawyers l
    where l.user_id = auth.uid() and l.status = 'approved'
  )
  and exists (
    select 1 from matchings m
    where m.consultation_id = consultations.id
      and (
        m.status = 'matching'
        or exists (
          select 1 from proposals p
          where p.matching_id = m.id
            and p.lawyer_id in (
              select id from lawyers where user_id = auth.uid()
            )
        )
      )
  )
);

-- ── 검증 (선택) ──────────────────────────────────────────────
-- 실행 후 남아있는 consultations 정책을 확인:
--   select policyname, cmd, qual from pg_policies
--   where tablename = 'consultations';
-- 기대 결과: 본인(Users can view own) / 관리자(Admins can view all) /
--            변호사(Approved lawyers can view, 매칭 범위 한정) 만 남아야 한다.
