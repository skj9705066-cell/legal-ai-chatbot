-- 03 — 무료 방문 점검 개편 (2026-11): 지역·관심 서비스·방문 예약·상담 이력
--
-- ⚠️ 운영 DB 변경이다. 반드시 운영자 승인 후 Supabase SQL Editor에서 실행한다(자동 마이그레이션 없음).
-- 순서: 01 schema.sql → 02-hardening(적용 완료) → 이 파일 → (그 다음) 새 코드 배포.
--   새 코드는 이 칼럼들을 저장에 쓰므로, 배포 전에 실행해야 한다. 실행하지 않고 배포하면
--   DB 자동 점검(lib/server/db-check.ts의 '03 방문 점검 칼럼')이 실패해 신청 API가 503으로 접수를 멈춘다(데이터 손상 없음).
-- 성격: 추가(additive)만 한다. 기존 행·기존 값은 바꾸거나 지우지 않는다.
--   * 새 칼럼은 모두 null 허용 또는 기본값이 있어 기존 신청은 그대로 유효하다.
--   * service_type·claim_status의 허용 값을 "넓히기만" 한다(기존 값은 모두 계속 허용).
--   * 기존 코드(이전 배포)도 이 파일 실행 후 그대로 동작한다 → 실행과 배포 사이에 장애 구간이 없다.
-- 한 트랜잭션(begin~commit)이라 중간 오류 시 아무것도 반영되지 않는다. 여러 번 실행해도 안전하다.

begin;

-- 1) 신청: 지역 · 관심 서비스 · 방문 예약
alter table public.ic_leads add column if not exists region      text;
alter table public.ic_leads add column if not exists interests   text[] not null default '{}';
alter table public.ic_leads add column if not exists visit_at    timestamptz;
alter table public.ic_leads add column if not exists visit_place text;

-- 2) 허용 값 넓히기 — service_type: + card_points(카드포인트), general(여러 항목·잘 모름)
--                    claim_status: + visit_booked(방문 예약), visited(방문 점검 완료)
--    01에서 인라인 check로 만든 제약은 이름이 자동으로 붙으므로, 해당 칼럼을 검사하는 check 제약을 찾아 바꾼다.
do $$
declare c record;
begin
  for c in
    select conname, pg_get_constraintdef(oid) as def from pg_constraint
    where conrelid = 'public.ic_leads'::regclass and contype = 'c'
      and conname not in ('ic_leads_service_type_check_v3', 'ic_leads_claim_status_check_v3')
  loop
    if c.def ~ '^CHECK \(\(service_type = ANY' or c.def ~ '^CHECK \(\(claim_status = ANY' then
      execute format('alter table public.ic_leads drop constraint %I', c.conname);
    end if;
  end loop;
end $$;

do $$
declare c record;
begin
  for c in
    select * from (values
      ('ic_leads_service_type_check_v3',
       $c$check (service_type in ('unclaimed','hidden','refund','card_points','general'))$c$),
      ('ic_leads_claim_status_check_v3',
       $c$check (claim_status in ('new','contacting','visit_booked','visited','guided','docs_pending','closed','unreachable'))$c$),
      ('ic_leads_region_check',
       $c$check (region is null or region in ('seoul','gyeonggi','incheon','other'))$c$),
      ('ic_leads_interests_check',
       $c$check (interests <@ array['card_points','unclaimed','hidden','not_sure']::text[] and cardinality(interests) <= 4)$c$),
      ('ic_leads_visit_place_len',
       $c$check (visit_place is null or char_length(visit_place) <= 100)$c$),
      -- 파기(익명화) 완료 행에는 방문 일정·장소도 남아 있으면 안 된다 (기존 ic_leads_deleted_is_scrubbed와 짝)
      ('ic_leads_deleted_visit_scrubbed',
       $c$check (name <> '(삭제됨)' or (visit_at is null and visit_place is null))$c$)
    ) as t(name, def)
  loop
    if not exists (select 1 from pg_constraint where conname = c.name and conrelid = 'public.ic_leads'::regclass) then
      execute format('alter table public.ic_leads add constraint %I %s', c.name, c.def);
    end if;
  end loop;
end $$;

create index if not exists ic_leads_visit_idx on public.ic_leads (visit_at) where visit_at is not null;

-- 3) 상담 이력 (전화·문자·방문·메모). 직원만 서버에서 기록한다.
create table if not exists public.ic_lead_activities (
  id        uuid primary key default gen_random_uuid(),
  lead_id   uuid not null references public.ic_leads(id),
  at        timestamptz not null default now(),
  actor     text not null,
  kind      text not null check (kind in ('call','sms','visit','memo')),
  content   text not null check (char_length(content) between 1 and 1000)
);
create index if not exists ic_lead_activities_lead_idx on public.ic_lead_activities (lead_id, at desc);

alter table public.ic_lead_activities enable row level security;
-- 정책 없음 = anon/authenticated 거부 (⚠️ using(true) 정책 추가 금지)
revoke all on public.ic_lead_activities from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke all on public.ic_lead_activities from service_role;
    -- 수정 권한 없음(이력은 고치지 않는다). 삭제는 파기(보유기간 경과·삭제 요청 완료) 때만 앱이 쓴다.
    grant select, insert, delete on public.ic_lead_activities to service_role;
  else
    raise notice 'service_role 역할이 없어 서버 권한 부여를 건너뜀 (Supabase가 아닌 DB)';
  end if;
end $$;

commit;

-- 실행 후 확인 (읽기 전용) — 모두 기대값이면 통과
-- select count(*) = 4 as cols_ok from information_schema.columns
--   where table_schema='public' and table_name='ic_leads' and column_name in ('region','interests','visit_at','visit_place');
-- select relrowsecurity as rls_on from pg_class where oid = 'public.ic_lead_activities'::regclass;      -- true
-- select count(*) = 0 as no_policies from pg_policies where tablename = 'ic_lead_activities';           -- true
-- select has_table_privilege('anon', 'public.ic_lead_activities', 'select') as anon_select;              -- false
-- select has_table_privilege('service_role', 'public.ic_lead_activities', 'update') as server_update;   -- false
-- select conname from pg_constraint where conrelid='public.ic_leads'::regclass and conname like '%_v3'; -- 2행
