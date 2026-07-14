-- ============================================================
-- 의뢰인이 실제 제안을 "선택"할 수 있게 하는 RLS 정책
-- ============================================================
-- 목적: 의뢰인(매칭 소유자)이 본인 매칭에 도착한 제안 중 하나를 선택하면
--   1) 해당 proposals.selected = true 로 업데이트하고
--   2) 해당 matchings.status = 'matched' 로 업데이트할 수 있도록 허용한다.
--
-- 실행 방법: Supabase 대시보드 → SQL Editor에 아래 전체를 붙여넣고 Run.
-- (idempotent: 여러 번 실행해도 안전)

-- 1) 의뢰인은 본인 매칭에 달린 제안을 선택(update)할 수 있다.
drop policy if exists "Users can select proposals on own matching" on proposals;
create policy "Users can select proposals on own matching"
on proposals for update
using (
  exists (
    select 1 from matchings m
    where m.id = proposals.matching_id and m.user_id = auth.uid()
  )
);

-- 2) 의뢰인은 본인 매칭의 상태를 변경(update)할 수 있다. (예: matching → matched)
drop policy if exists "Users can update own matchings" on matchings;
create policy "Users can update own matchings"
on matchings for update
using (user_id = auth.uid());
