-- ============================================================
-- 가입 시 profiles 자동 생성 트리거
-- Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================
--
-- 문제: 지금은 클라이언트(AuthProvider)가 회원가입 직후 profiles 행을
--       직접 insert 하고, 이어서 select 로 다시 읽는다. 이메일 인증
--       (Confirm email)이 켜져 있으면 가입 직후 세션이 없어 RLS(auth.uid()=id)
--       때문에 select 가 막히고, 결과적으로 가입이 실패한 것처럼 보인다.
--
-- 해결: auth.users 에 유저가 생기는 순간(=인증 메일 발송 시점) DB 레벨에서
--       SECURITY DEFINER 함수로 profiles 를 자동 생성한다. RLS·세션과
--       무관하게 항상 프로필이 만들어지므로 가입 흐름이 깨지지 않는다.
--
-- 클라이언트의 기존 insert 는 그대로 둬도 된다(중복은 on conflict 로 무시).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 이미 가입돼 있으나 profiles 행이 없는 유저 보정(선택):
-- insert into public.profiles (id, name, email, phone, role)
-- select u.id,
--        coalesce(u.raw_user_meta_data->>'name', ''),
--        u.email,
--        u.raw_user_meta_data->>'phone',
--        coalesce(u.raw_user_meta_data->>'role', 'user')
-- from auth.users u
-- left join public.profiles p on p.id = u.id
-- where p.id is null
-- on conflict (id) do nothing;
