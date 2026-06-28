-- CafeRadar RLS(Row Level Security) 적용
-- Supabase Dashboard → SQL Editor에서 실행
--
-- 적용 대상: profiles, reviews, jobs
-- 비회원 구인글(create/update/delete)은 security definer RPC가 RLS를 우회하므로 기존 동작 유지

-- ═══════════════════════════════════════════════════════════════
-- 0. 사전 확인 (선택)
-- ═══════════════════════════════════════════════════════════════
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
--   and tablename in ('profiles', 'reviews', 'jobs');

-- ═══════════════════════════════════════════════════════════════
-- 1. profiles
--    - 누구나 조회
--    - 본인만 생성·수정 (생성은 트리거 handle_new_user가 주 경로, INSERT 정책은 보조)
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_public"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════
-- 2. reviews
--    - 누구나 조회
--    - 로그인 사용자만 작성 (user_id = auth.uid())
--    - 작성자만 수정·삭제
-- ═══════════════════════════════════════════════════════════════

alter table public.reviews enable row level security;

drop policy if exists "reviews_select_public" on public.reviews;
drop policy if exists "reviews_insert_authenticated" on public.reviews;
drop policy if exists "reviews_update_own" on public.reviews;
drop policy if exists "reviews_delete_own" on public.reviews;

create policy "reviews_select_public"
  on public.reviews
  for select
  to anon, authenticated
  using (true);

create policy "reviews_insert_authenticated"
  on public.reviews
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "reviews_update_own"
  on public.reviews
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "reviews_delete_own"
  on public.reviews
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. jobs
--    - 누구나 조회
--    - 로그인 작성자: 직접 INSERT (user_id = auth.uid())
--    - 비회원: create_guest_job RPC (security definer, RLS 우회)
--    - 로그인 작성자만 직접 UPDATE·DELETE
--    - 비회원 수정·삭제: update_guest_job / delete_guest_job RPC
-- ═══════════════════════════════════════════════════════════════

alter table public.jobs enable row level security;

drop policy if exists "jobs_select_public" on public.jobs;
drop policy if exists "jobs_insert_public" on public.jobs;
drop policy if exists "jobs_insert_authenticated" on public.jobs;
drop policy if exists "jobs_update_own" on public.jobs;
drop policy if exists "jobs_delete_own" on public.jobs;

create policy "jobs_select_public"
  on public.jobs
  for select
  to anon, authenticated
  using (true);

create policy "jobs_insert_authenticated"
  on public.jobs
  for insert
  to authenticated
  with check (auth.uid() = user_id and user_id is not null);

create policy "jobs_update_own"
  on public.jobs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "jobs_delete_own"
  on public.jobs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. 적용 확인 (선택)
-- ═══════════════════════════════════════════════════════════════
-- select schemaname, tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('profiles', 'reviews', 'jobs')
-- order by tablename, policyname;
