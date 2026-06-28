-- 닉네임 중복 방지 + 중복 확인 RPC
-- Supabase SQL Editor에서 실행

create unique index if not exists profiles_nickname_lower_unique
  on public.profiles (lower(trim(nickname)));

drop function if exists public.is_nickname_available(text);

create or replace function public.is_nickname_available(p_nickname text)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_nick text := trim(p_nickname);
  v_taken boolean;
begin
  if v_nick = '' then
    return json_build_object('available', false, 'message', '닉네임을 입력해주세요.');
  end if;

  if length(v_nick) < 2 then
    return json_build_object('available', false, 'message', '닉네임은 2자 이상이어야 합니다.');
  end if;

  if length(v_nick) > 20 then
    return json_build_object('available', false, 'message', '닉네임은 20자 이하여야 합니다.');
  end if;

  select exists (
    select 1 from public.profiles
    where lower(trim(nickname)) = lower(v_nick)
  ) into v_taken;

  if v_taken then
    return json_build_object('available', false, 'message', '이미 사용 중인 닉네임입니다.');
  end if;

  return json_build_object('available', true, 'message', '사용 가능한 닉네임입니다.');
end;
$$;

grant execute on function public.is_nickname_available(text) to anon, authenticated;

notify pgrst, 'reload schema';
