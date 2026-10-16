-- 내보험 통합 점검 — 운영 DB 스키마 (Supabase SQL Editor에서 수동 실행)
--
-- 접근 모델
--   * 모든 ic_* 테이블은 RLS ON + anon/authenticated 정책 "없음" = 브라우저(공개 키)에서 읽기·쓰기 불가.
--   * 서버(Next.js 라우트)만 service role 키로 접근한다. service role 키는 서버 환경변수에만 둔다.
--   * service_role에는 앱이 실제로 쓰는 권한만 준다(감사로그는 추가·조회만, 신청은 삭제 불가 — 파기는 익명화).
--   * ⚠️ `using (true)` 같은 역할 제한 없는 정책을 추가하지 말 것 — anon 전체 공개 구멍이 된다.
--
-- 실행
--   * 파일 전체를 한 번에 실행한다(begin~commit 한 트랜잭션 — 중간에 오류가 나면 아무것도 반영되지 않음).
--   * 여러 번 실행해도 안전하다(이미 있으면 건너뜀). 테이블·데이터를 지우는 명령은 없다.
--   * Supabase의 'Enable automatic RLS'·'Automatically expose new tables' 설정이 켜져 있든 꺼져 있든
--     같은 결과가 되도록 RLS와 권한을 이 파일에서 명시적으로 지정한다.
--   * gen_random_uuid()는 PostgreSQL 13+ 기본 함수라 pgcrypto 확장이 필요 없다.

begin;

