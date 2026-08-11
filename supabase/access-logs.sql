-- ============================================================
-- 관리자 상담 열람 감사 로그 (개인정보 접속기록)
-- ============================================================
-- 실행 방법: Supabase 대시보드 → SQL Editor → 아래 전체 붙여넣고 Run.
-- (idempotent: 여러 번 실행해도 안전)
--
-- 목적: 관리자가 상담 원문(민감정보 포함)을 열람할 때 "누가·언제·무엇을"
--   보았는지 기록을 남긴다. 개인정보보호법 제29조 및 「개인정보의 안전성
--   확보조치 기준」상 접속기록 보관 의무 대응. (민감정보 처리 시 2년 보관 권장)

create table if not exists consultation_access_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id),
  admin_email text,
  consultation_id uuid,
  consultation_title text,
  category text,
  viewed_at timestamptz default now()
);

create index if not exists idx_access_logs_viewed_at
  on consultation_access_logs (viewed_at desc);

alter table consultation_access_logs enable row level security;

-- 관리자만 "자신의 id로" 열람 기록을 남길 수 있다(타인 명의 위조 방지).
drop policy if exists "Admins can insert access logs" on consultation_access_logs;
create policy "Admins can insert access logs"
on consultation_access_logs for insert
with check (public.is_admin() and admin_id = auth.uid());

-- 관리자는 전체 열람 기록을 조회할 수 있다.
drop policy if exists "Admins can view access logs" on consultation_access_logs;
create policy "Admins can view access logs"
on consultation_access_logs for select
using (public.is_admin());

-- update/delete 정책은 두지 않는다 → 로그를 사후에 수정·삭제할 수 없어
-- 감사 무결성이 보장된다. (보관 기간 경과분 정리는 service_role로만 수행)
