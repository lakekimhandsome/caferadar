-- 회원 탈퇴 RPC 재적용
-- Supabase SQL Editor에서 전체 실행

drop function if exists public.delete_own_account();

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

notify pgrst, 'reload schema';
