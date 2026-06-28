/**
 * 구직글 — Supabase job_seekers 테이블 (로그인 회원만 작성)
 */
import { getSupabase } from './supabase.js';
import { mapJobSeekerFromDb } from './utils.js';

const SEEKER_COLUMNS = 'id, user_id, region, position, experience, availability, contact, introduction, created_at';

export async function fetchJobSeekers(filters = {}) {
  const supabase = getSupabase();
  let query = supabase
    .from('job_seekers')
    .select(SEEKER_COLUMNS)
    .order('created_at', { ascending: false });

  const { search } = filters;

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`region.ilike.${term},position.ilike.${term},introduction.ilike.${term}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[JobSeekers] 조회 실패:', error.message);
    throw new Error('구직글을 불러오지 못했습니다.');
  }

  return (data || []).map(mapJobSeekerFromDb);
}

export async function fetchJobSeekersByUser(userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('job_seekers')
    .select(SEEKER_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[JobSeekers] 내 구직글 조회 실패:', error.message);
    throw new Error('내 구직글을 불러오지 못했습니다.');
  }

  return (data || []).map(mapJobSeekerFromDb);
}

export async function createJobSeeker(userId, form) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('job_seekers')
    .insert({
      user_id: userId,
      region: form.region.trim(),
      position: form.position,
      experience: form.experience?.trim() || null,
      availability: form.availability.trim(),
      contact: form.contact.trim(),
      introduction: form.introduction?.trim() || null,
    })
    .select(SEEKER_COLUMNS)
    .single();

  if (error) {
    console.error('[JobSeekers] 작성 실패:', error.message);
    throw new Error('구직글 등록에 실패했습니다.');
  }

  return mapJobSeekerFromDb(data);
}

export async function updateJobSeeker(id, form) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('job_seekers')
    .update({
      region: form.region.trim(),
      position: form.position,
      experience: form.experience?.trim() || null,
      availability: form.availability.trim(),
      contact: form.contact.trim(),
      introduction: form.introduction?.trim() || null,
    })
    .eq('id', id)
    .select(SEEKER_COLUMNS)
    .single();

  if (error) {
    console.error('[JobSeekers] 수정 실패:', error.message);
    throw new Error('구직글 수정에 실패했습니다.');
  }

  return mapJobSeekerFromDb(data);
}

export async function deleteJobSeeker(id) {
  const supabase = getSupabase();
  const { error } = await supabase.from('job_seekers').delete().eq('id', id);

  if (error) {
    console.error('[JobSeekers] 삭제 실패:', error.message);
    throw new Error('구직글 삭제에 실패했습니다.');
  }
}
