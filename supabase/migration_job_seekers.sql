-- CafeRadar 구직(job_seekers) 테이블 마이그레이션
-- Supabase Dashboard → SQL Editor에서 실행

-- ─────────────────────────────────────────
-- job_seekers — 구직글 (로그인 회원만 작성)
-- ─────────────────────────────────────────
create table if not exists public.job_seekers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  region text not null,
  position text not null,
  experience text,
  availability text not null,
  contact text not null,
  introduction text,
  created_at timestamptz not null default now()
);

create index if not exists job_seekers_created_at_idx on public.job_seekers (created_at desc);
create index if not exists job_seekers_user_id_idx on public.job_seekers (user_id);
create index if not exists job_seekers_region_idx on public.job_seekers (region);

alter table public.job_seekers enable row level security;

-- 누구나 구직글 조회
drop policy if exists "job_seekers_select_public" on public.job_seekers;
create policy "job_seekers_select_public"
  on public.job_seekers for select
  using (true);

-- 로그인 회원만 본인 명의로 작성
drop policy if exists "job_seekers_insert_authenticated" on public.job_seekers;
create policy "job_seekers_insert_authenticated"
  on public.job_seekers for insert
  with check (auth.uid() = user_id);

-- 본인 구직글만 수정
drop policy if exists "job_seekers_update_own" on public.job_seekers;
create policy "job_seekers_update_own"
  on public.job_seekers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 본인 구직글만 삭제
drop policy if exists "job_seekers_delete_own" on public.job_seekers;
create policy "job_seekers_delete_own"
  on public.job_seekers for delete
  using (auth.uid() = user_id);
