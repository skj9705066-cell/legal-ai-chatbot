-- ============================================================
-- 변호사 대시보드 연결용 RLS 정책
-- ============================================================
-- 목적: 승인된 변호사(role/lawyers.status = 'approved')가 브라우저 anon 키로
--   1) 대기 중(status='matching')인 매칭을 볼 수 있고
--   2) 그 매칭에 연결된 상담 내용을 볼 수 있고
--   3) 자신이 보낸 제안(proposals)을 볼 수 있도록 허용한다.
--
-- 실행 방법: Supabase 대시보드 → SQL Editor에 아래 전체를 붙여넣고 Run.
-- (idempotent: 여러 번 실행해도 안전하도록 drop 후 create)
--
-- 주의: 이 정책들은 SUPABASE_SERVICE_ROLE_KEY 없이 anon 키 + RLS만으로
--       변호사 대시보드가 동작하게 하기 위한 것이다.

-- 1) 승인된 변호사는 대기 중인 매칭을 조회할 수 있다.
drop policy if exists "Approved lawyers can view open matchings" on matchings;
create policy "Approved lawyers can view open matchings"
on matchings for select
using (
  status = 'matching'
  and exists (
    select 1 from lawyers l
    where l.user_id = auth.uid() and l.status = 'approved'
  )
);

-- 2) 승인된 변호사는 매칭 검토를 위해 "매칭에 연결된" 상담만 조회할 수 있다.
--    (전체 상담 열람은 개인정보 과다 노출이므로, (a) 대기 중 매칭이거나
--     (b) 본인이 제안을 넣은 매칭에 연결된 상담으로 범위를 한정한다.
--     fix-rls-exposure.sql 와 동일한 정의.)
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

-- 3) 변호사는 자신이 보낸 제안을 조회할 수 있다.
drop policy if exists "Lawyers can view own proposals" on proposals;
create policy "Lawyers can view own proposals"
on proposals for select
using (
  exists (
    select 1 from lawyers l
    where l.id = proposals.lawyer_id and l.user_id = auth.uid()
  )
);

-- 참고: proposals INSERT는 기존 "Lawyers can insert proposals" (with check (true))로
--       이미 허용되어 있고, matchings INSERT는 "Users can insert matchings"로 허용됨.
