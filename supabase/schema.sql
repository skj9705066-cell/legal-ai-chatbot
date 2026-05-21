-- ============================================================
-- 법률AI Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ─── Tables ────────────────────────────────────────────────

-- 사용자 프로필
create table profiles (
  id uuid references auth.users primary key,
  name text,
  email text,
  phone text,
  role text default 'user' check (role in ('user', 'lawyer', 'admin')),
  created_at timestamptz default now()
);

-- 변호사 정보
create table lawyers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  name text not null,
  firm text,
  specialty text[] default '{}',
  experience_years int,
  rating decimal(2,1) default 0,
  review_count int default 0,
  bar_number text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  bio text,
  created_at timestamptz default now()
);

-- 상담
create table consultations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  category text,
  title text,
  messages jsonb default '[]',
  analysis_complete boolean default false,
  analysis_summary jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 매칭
create table matchings (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid references consultations(id),
  user_id uuid references profiles(id),
  status text default 'matching' check (status in ('matching', 'matched', 'cancelled')),
  created_at timestamptz default now()
);

-- 변호사 제안
create table proposals (
  id uuid primary key default gen_random_uuid(),
  matching_id uuid references matchings(id),
  lawyer_id uuid references lawyers(id),
  fee text,
  message text,
  selected boolean default false,
  created_at timestamptz default now()
);

-- ─── Row Level Security ────────────────────────────────────

alter table profiles enable row level security;
alter table lawyers enable row level security;
alter table consultations enable row level security;
alter table matchings enable row level security;
alter table proposals enable row level security;

-- profiles: 본인만 읽기/수정, 관리자는 전체
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Anyone can insert profile" on profiles for insert with check (true);

-- lawyers: 승인된 변호사는 모두 볼 수 있음
create policy "Anyone can view approved lawyers" on lawyers for select using (status = 'approved');
create policy "Lawyers can insert own" on lawyers for insert with check (true);
create policy "Lawyers can update own" on lawyers for update using (user_id = auth.uid());

-- consultations: 본인 상담만
create policy "Users can view own consultations" on consultations for select using (user_id = auth.uid());
create policy "Users can insert consultations" on consultations for insert with check (true);
create policy "Users can update own consultations" on consultations for update using (user_id = auth.uid());

-- 전체 공개 읽기가 필요한 경우 (관리자용)
create policy "Service role full access profiles" on profiles for all using (true);
create policy "Service role full access lawyers" on lawyers for all using (true);
create policy "Service role full access consultations" on consultations for all using (true);


-- ============================================================
-- ADMIN ROLE POLICIES — added for admin dashboard with anon key
-- ============================================================
-- The "Service role full access" policies above use `using (true)`
-- which actually applies to ALL authenticated users (not just service-role).
-- That is too permissive in production. We add explicit admin-only
-- policies via a SECURITY DEFINER helper so the admin dashboard
-- (running with the browser anon key) can read/update everything
-- ONLY when the logged-in user has role='admin'.
--
-- Recommended for production: drop the three "Service role full access"
-- policies above and rely on these admin policies instead. Left in
-- place here so the codebase matches the original SQL spec.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles: admin can read/update everyone
create policy "Admins can view all profiles" on profiles for select using (public.is_admin());
create policy "Admins can update all profiles" on profiles for update using (public.is_admin());

-- lawyers: admin can read/update/delete all
create policy "Admins can view all lawyers" on lawyers for select using (public.is_admin());
create policy "Admins can update all lawyers" on lawyers for update using (public.is_admin());
create policy "Admins can delete lawyers" on lawyers for delete using (public.is_admin());

-- consultations: admin can read all
create policy "Admins can view all consultations" on consultations for select using (public.is_admin());

-- matchings: anyone authenticated can insert their own; user/admin can read theirs
create policy "Users can view own matchings" on matchings for select using (user_id = auth.uid());
create policy "Users can insert matchings" on matchings for insert with check (true);
create policy "Admins can view all matchings" on matchings for select using (public.is_admin());

-- proposals: lawyer creates, user/admin reads
create policy "Lawyers can insert proposals" on proposals for insert with check (true);
create policy "Users can view proposals on own matching" on proposals for select using (
  exists (
    select 1 from matchings m
    where m.id = proposals.matching_id and m.user_id = auth.uid()
  )
);
create policy "Admins can view all proposals" on proposals for select using (public.is_admin());


-- ============================================================
-- BOOTSTRAP YOUR FIRST ADMIN
-- ============================================================
-- 1. Sign up a regular user through the app (/signup)
-- 2. Find your user id: select id, email from auth.users where email = 'YOUR_EMAIL';
-- 3. Promote to admin:
--    update profiles set role = 'admin' where email = 'YOUR_EMAIL';
