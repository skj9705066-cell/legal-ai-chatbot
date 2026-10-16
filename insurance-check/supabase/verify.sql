-- 운영 DB 점검 쿼리 — 읽기 전용(아무것도 바꾸지 않음). supabase/schema.sql 실행 후 SQL Editor에서 실행.
-- 각 쿼리 위의 '기대 결과'와 다르면 운영 전환하지 말 것.

-- ① 6개 테이블 모두 RLS 켜짐 → 6행, rls_on 전부 true
select relname as table_name, relrowsecurity as rls_on
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r' and relname like 'ic_%'
order by 1;

-- ② ic_* 테이블에 정책 없음 → 0행 (정책이 없어야 공개 키로 접근 불가)
select schemaname, tablename, policyname, roles, cmd from pg_policies where tablename like 'ic_%';

-- ③ 공개 역할(anon, authenticated)에 테이블 권한 없음 → 0행
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name like 'ic_%' and grantee in ('anon', 'authenticated');

-- ④ 서버(service_role) 권한은 필요한 것만 → 아래 조합만 나와야 한다
--    ic_audit_logs: INSERT, SELECT / ic_events: INSERT, SELECT / ic_leads: INSERT, SELECT, UPDATE
--    ic_privacy_requests: INSERT, SELECT, UPDATE / ic_reviews: DELETE, INSERT, SELECT, UPDATE / ic_staff: SELECT
select table_name, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and table_name like 'ic_%' and grantee = 'service_role'
group by table_name order by table_name;

-- ⑤ 감사로그 보호 트리거 2개 → ic_audit_no_truncate, ic_audit_no_update
select tgname from pg_trigger where tgrelid = 'public.ic_audit_logs'::regclass and not tgisinternal order by 1;

-- ⑥ 필수 정합성 규칙이 모두 있는지 → 0행 (나오는 이름이 있으면 그 규칙이 빠진 것)
select t.name as missing_constraint
from (values
  ('ic_leads_coverage_requires_consent'), ('ic_leads_coverage_consent_record'), ('ic_leads_coverage_consent_status'),
  ('ic_leads_delete_request_no_contact'), ('ic_leads_deleted_is_scrubbed'),
  ('ic_privacy_handled_record'), ('ic_privacy_delete_completed_scrubbed'),
  ('ic_reviews_amount_requires_payment'), ('ic_reviews_approved_requires_consent'), ('ic_reviews_payout_requires_payment'),
  ('ic_reviews_image_requires_masking'), ('ic_reviews_has_content'), ('ic_reviews_consent_has_time'),
  ('ic_reviews_approved_has_reviewer'), ('ic_reviews_image_fields_paired'), ('ic_reviews_approved_image_present')
) as t(name)
where not exists (select 1 from pg_constraint c where c.conname = t.name);

-- ⑦ 공개 역할이 감사로그 함수를 실행할 수 없음 → anon_exec, auth_exec 모두 false
select has_function_privilege('anon', 'public.ic_audit_immutable()', 'execute') as anon_exec,
       has_function_privilege('authenticated', 'public.ic_audit_immutable()', 'execute') as auth_exec;

-- ⑧ (참고) 자동 RLS 이벤트 트리거가 있는지 — 있어도 없어도 이 스키마와 충돌하지 않음
select evtname, evtevent, evtenabled from pg_event_trigger order by 1;

-- ⑨ 관리자 계정 (최초 관리자 등록 후) → 1행 이상, active = true
select user_id, name, role, active from public.ic_staff;
