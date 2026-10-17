-- 운영 DB 점검 요약 — verify.sql의 ①~⑦·⑨를 쿼리 하나로 모은 것. 읽기 전용(아무것도 바꾸지 않음).
-- SQL Editor는 여러 쿼리를 한 번에 실행하면 마지막 결과만 보여 주므로, 이 파일은 결과 표 하나로 나온다.
-- 모든 행의 ok가 true면 통과 → 그 날짜를 APPROVAL_DB_VERIFIED에 적는다. false인 행은 detail을 확인.
-- "relation ... does not exist" 오류가 나면 supabase/schema.sql을 먼저 실행한다.
-- 항목별 원본 쿼리와 설명은 supabase/verify.sql.

with
tables as (
  select relname, relrowsecurity
  from pg_class
  where relnamespace = 'public'::regnamespace and relkind = 'r' and relname like 'ic_%'
),
policies as (
  select tablename || '.' || policyname as name from pg_policies where tablename like 'ic_%'
),
public_grants as (
  select grantee || ':' || table_name || ':' || privilege_type as name
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name like 'ic_%' and grantee in ('anon', 'authenticated')
),
server_grants as (
  select table_name, string_agg(privilege_type, ', ' order by privilege_type) as privileges
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name like 'ic_%' and grantee = 'service_role'
  group by table_name
),
expected_grants(table_name, privileges) as (
  values ('ic_audit_logs', 'INSERT, SELECT'), ('ic_events', 'INSERT, SELECT'), ('ic_leads', 'INSERT, SELECT, UPDATE'),
         ('ic_privacy_requests', 'INSERT, SELECT, UPDATE'), ('ic_reviews', 'DELETE, INSERT, SELECT, UPDATE'), ('ic_staff', 'SELECT')
),
grant_diff as (
  select coalesce(e.table_name, s.table_name) || ' (기대: ' || coalesce(e.privileges, '없음') || ' / 실제: ' || coalesce(s.privileges, '없음') || ')' as name
  from expected_grants e full join server_grants s on s.table_name = e.table_name
  where e.privileges is distinct from s.privileges
),
triggers as (
  select tgname from pg_trigger where tgrelid = to_regclass('public.ic_audit_logs') and not tgisinternal
),
missing_constraints as (
  select t.name
  from (values
    ('ic_leads_coverage_requires_consent'), ('ic_leads_coverage_consent_record'), ('ic_leads_coverage_consent_status'),
    ('ic_leads_delete_request_no_contact'), ('ic_leads_deleted_is_scrubbed'),
    ('ic_privacy_handled_record'), ('ic_privacy_delete_completed_scrubbed'),
    ('ic_reviews_amount_requires_payment'), ('ic_reviews_approved_requires_consent'), ('ic_reviews_payout_requires_payment'),
    ('ic_reviews_image_requires_masking'), ('ic_reviews_has_content'), ('ic_reviews_consent_has_time'),
    ('ic_reviews_approved_has_reviewer'), ('ic_reviews_image_fields_paired'), ('ic_reviews_approved_image_present')
  ) as t(name)
  where not exists (select 1 from pg_constraint c where c.conname = t.name)
),
audit_fn as (
  select to_regprocedure('public.ic_audit_immutable()') is not null as present
)
select '①' as no, '6개 테이블 RLS 켜짐' as check_name,
       (select count(*) = 6 and bool_and(relrowsecurity) from tables) as ok,
       (select count(*) || '개 테이블, RLS 꺼짐: ' || coalesce(string_agg(relname::text, ', ') filter (where not relrowsecurity), '없음') from tables) as detail
union all
select '②', 'ic_* 테이블에 정책 없음',
       not exists (select 1 from policies),
       coalesce((select string_agg(name, ', ') from policies), '없음')
union all
select '③', '공개 역할(anon·authenticated) 테이블 권한 없음',
       not exists (select 1 from public_grants),
       coalesce((select string_agg(name, ', ') from public_grants), '없음')
union all
select '④', '서버(service_role) 권한이 필요한 것만',
       not exists (select 1 from grant_diff),
       coalesce((select string_agg(name, '; ') from grant_diff), '기대와 같음')
union all
select '⑤', '감사로그 보호 트리거 2개',
       (select count(*) filter (where tgname in ('ic_audit_no_truncate', 'ic_audit_no_update')) = 2 from triggers),
       coalesce((select string_agg(tgname::text, ', ' order by tgname) from triggers), '없음')
union all
select '⑥', '필수 정합성 규칙 16개',
       not exists (select 1 from missing_constraints),
       coalesce('빠짐: ' || (select string_agg(name, ', ') from missing_constraints), '모두 있음')
union all
select '⑦', '공개 역할이 감사로그 함수 실행 불가',
       case when (select present from audit_fn)
            then not has_function_privilege('anon', 'public.ic_audit_immutable()', 'execute')
             and not has_function_privilege('authenticated', 'public.ic_audit_immutable()', 'execute')
            else false end,
       case when (select present from audit_fn) then 'anon·authenticated 실행 권한 확인' else '함수 없음 — schema.sql 실행 필요' end
union all
select '⑨', '활성 관리자 1명 이상 (ic_staff)',
       (select count(*) > 0 from public.ic_staff where role = 'admin' and active),
       (select count(*) filter (where role = 'admin' and active) || '명 (전체 직원 ' || count(*) || '명)' from public.ic_staff)
order by 1;
