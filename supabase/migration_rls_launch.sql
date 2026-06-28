-- CafeRadar 런칭용 RLS 정책 통합 스크립트
-- Supabase Dashboard → SQL Editor에서 실행
-- 기존 정책을 안전하게 재생성합니다.

-- ═══════════════════════════════════════════
-- profiles
-- ═══════════════════════════════════════════
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ═══════════════════════════════════════════
-- reviews
-- ═══════════════════════════════════════════
alter table public.reviews enable row level security;

drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public"
  on public.reviews for select
  using (true);

drop policy if exists "reviews_insert_authenticated" on public.reviews;
create policy "reviews_insert_authenticated"
  on public.reviews for insert
  with check (auth.uid() = user_id);

drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own"
  on public.reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own"
  on public.reviews for delete
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- jobs (구인)
-- ═══════════════════════════════════════════
alter table public.jobs enable row level security;

drop policy if exists "jobs_select_public" on public.jobs;
create policy "jobs_select_public"
  on public.jobs for select
  using (true);

drop policy if exists "jobs_insert_authenticated" on public.jobs;
create policy "jobs_insert_authenticated"
  on public.jobs for insert
  with check (auth.uid() = user_id and user_id is not null);

drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own"
  on public.jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "jobs_delete_own" on public.jobs;
create policy "jobs_delete_own"
  on public.jobs for delete
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- job_seekers (구직) — migration_job_seekers.sql 실행 후 적용
-- ═══════════════════════════════════════════
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'job_seekers'
  ) then
    execute 'alter table public.job_seekers enable row level security';

    execute 'drop policy if exists "job_seekers_select_public" on public.job_seekers';
    execute 'create policy "job_seekers_select_public" on public.job_seekers for select using (true)';

    execute 'drop policy if exists "job_seekers_insert_authenticated" on public.job_seekers';
    execute 'create policy "job_seekers_insert_authenticated" on public.job_seekers for insert with check (auth.uid() = user_id)';

    execute 'drop policy if exists "job_seekers_update_own" on public.job_seekers';
    execute 'create policy "job_seekers_update_own" on public.job_seekers for update using (auth.uid() = user_id) with check (auth.uid() = user_id)';

    execute 'drop policy if exists "job_seekers_delete_own" on public.job_seekers';
    execute 'create policy "job_seekers_delete_own" on public.job_seekers for delete using (auth.uid() = user_id)';
  end if;
end $$;
