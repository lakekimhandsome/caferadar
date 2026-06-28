-- migration_v3 재적용 (RPC 함수 not found 오류 해결)
-- Supabase SQL Editor에서 이 파일 전체를 한 번에 실행하세요.

create extension if not exists pgcrypto with schema extensions;

alter table public.jobs
  add column if not exists password_hash text;

-- 기존 RPC 제거 (반환 타입 변경 시 replace 불가)
drop function if exists public.create_guest_job(text, text, text, text, text, text, text, text);
drop function if exists public.update_guest_job(uuid, text, text, text, text, text, text, text, text, text);
drop function if exists public.update_guest_job_status(uuid, text, text);
drop function if exists public.delete_guest_job(uuid, text);
drop function if exists public.verify_guest_job_password(uuid, text);

-- jobs 행 → JSON (password_hash 제외)
create or replace function public.job_row_to_json(v_row public.jobs)
returns json
language sql
immutable
set search_path = public
as $$
  select json_build_object(
    'id', v_row.id,
    'user_id', v_row.user_id,
    'cafe_name', v_row.cafe_name,
    'region', v_row.region,
    'position', v_row."position",
    'wage', v_row.wage,
    'work_time', v_row.work_time,
    'contact', v_row.contact,
    'description', v_row.description,
    'status', v_row.status,
    'created_at', v_row.created_at
  );
$$;

create or replace function public.verify_guest_job_password(p_job_id uuid, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  select password_hash into v_hash
  from public.jobs
  where id = p_job_id and user_id is null;

  if v_hash is null then
    return false;
  end if;

  return extensions.crypt(p_password, v_hash) = v_hash;
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
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.jobs%rowtype;
begin
  if length(trim(p_password)) < 4 then
    raise exception 'PASSWORD_TOO_SHORT';
  end if;

  insert into public.jobs (
    cafe_name, region, "position", wage, work_time, contact, description, status, password_hash
  ) values (
    trim(p_cafe_name), trim(p_region), p_position, trim(p_wage), trim(p_work_time),
    trim(p_contact), nullif(trim(p_description), ''), 'open',
    extensions.crypt(p_password, extensions.gen_salt('bf'))
  )
  returning * into v_row;

  return public.job_row_to_json(v_row);
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
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.jobs%rowtype;
begin
  if not public.verify_guest_job_password(p_job_id, p_password) then
    raise exception 'INVALID_PASSWORD';
  end if;

  update public.jobs
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

  return public.job_row_to_json(v_row);
end;
$$;

create or replace function public.update_guest_job_status(
  p_job_id uuid,
  p_password text,
  p_status text
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.jobs%rowtype;
begin
  if not public.verify_guest_job_password(p_job_id, p_password) then
    raise exception 'INVALID_PASSWORD';
  end if;

  update public.jobs
  set status = p_status
  where id = p_job_id and user_id is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'JOB_NOT_FOUND';
  end if;

  return public.job_row_to_json(v_row);
end;
$$;

create or replace function public.delete_guest_job(p_job_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.verify_guest_job_password(p_job_id, p_password) then
    raise exception 'INVALID_PASSWORD';
  end if;

  delete from public.jobs where id = p_job_id and user_id is null;

  if not found then
    raise exception 'JOB_NOT_FOUND';
  end if;
end;
$$;

grant execute on function public.job_row_to_json(public.jobs) to anon, authenticated;
grant execute on function public.verify_guest_job_password(uuid, text) to anon, authenticated;
grant execute on function public.create_guest_job(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_guest_job(uuid, text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_guest_job_status(uuid, text, text) to anon, authenticated;
grant execute on function public.delete_guest_job(uuid, text) to anon, authenticated;

-- PostgREST 스키마 캐시 갱신
notify pgrst, 'reload schema';
