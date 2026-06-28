-- pgcrypto 경로 수정 (gen_salt does not exist 오류 해결)
-- Supabase SQL Editor에서 실행

create extension if not exists pgcrypto with schema extensions;

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

notify pgrst, 'reload schema';