-- 관리자/상담사 (Supabase Auth 사용자와 1:1)
create table if not exists public.ic_staff (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  role        text not null check (role in ('admin','counselor','viewer')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.ic_leads (
  id                        uuid primary key default gen_random_uuid(),
  ref_no                    text not null unique,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  service_type              text not null check (service_type in ('unclaimed','hidden','refund')),
  name                      text not null,
  phone_masked              text not null,
  phone_enc                 text not null,          -- AES-256-GCM (앱 레벨 암호화, 키는 서버 환경변수)
  phone_hash                text not null,          -- HMAC-SHA256 (중복 감지·철회 매칭용)
  preferred_time            text not null,
  memo                      text not null default '' check (char_length(memo) <= 300),
  utm_source                text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  referrer                  text,
  landing_path              text,
  claim_status              text not null default 'new'
                            check (claim_status in ('new','contacting','guided','docs_pending','closed','unreachable')),
  marketing_consent         boolean not null default false,
  third_party_consent       boolean not null default false,  -- 제3자 제공이 설정된 경우에만 받는 별도 동의
  privacy_consent_version   text not null,
  coverage_consent          boolean not null default false,
  coverage_consent_at       timestamptz,
  coverage_consent_version  text,
  coverage_contact_method   text check (coverage_contact_method in ('phone','sms_then_phone')),
  coverage_status           text not null default 'not_consented'
                            check (coverage_status in ('not_consented','pending','contacting','booked','consulted','contracted','declined','withdrawn')),
  next_contact_at           timestamptz,
  assignee                  text,
  notes                     text not null default '' check (char_length(notes) <= 2000),
  privacy_status            text not null default 'none'
                            check (privacy_status in ('none','withdraw_requested','delete_requested','processing','completed')),
  duplicate_of              text,
  is_test                   boolean not null default false,  -- 내부 테스트 신청(운영 지표 제외)
  -- 핵심 규칙을 DB에서도 강제: 별도 동의 없이 영업 상태로 갈 수 없다.
  constraint ic_leads_coverage_requires_consent check (
    coverage_status in ('not_consented','withdrawn') or coverage_consent = true
  )
);
-- 기존 DB 업그레이드용 (이미 테이블이 있으면 위 create table은 건너뛴다)
alter table public.ic_leads add column if not exists is_test boolean not null default false;
alter table public.ic_leads add column if not exists third_party_consent boolean not null default false;
create index if not exists ic_leads_created_idx on public.ic_leads (created_at desc);
create index if not exists ic_leads_phone_hash_idx on public.ic_leads (phone_hash);
create index if not exists ic_leads_coverage_idx on public.ic_leads (coverage_consent, coverage_status);

create table if not exists public.ic_audit_logs (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  actor   text not null,
  role    text not null,
  action  text not null,
  target  text,
  detail  text not null default ''
);
create index if not exists ic_audit_target_idx on public.ic_audit_logs (target, at desc);

-- 익명 퍼널 이벤트 (개인정보 없음)
create table if not exists public.ic_events (
  id            bigint generated always as identity primary key,
  name          text not null,
  at            timestamptz not null default now(),
  session_id    text not null,
  utm_source    text, utm_medium text, utm_campaign text,
  service_type  text
);
create index if not exists ic_events_at_idx on public.ic_events (at desc);

create table if not exists public.ic_privacy_requests (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  type              text not null check (type in ('withdraw_marketing','withdraw_coverage','delete_all')),
  name              text not null,
  phone_masked      text not null,
  phone_hash        text not null,
  matched_lead_ids  uuid[] not null default '{}',
  status            text not null check (status in ('received','processing','completed','rejected')),
  handled_by        text,
  handled_at        timestamptz,
  note              text not null default ''
);

-- 고객 후기·지급 사례. 실명·연락처는 저장하지 않는다(표시명은 익명 처리된 값만).
create table if not exists public.ic_reviews (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  created_by         text not null,
  kind               text not null check (kind in ('review','payout_case')),
  display_name       text not null check (char_length(display_name) between 2 and 20),
  category           text not null check (category in ('medical_claim','maturity_dormant','history_lookup','claim_guidance','coverage_consult')),
  content            text not null default '' check (char_length(content) <= 1000),  -- 메시지 원문(줄바꿈 = 말풍선)
  has_image          boolean not null default false,
  image_mime         text check (image_mime in ('image/jpeg','image/png','image/webp')),
  image_base64       text check (char_length(image_base64) <= 2100000),            -- 개인정보를 가린 캡처(≈1.5MB)
  pii_masked         boolean not null default false,                                -- 프로필 사진·전화번호·실명 가림 확인
  payment_confirmed  boolean not null default false,
  verified_amount    bigint check (verified_amount is null or verified_amount > 0),
  use_consent        boolean not null default false,
  use_consent_at     timestamptz,
  status             text not null default 'pending' check (status in ('pending','approved','rejected','hidden')),
  reviewed_by        text,
  reviewed_at        timestamptz,
  -- 공개 규칙을 DB에서도 강제
  constraint ic_reviews_amount_requires_payment check (verified_amount is null or payment_confirmed),
  constraint ic_reviews_approved_requires_consent check (status <> 'approved' or use_consent),
  constraint ic_reviews_payout_requires_payment check (status <> 'approved' or kind <> 'payout_case' or payment_confirmed),
  constraint ic_reviews_image_requires_masking check (status <> 'approved' or not has_image or pii_masked),
  constraint ic_reviews_has_content check (has_image or char_length(content) >= 10)
);
create index if not exists ic_reviews_status_idx on public.ic_reviews (status, reviewed_at desc);

alter table public.ic_staff            enable row level security;
alter table public.ic_leads            enable row level security;
alter table public.ic_audit_logs       enable row level security;
alter table public.ic_events           enable row level security;
alter table public.ic_privacy_requests enable row level security;
alter table public.ic_reviews          enable row level security;

-- 정책 없음 = anon/authenticated 거부. 혹시 남아 있는 공개 권한도 회수.
revoke all on public.ic_staff, public.ic_leads, public.ic_audit_logs, public.ic_events, public.ic_privacy_requests, public.ic_reviews from anon, authenticated;

-- service_role(서버)에는 앱이 쓰는 권한만 준다.
-- 'Automatically expose new tables'가 꺼진 프로젝트에서는 기본 권한이 없어 서버가 막히므로 명시적으로 부여한다.
--   신청·개인정보 요청: 삭제 권한 없음(파기는 익명화 update) / 감사로그·이벤트: 추가·조회만 / 직원: 조회만(등록은 SQL Editor에서)
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke all on public.ic_staff, public.ic_leads, public.ic_audit_logs, public.ic_events, public.ic_privacy_requests, public.ic_reviews from service_role;
    grant select                         on public.ic_staff            to service_role;
    grant select, insert, update         on public.ic_leads            to service_role;
    grant select, insert, update         on public.ic_privacy_requests to service_role;
    grant select, insert, update, delete on public.ic_reviews          to service_role;
    grant select, insert                 on public.ic_events           to service_role;
    grant select, insert                 on public.ic_audit_logs       to service_role;
  else
    raise notice 'service_role 역할이 없어 서버 권한 부여를 건너뜀 (Supabase가 아닌 DB)';
  end if;
end $$;

-- 자동 번호(identity 시퀀스)에도 공개 역할 권한을 남기지 않는다
do $$
declare s text;
begin
  foreach s in array array[pg_get_serial_sequence('public.ic_audit_logs', 'id'), pg_get_serial_sequence('public.ic_events', 'id')] loop
    execute format('revoke all on sequence %s from anon, authenticated', s);
  end loop;
end $$;

-- 감사로그는 추가만 가능하도록 (service role이라도 실수로 수정·삭제·비우기 하지 않게)
create or replace function public.ic_audit_immutable() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'ic_audit_logs is append-only';
end $$;
revoke execute on function public.ic_audit_immutable() from public, anon, authenticated;
drop trigger if exists ic_audit_no_update on public.ic_audit_logs;  -- 이 파일이 만드는 트리거를 다시 만들기 위함(데이터 무관)
create trigger ic_audit_no_update before update or delete on public.ic_audit_logs
  for each row execute function public.ic_audit_immutable();
-- 행 단위 트리거는 TRUNCATE(전체 비우기)를 막지 못하므로 문장 단위 트리거를 따로 둔다
drop trigger if exists ic_audit_no_truncate on public.ic_audit_logs;
create trigger ic_audit_no_truncate before truncate on public.ic_audit_logs
  for each statement execute function public.ic_audit_immutable();

-- 데이터 정합성 규칙 — 앱이 이미 지키는 규칙을 DB에서도 강제한다. 이미 있으면 건너뜀.
do $$
declare c record;
begin
  for c in
    select * from (values
      -- 보장 분석: 동의했다면 동의 시각·문구 버전·연락 방법이 반드시 있어야 한다
      ('ic_leads', 'ic_leads_coverage_consent_record',
       $c$check (not coverage_consent or (coverage_consent_at is not null and coverage_consent_version is not null and coverage_contact_method is not null))$c$),
      -- 보장 분석: 동의 중이면 영업 진행 상태여야 한다(반대 방향은 위의 ic_leads_coverage_requires_consent)
      ('ic_leads', 'ic_leads_coverage_consent_status',
       $c$check (not coverage_consent or coverage_status not in ('not_consented', 'withdrawn'))$c$),
      -- 삭제 요청·처리 중인 고객은 광고·보장 분석 연락 대상에서 제외된 상태여야 한다
      ('ic_leads', 'ic_leads_delete_request_no_contact',
       $c$check (privacy_status not in ('delete_requested', 'processing') or (not marketing_consent and not coverage_consent))$c$),
      -- 파기(익명화) 완료 행에는 연락처·메모·동의가 남아 있으면 안 된다
      ('ic_leads', 'ic_leads_deleted_is_scrubbed',
       $c$check (name <> '(삭제됨)' or (phone_enc = '' and phone_hash = '' and memo = '' and notes = '' and not marketing_consent and not coverage_consent and privacy_status = 'completed'))$c$),
      -- 처리 완료·반려된 개인정보 요청에는 처리자와 처리 시각이 있어야 한다
      ('ic_privacy_requests', 'ic_privacy_handled_record',
       $c$check (status not in ('completed', 'rejected') or (handled_by is not null and handled_at is not null))$c$),
      -- 삭제 요청이 완료되면 요청 기록의 이름·연락처 해시도 지운다
      ('ic_privacy_requests', 'ic_privacy_delete_completed_scrubbed',
       $c$check (type <> 'delete_all' or status <> 'completed' or (name = '(삭제됨)' and phone_hash = ''))$c$),
      -- 후기: 게시 동의에는 동의 시각이 있어야 한다
      ('ic_reviews', 'ic_reviews_consent_has_time',
       $c$check (not use_consent or use_consent_at is not null)$c$),
      -- 후기: 공개(승인)에는 승인자와 승인 시각이 있어야 한다
      ('ic_reviews', 'ic_reviews_approved_has_reviewer',
       $c$check (status <> 'approved' or (reviewed_by is not null and reviewed_at is not null))$c$),
      -- 후기 이미지: 형식·본문은 함께 있거나 함께 없고, 이미지가 있으면 has_image가 켜져 있어야 한다
      ('ic_reviews', 'ic_reviews_image_fields_paired',
       $c$check ((image_base64 is null) = (image_mime is null) and (image_base64 is null or has_image))$c$),
      -- 후기: 이미지 후기는 이미지가 실제로 저장된 뒤에만 공개할 수 있다
      ('ic_reviews', 'ic_reviews_approved_image_present',
       $c$check (status <> 'approved' or not has_image or image_base64 is not null)$c$)
    ) as t(tbl, name, def)
  loop
    if not exists (select 1 from pg_constraint where conname = c.name and conrelid = format('public.%I', c.tbl)::regclass) then
      execute format('alter table public.%I add constraint %I %s', c.tbl, c.name, c.def);
    end if;
  end loop;
end $$;

commit;

-- 실행 후 점검: supabase/verify.sql (읽기 전용). 최소 확인 — 아래 결과가 0행이어야 한다(ic_* 테이블에 정책 없음)
-- select * from pg_policies where tablename like 'ic_%';

-- 최초 관리자 등록 (Auth에서 사용자 생성 후):
-- insert into public.ic_staff (user_id, name, role) values ('<auth.users.id>', '홍관리', 'admin');

-- 보유기간 경과 데이터 파기 예시 (운영 정책 확정 후 pg_cron 등으로 주기 실행). 위 정합성 규칙을 모두 만족하는 형태:
-- update public.ic_leads set name='(삭제됨)', phone_masked='***-****-****', phone_enc='', phone_hash='', memo='', notes='',
--   marketing_consent=false, coverage_consent=false, coverage_status='withdrawn', privacy_status='completed',
--   assignee=null, next_contact_at=null, updated_at=now()
--   where created_at < now() - interval '1 year' and name <> '(삭제됨)';
