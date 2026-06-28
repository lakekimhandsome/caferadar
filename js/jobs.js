/**
 * 구인글 — Supabase jobs 테이블 (비회원 작성 가능)
 */
import { getSupabase } from './supabase.js';
import { mapJobFromDb } from './utils.js';

export async function fetchJobs(filters = {}) {
  const supabase = getSupabase();
  let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });

  const { search } = filters;

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`cafe_name.ilike.${term},region.ilike.${term},position.ilike.${term}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Jobs] 조회 실패:', error.message);
    throw new Error('구인글을 불러오지 못했습니다.');
  }

  return (data || []).map(mapJobFromDb);
}

export async function createJob(form) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      cafe_name: form.cafeName.trim(),
      region: form.region.trim(),
      position: form.position,
      wage: form.hourlyWage.trim(),
      work_time: form.workHours.trim(),
      contact: form.contact.trim(),
      description: form.description?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[Jobs] 작성 실패:', error.message);
    throw new Error('구인글 등록에 실패했습니다.');
  }

  return mapJobFromDb(data);
}
