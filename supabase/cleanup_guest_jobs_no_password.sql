-- 일회성 정리: 비밀번호 없는 비회원 구인글 삭제
-- Supabase Dashboard → SQL Editor
--
-- ▶ password_hash 오류가 났다면 = migration_v3 미적용 상태
--    아래 [A] 블록만 실행하세요.

-- ─────────────────────────────────────────
-- [A] migration_v3 미적용 (password_hash 없음)
-- ─────────────────────────────────────────

-- 확인
select id, cafe_name, region, created_at
from public.jobs
where user_id is null
order by created_at desc;

-- 삭제
delete from public.jobs
where user_id is null;

-- ─────────────────────────────────────────
-- [B] migration_v3 적용 후 (password_hash 있음)
--     [A] 실행 후 v3 적용했다면, 혹시 남은 글이 있을 때만 사용
-- ─────────────────────────────────────────

-- delete from public.jobs
-- where user_id is null
--   and password_hash is null;

-- ─────────────────────────────────────────
-- [C] user_id 컬럼도 없을 때 (최초 schema.sql만 실행한 경우)
--     [A]에서 user_id 오류가 나면 아래 사용
-- ─────────────────────────────────────────

-- select id, cafe_name, region, created_at from public.jobs;
-- delete from public.jobs;
