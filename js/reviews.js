/**
 * 후기 — Supabase reviews 테이블
 */
import { getSupabase } from './supabase.js';
import { mapReviewFromDb } from './utils.js';

export async function fetchReviews(filters = {}) {
  const supabase = getSupabase();
  let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });

  const { search, region } = filters;

  if (region && region !== 'all') {
    query = query.eq('region', region);
  }

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`cafe_name.ilike.${term},region.ilike.${term}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Reviews] 조회 실패:', error.message);
    throw new Error('후기를 불러오지 못했습니다.');
  }

  return (data || []).map(mapReviewFromDb);
}

export async function fetchReviewsByUser(userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Reviews] 내 후기 조회 실패:', error.message);
    throw new Error('내 후기를 불러오지 못했습니다.');
  }

  return (data || []).map(mapReviewFromDb);
}

export async function createReview(userId, form) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      user_id: userId,
      cafe_name: form.cafeName.trim(),
      region: form.region.trim(),
      position: form.position,
      wage: form.hourlyWage?.trim() || null,
      period: form.workPeriod.trim(),
      atmosphere: form.atmosphere?.trim() || null,
      pros: form.pros?.trim() || null,
      cons: form.cons?.trim() || null,
      rating: form.rating,
    })
    .select()
    .single();

  if (error) {
    console.error('[Reviews] 작성 실패:', error.message);
    throw new Error('후기 등록에 실패했습니다.');
  }

  return mapReviewFromDb(data);
}
