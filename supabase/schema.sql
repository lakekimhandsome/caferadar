-- CafeRadar Supabase Schema
-- Supabase Dashboard → SQL Editor에서 전체 실행

-- ─────────────────────────────────────────
-- 1. profiles — 회원 프로필
-- ─────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 누구나 닉네임 조회 가능
create policy "profiles_select_public"
  on public.profiles for select
  using (true);

-- 본인 프로필만 수정
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─────────────────────────────────────────
-- 2. reviews — 카페 근무 후기
-- ─────────────────────────────────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cafe_name text not null,
  region text not null,
  position text not null,
  wage text,
  period text not null,
  atmosphere text,
  pros text,
  cons text,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists reviews_created_at_idx on public.reviews (created_at desc);
create index if not exists reviews_user_id_idx on public.reviews (user_id);
create index if not exists reviews_region_idx on public.reviews (region);

alter table public.reviews enable row level security;

-- 누구나 후기 조회
create policy "reviews_select_public"
  on public.reviews for select
  using (true);

-- 로그인 회원만 본인 후기 작성
create policy "reviews_insert_authenticated"
  on public.reviews for insert
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 3. jobs — 구인글 (비회원 작성 가능)
-- ─────────────────────────────────────────
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  cafe_name text not null,
  region text not null,
  position text not null,
  wage text not null,
  work_time text not null,
  contact text not null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists jobs_created_at_idx on public.jobs (created_at desc);

alter table public.jobs enable row level security;

-- 누구나 구인글 조회
create policy "jobs_select_public"
  on public.jobs for select
  using (true);

-- 비회원(anon) 포함 누구나 구인글 작성
create policy "jobs_insert_public"
  on public.jobs for insert
  with check (true);

-- ─────────────────────────────────────────
-- 4. 회원가입 시 프로필 자동 생성 트리거
-- ─────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'nickname'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
