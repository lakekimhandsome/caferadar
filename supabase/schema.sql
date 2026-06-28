-- CafeRadar Supabase Schema
-- Supabase Dashboard → SQL Editor에서 전체 실행

create extension if not exists pgcrypto;

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

-- 본인 후기만 삭제
create policy "reviews_delete_own"
  on public.reviews for delete
  using (auth.uid() = user_id);

-- 본인 후기만 수정
create policy "reviews_update_own"
  on public.reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 3. jobs — 구인글 (비회원 작성 가능)
-- ─────────────────────────────────────────
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  cafe_name text not null,
  region text not null,
  position text not null,
  wage text not null,
  work_time text not null,
  contact text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'closed')),
  password_hash text,
  created_at timestamptz not null default now()
);

create index if not exists jobs_created_at_idx on public.jobs (created_at desc);
create index if not exists jobs_user_id_idx on public.jobs (user_id);

alter table public.jobs enable row level security;

-- 누구나 구인글 조회
create policy "jobs_select_public"
  on public.jobs for select
  using (true);

-- 로그인 회원만 직접 구인글 작성 (비회원은 RPC)
create policy "jobs_insert_authenticated"
  on public.jobs for insert
  with check (auth.uid() = user_id and user_id is not null);

-- 본인 구인글만 수정 (모집 상태 변경)
create policy "jobs_update_own"
  on public.jobs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 본인 구인글만 삭제
create policy "jobs_delete_own"
  on public.jobs for delete
  using (auth.uid() = user_id);

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

-- ─────────────────────────────────────────
-- 5. 비회원 구인글 RPC (비밀번호 기반 작성·수정·삭제)
-- ─────────────────────────────────────────

create or replace function public.verify_guest_job_password(p_job_id uuid, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  select password_hash into v_hash
  from jobs
  where id = p_job_id and user_id is null;

  if v_hash is null then
    return false;
  end if;

  return crypt(p_password, v_hash) = v_hash;
end;
$$;

create or replace function public.create_guest_job(
  p_cafe_name text,
  p_region text,
  p_position text,
  p_wage text,
  p_work_time text,
  p_contact text,
  p_description text,
  p_password text
)
returns table (
  id uuid,
  user_id uuid,
  cafe_name text,
  region text,
  "position" text,
  wage text,
  work_time text,
  contact text,
  description text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jobs%rowtype;
begin
  if length(trim(p_password)) < 4 then
    raise exception 'PASSWORD_TOO_SHORT';
  end if;

  insert into jobs (
    cafe_name, region, "position", wage, work_time, contact, description, status, password_hash
  ) values (
    trim(p_cafe_name), trim(p_region), p_position, trim(p_wage), trim(p_work_time),
    trim(p_contact), nullif(trim(p_description), ''), 'open', crypt(p_password, gen_salt('bf'))
  )
  returning * into v_row;

  return query
  select
    v_row.id, v_row.user_id, v_row.cafe_name, v_row.region, v_row.position,
    v_row.wage, v_row.work_time, v_row.contact, v_row.description,
    v_row.status, v_row.created_at;
end;
$$;

create or replace function public.update_guest_job(
  p_job_id uuid,
  p_password text,
  p_cafe_name text,
  p_region text,
  p_position text,
  p_wage text,
  p_work_time text,
  p_contact text,
  p_description text,
  p_status text
)
returns table (
  id uuid,
  user_id uuid,
  cafe_name text,
  region text,
  "position" text,
  wage text,
  work_time text,
  contact text,
  description text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jobs%rowtype;
begin
  if not public.verify_guest_job_password(p_job_id, p_password) then
    raise exception 'INVALID_PASSWORD';
  end if;

  update jobs
  set
    cafe_name = trim(p_cafe_name),
    region = trim(p_region),
    "position" = p_position,
    wage = trim(p_wage),
    work_time = trim(p_work_time),
    contact = trim(p_contact),
    description = nullif(trim(p_description), ''),
    status = p_status
  where id = p_job_id and user_id is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'JOB_NOT_FOUND';
  end if;

  return query
  select
    v_row.id, v_row.user_id, v_row.cafe_name, v_row.region, v_row.position,
    v_row.wage, v_row.work_time, v_row.contact, v_row.description,
    v_row.status, v_row.created_at;
end;
$$;

create or replace function public.update_guest_job_status(
  p_job_id uuid,
  p_password text,
  p_status text
)
returns table (
  id uuid,
  user_id uuid,
  cafe_name text,
  region text,
  "position" text,
  wage text,
  work_time text,
  contact text,
  description text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jobs%rowtype;
begin
  if not public.verify_guest_job_password(p_job_id, p_password) then
    raise exception 'INVALID_PASSWORD';
  end if;

  update jobs
  set status = p_status
  where id = p_job_id and user_id is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'JOB_NOT_FOUND';
  end if;

  return query
  select
    v_row.id, v_row.user_id, v_row.cafe_name, v_row.region, v_row.position,
    v_row.wage, v_row.work_time, v_row.contact, v_row.description,
    v_row.status, v_row.created_at;
end;
$$;

create or replace function public.delete_guest_job(p_job_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.verify_guest_job_password(p_job_id, p_password) then
    raise exception 'INVALID_PASSWORD';
  end if;

  delete from jobs where id = p_job_id and user_id is null;

  if not found then
    raise exception 'JOB_NOT_FOUND';
  end if;
end;
$$;

grant execute on function public.verify_guest_job_password(uuid, text) to anon, authenticated;
grant execute on function public.create_guest_job(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_guest_job(uuid, text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_guest_job_status(uuid, text, text) to anon, authenticated;
grant execute on function public.delete_guest_job(uuid, text) to anon, authenticated;

-- ─────────────────────────────────────────
-- 6. 회원 탈퇴
-- ─────────────────────────────────────────

create or replace function public.delete_own_account()
returns json
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  delete from public.jobs where user_id = v_uid;
  delete from auth.users where id = v_uid;

  return json_build_object('success', true);
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
