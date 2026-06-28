-- CafeRadar v2 마이그레이션 (기존 DB에 적용)
-- Supabase Dashboard → SQL Editor에서 실행

-- reviews 삭제 정책
drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own"
  on public.reviews for delete
  using (auth.uid() = user_id);

-- jobs: 작성자 · 모집 상태 컬럼 추가
alter table public.jobs
  add column if not exists user_id uuid references auth.users (id) on delete set null;

alter table public.jobs
  add column if not exists status text not null default 'open';

-- 기존 행 status 기본값 보정
update public.jobs set status = 'open' where status is null;

-- status check 제약 (없을 때만)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_status_check'
  ) then
    alter table public.jobs
      add constraint jobs_status_check check (status in ('open', 'closed'));
  end if;
end $$;

create index if not exists jobs_user_id_idx on public.jobs (user_id);

-- jobs insert 정책 교체
drop policy if exists "jobs_insert_public" on public.jobs;
create policy "jobs_insert_public"
  on public.jobs for insert
  with check (user_id is null or auth.uid() = user_id);

-- jobs 수정 · 삭제 정책
drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own"
  on public.jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "jobs_delete_own" on public.jobs;
create policy "jobs_delete_own"
  on public.jobs for delete
  using (auth.uid() = user_id);
