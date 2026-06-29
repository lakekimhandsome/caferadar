-- CafeRadar: 관리자 삭제 권한
-- Supabase Dashboard → SQL Editor에서 실행하세요.
--
-- 관리자 이메일 등록 (여러 명 가능, 아래 이메일을 본인 것으로 교체):
--   insert into public.admin_emails (email) values
--     ('admin1@example.com'),
--     ('admin2@example.com')
--   on conflict (email) do nothing;
--
-- 관리자 해제:
--   delete from public.admin_emails where email = 'admin1@example.com';
--
-- ※ 해당 이메일로 회원가입·로그인한 계정만 관리자 권한이 적용됩니다.

-- ─────────────────────────────────────────
-- 1. profiles.is_admin (레거시·수동 지정용)
-- ─────────────────────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ─────────────────────────────────────────
-- 2. admin_emails — 관리자 이메일 목록
-- ─────────────────────────────────────────
create table if not exists public.admin_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_emails enable row level security;
-- 정책 없음 → 일반 사용자는 목록 조회·수정 불가 (is_admin()만 참조)

-- ─────────────────────────────────────────
-- 3. is_admin() 헬퍼
-- ─────────────────────────────────────────
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

-- is_admin 임의 변경 방지
create or replace function public.protect_profile_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_admin is distinct from false then
      new.is_admin := false;
    end if;
    return new;
  end if;

  if new.is_admin is distinct from old.is_admin then
    if not public.is_admin() then
      new.is_admin := old.is_admin;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_is_admin on public.profiles;
create trigger protect_profile_is_admin
  before insert or update on public.profiles
  for each row execute function public.protect_profile_is_admin();

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id and is_admin = false);

-- ─────────────────────────────────────────
-- 3. 관리자 삭제 RLS (후기 · 구인글 · 구직글)
-- ─────────────────────────────────────────
drop policy if exists "reviews_delete_admin" on public.reviews;
create policy "reviews_delete_admin"
  on public.reviews for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "jobs_delete_admin" on public.jobs;
create policy "jobs_delete_admin"
  on public.jobs for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "job_seekers_delete_admin" on public.job_seekers;
create policy "job_seekers_delete_admin"
  on public.job_seekers for delete
  to authenticated
  using (public.is_admin());
