-- migration_v3 보완: password_hash 컬럼 누락 시 실행
-- (RPC만 생성되고 ALTER TABLE이 빠졌을 때)

create extension if not exists pgcrypto;

alter table public.jobs
  add column if not exists password_hash text;
