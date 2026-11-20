-- 03 방문 점검 마이그레이션 — 실행 "전후" 점검 (읽기 전용: 아무것도 바꾸지 않는다)
--
-- 사용법 (Supabase → SQL Editor)
--   1) 03-visit-checkup.sql을 실행하기 "전에" 이 파일 전체를 실행 → 결과 표를 캡처하거나 복사해 둔다.
--   2) 03-visit-checkup.sql 실행.
--   3) 이 파일을 "다시" 실행 → 1)과 비교한다.
--      · 'leads_fingerprint'(기존 신청 내용 지문)와 각 테이블 행 수가 1)과 같아야 한다 = 기존 데이터가 한 글자도 바뀌지 않았다.
--      · 'leads_fingerprint'는 새 칼럼(region·interests·visit_at·visit_place)을 빼고 계산하므로 전후 값이 같아야 정상이다.
--   판정(verdict) 칸: ok / info(참고) / STOP(멈추고 개발자에게 결과 전달)
--
-- 여기서는 이름·연락처 등 개인정보 값을 출력하지 않는다(행 수·값 종류·지문만).

with
lead_cols as (
  select string_agg(column_name, ',' order by column_name) as cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'ic_leads' and column_name in ('region', 'interests', 'visit_at', 'visit_place')
),
type_status_checks as (
  select conname, pg_get_constraintdef(oid) as def
  from pg_constraint
  where conrelid = 'public.ic_leads'::regclass and contype = 'c'
    and (pg_get_constraintdef(oid) like '%service_type%' or pg_get_constraintdef(oid) like '%claim_status%')
),
-- 03이 지우고 다시 만드는 제약은 "service_type = ANY(...)" 또는 "claim_status = ANY(...)" 하나만 들어 있는 것이어야 한다.
-- 다른 조건(AND·OR·다른 칼럼)이 섞인 제약이 있으면 03이 그 조건까지 지울 수 있으므로 STOP.
unexpected_checks as (
  select conname from type_status_checks
  where conname not like '%_v3'
    and not (def ~ '^CHECK \(\((service_type|claim_status) = ANY \(ARRAY\[[^]]*\]\)\)\)$')
)
select '01' as no, 'ic_leads 행 수' as item, (select count(*)::text from public.ic_leads) as value, 'info' as verdict
union all
select '02', 'ic_staff 행 수 (관리자·상담사 계정)', (select count(*)::text from public.ic_staff), 'info'
union all
select '03', '활성 관리자 수', (select count(*)::text from public.ic_staff where role = 'admin' and active),
       case when (select count(*) from public.ic_staff where role = 'admin' and active) > 0 then 'ok' else 'STOP' end
union all
select '04', 'ic_audit_logs 행 수', (select count(*)::text from public.ic_audit_logs), 'info'
union all
select '05', 'ic_privacy_requests 행 수', (select count(*)::text from public.ic_privacy_requests), 'info'
union all
select '06', 'ic_reviews 행 수', (select count(*)::text from public.ic_reviews), 'info'
union all
select '07', 'ic_events 행 수', (select count(*)::text from public.ic_events), 'info'
union all
select '08', 'leads_fingerprint (기존 신청 내용 지문 — 전후 같아야 함)',
       (select md5(coalesce(string_agg((to_jsonb(l) - 'region' - 'interests' - 'visit_at' - 'visit_place')::text, '|' order by l.id), ''))
          from public.ic_leads l),
       'info'
union all
select '09', '현재 쓰는 점검 유형 값', (select coalesce(string_agg(distinct service_type, ', '), '-') from public.ic_leads),
       case when exists (select 1 from public.ic_leads where service_type not in ('unclaimed','hidden','refund','card_points','general')) then 'STOP' else 'ok' end
union all
select '10', '현재 쓰는 진행 상태 값', (select coalesce(string_agg(distinct claim_status, ', '), '-') from public.ic_leads),
       case when exists (select 1 from public.ic_leads where claim_status not in ('new','contacting','visit_booked','visited','guided','docs_pending','closed','unreachable')) then 'STOP' else 'ok' end
union all
select '11', '유형·상태 검사 제약 (03이 바꾸는 대상)',
       coalesce((select string_agg(conname, ', ' order by conname) from type_status_checks), '없음'),
       'info'
union all
select '12', '예상과 다른 형태의 유형·상태 제약',
       coalesce((select string_agg(conname, ', ') from unexpected_checks), '없음'),
       case when exists (select 1 from unexpected_checks) then 'STOP' else 'ok' end
union all
select '13', '03 새 칼럼 (전: 없음 / 후: interests,region,visit_at,visit_place)', coalesce((select cols from lead_cols), '없음'), 'info'
union all
select '14', '상담 이력 테이블 ic_lead_activities (전: 없음 / 후: 있음)',
       case when to_regclass('public.ic_lead_activities') is null then '없음' else '있음' end, 'info'
union all
select '15', 'ic_* 테이블의 RLS 정책 수 (항상 0이어야 함)', (select count(*)::text from pg_policies where tablename like 'ic_%'),
       case when exists (select 1 from pg_policies where tablename like 'ic_%') then 'STOP' else 'ok' end
union all
select '16', 'RLS가 꺼진 ic_* 테이블',
       coalesce((select string_agg(relname::text, ', ') from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname like 'ic_%' and not relrowsecurity), '없음'),
       case when exists (select 1 from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relname like 'ic_%' and not relrowsecurity) then 'STOP' else 'ok' end
order by 1;
