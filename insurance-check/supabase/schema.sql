-- 내보험 통합 점검 — 운영 DB 스키마 (Supabase SQL Editor에서 수동 실행)
--
-- 접근 모델
--   * 모든 ic_* 테이블은 RLS ON + anon/authenticated 정책 "없음" = 브라우저(공개 키)에서 읽기·쓰기 불가.
--   * 서버(Next.js 라우트)만 service role 키로 접근한다. service role 키는 서버 환경변수에만 둔다.
--   * ⚠️ `using (true)` 같은 역할 제한 없는 정책을 추가하지 말 것 — anon 전체 공개 구멍이 된다.

create extension if not exists pgcrypto;

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
  claim_type         text not null check (claim_type in ('unclaimed','hidden','refund')),
  content            text not null check (char_length(content) between 10 and 500),
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
  constraint ic_reviews_payout_requires_payment check (status <> 'approved' or kind <> 'payout_case' or payment_confirmed)
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

-- 감사로그는 추가만 가능하도록 (service role이라도 실수로 수정·삭제하지 않게)
create or replace function public.ic_audit_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'ic_audit_logs is append-only';
end $$;
drop trigger if exists ic_audit_no_update on public.ic_audit_logs;
create trigger ic_audit_no_update before update or delete on public.ic_audit_logs
  for each row execute function public.ic_audit_immutable();

-- 검증 쿼리: 아래 결과가 0행이어야 한다 (ic_* 테이블에 anon/authenticated 정책이 없음)
-- select * from pg_policies where tablename like 'ic_%';

-- 최초 관리자 등록 (Auth에서 사용자 생성 후):
-- insert into public.ic_staff (user_id, name, role) values ('<auth.users.id>', '홍관리', 'admin');

-- 보유기간 경과 데이터 파기 예시 (운영 정책 확정 후 pg_cron 등으로 주기 실행):
-- update public.ic_leads set name='(삭제됨)', phone_masked='***-****-****', phone_enc='', phone_hash='', memo='', notes='',
--   privacy_status='completed', coverage_consent=false, coverage_status='withdrawn'
--   where created_at < now() - interval '1 year' and name <> '(삭제됨)';
