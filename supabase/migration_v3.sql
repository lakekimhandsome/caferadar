-- CafeRadar v3 — 수정 기능 + 비회원 구인글 비밀번호
-- Supabase Dashboard → SQL Editor에서 실행

create extension if not exists pgcrypto;

-- 비회원 구인글 비밀번호 해시
alter table public.jobs
  add column if not exists password_hash text;

-- 후기 수정 정책
drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own"
  on public.reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 직접 insert는 로그인 작성자만 (비회원은 RPC 사용)
drop policy if exists "jobs_insert_public" on public.jobs;
drop policy if exists "jobs_insert_authenticated" on public.jobs;
create policy "jobs_insert_authenticated"
  on public.jobs for insert
  with check (auth.uid() = user_id and user_id is not null);

-- ── 비회원 구인글 RPC ──

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
