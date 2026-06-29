-- CafeRadar: 관리자 이메일 목록 (migration_admin.sql 실행 후 추가 적용)
-- 이미 migration_admin.sql을 실행했다면 이 파일만 실행해도 됩니다.

create table if not exists public.admin_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_emails enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  )
  or exists (
    select 1
    from auth.users u
    inner join public.admin_emails ae
      on lower(trim(u.email)) = lower(trim(ae.email))
    where u.id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 관리자 이메일 등록 예시 (본인 이메일로 교체 후 실행)
-- insert into public.admin_emails (email) values
--   ('admin1@example.com'),
--   ('admin2@example.com')
-- on conflict (email) do nothing;
