/**
 * 구인글 — Supabase jobs 테이블 (비회원 작성 가능)
 */
import { getSupabase } from './supabase.js';
import { mapJobFromDb } from './utils.js';

/** password_hash 제외 공개 컬럼 */
const JOB_COLUMNS = 'id, user_id, cafe_name, region, position, wage, work_time, contact, description, status, created_at';

/** RPC 응답 → jobs 행 객체 */
function normalizeRpcJobRow(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data[0];
  return data;
}

function mapRpcError(error) {
  const msg = error?.message || '';
  const code = error?.code || '';
  const details = error?.details || '';

  if (msg.includes('INVALID_PASSWORD')) return new Error('비밀번호가 올바르지 않습니다.');
  if (msg.includes('PASSWORD_TOO_SHORT')) return new Error('비밀번호는 4자 이상이어야 합니다.');
  if (msg.includes('JOB_NOT_FOUND')) return new Error('구인글을 찾을 수 없습니다.');
  if (msg.includes('password_hash') || code === '42703') {
    return new Error('DB 설정이 완료되지 않았습니다. Supabase SQL Editor에서 migration_v3_reapply.sql을 실행해주세요.');
  }
  if (msg.includes('gen_salt') || msg.includes('pgcrypto')) {
    return new Error('DB 암호화 설정 오류입니다. Supabase SQL Editor에서 migration_v3_fix_pgcrypto.sql을 실행해주세요.');
  }
  if (code === 'PGRST202' || (code === '42883' && msg.includes('Could not find the function'))) {
    return new Error('DB 함수가 없습니다. Supabase SQL Editor에서 migration_v3_reapply.sql을 실행해주세요.');
  }

  console.error('[Jobs] RPC 상세 오류:', error);
  return new Error(details || msg || '요청 처리에 실패했습니다.');
}

export async function fetchJobs(filters = {}) {
  const supabase = getSupabase();
  let query = supabase.from('jobs').select(JOB_COLUMNS).order('created_at', { ascending: false });

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

export async function fetchJobsByUser(userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('jobs')
    .select(JOB_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Jobs] 내 구인글 조회 실패:', error.message);
    throw new Error('내 구인글을 불러오지 못했습니다.');
  }

  return (data || []).map(mapJobFromDb);
}

/** 로그인 사용자 구인글 작성 */
async function createMemberJob(form, userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      user_id: userId,
      cafe_name: form.cafeName.trim(),
      region: form.region.trim(),
      position: form.position,
      wage: form.hourlyWage.trim(),
      work_time: form.workHours.trim(),
      contact: form.contact.trim(),
      description: form.description?.trim() || null,
      status: 'open',
    })
    .select(JOB_COLUMNS)
    .single();

  if (error) {
    console.error('[Jobs] 작성 실패:', error.message);
    throw new Error('구인글 등록에 실패했습니다.');
  }

  return mapJobFromDb(data);
}

/** 비회원 구인글 작성 (비밀번호 필수) */
async function createGuestJob(form, password) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('create_guest_job', {
    p_cafe_name: form.cafeName.trim(),
    p_region: form.region.trim(),
    p_position: form.position,
    p_wage: form.hourlyWage.trim(),
    p_work_time: form.workHours.trim(),
    p_contact: form.contact.trim(),
    p_description: form.description?.trim() || '',
    p_password: password,
  });

  if (error) {
    console.error('[Jobs] 비회원 작성 실패:', error.message);
    throw mapRpcError(error);
  }

  const row = normalizeRpcJobRow(data);
  return mapJobFromDb(row);
}

export async function createJob(form, userId = null, password = null) {
  if (userId) return createMemberJob(form, userId);
  if (!password?.trim()) throw new Error('비밀번호를 입력해주세요.');
  return createGuestJob(form, password.trim());
}

/** 로그인 작성자 구인글 수정 */
export async function updateJob(id, form, status) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('jobs')
    .update({
      cafe_name: form.cafeName.trim(),
      region: form.region.trim(),
      position: form.position,
      wage: form.hourlyWage.trim(),
      work_time: form.workHours.trim(),
      contact: form.contact.trim(),
      description: form.description?.trim() || null,
      status,
    })
    .eq('id', id)
    .select(JOB_COLUMNS)
    .single();

  if (error) {
    console.error('[Jobs] 수정 실패:', error.message);
    throw new Error('구인글 수정에 실패했습니다.');
  }

  return mapJobFromDb(data);
}

/** 비회원 구인글 수정 */
export async function updateGuestJob(id, password, form, status) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('update_guest_job', {
    p_job_id: id,
    p_password: password,
    p_cafe_name: form.cafeName.trim(),
    p_region: form.region.trim(),
    p_position: form.position,
    p_wage: form.hourlyWage.trim(),
    p_work_time: form.workHours.trim(),
    p_contact: form.contact.trim(),
    p_description: form.description?.trim() || '',
    p_status: status,
  });

  if (error) {
    console.error('[Jobs] 비회원 수정 실패:', error.message);
    throw mapRpcError(error);
  }

  const row = normalizeRpcJobRow(data);
  return mapJobFromDb(row);
}

/** 로그인 작성자 구인글 삭제 */
export async function deleteJob(id) {
  const supabase = getSupabase();
  const { error } = await supabase.from('jobs').delete().eq('id', id);

  if (error) {
    console.error('[Jobs] 삭제 실패:', error.message);
    throw new Error('구인글 삭제에 실패했습니다.');
  }
}

/** 비회원 구인글 삭제 */
export async function deleteGuestJob(id, password) {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('delete_guest_job', {
    p_job_id: id,
    p_password: password,
  });

  if (error) {
    console.error('[Jobs] 비회원 삭제 실패:', error.message);
    throw mapRpcError(error);
  }
}

/** 로그인 작성자 모집 상태 변경 */
export async function updateJobStatus(id, status) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('jobs')
    .update({ status })
    .eq('id', id)
    .select(JOB_COLUMNS)
    .single();

  if (error) {
    console.error('[Jobs] 상태 변경 실패:', error.message);
    throw new Error('모집 상태 변경에 실패했습니다.');
  }

  return mapJobFromDb(data);
}

/** 비회원 모집 상태 변경 */
export async function updateGuestJobStatus(id, password, status) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('update_guest_job_status', {
    p_job_id: id,
    p_password: password,
    p_status: status,
  });

  if (error) {
    console.error('[Jobs] 비회원 상태 변경 실패:', error.message);
    throw mapRpcError(error);
  }

  const row = normalizeRpcJobRow(data);
  return mapJobFromDb(row);
}

/** 비회원 구인글 비밀번호 확인 */
export async function verifyGuestJobPassword(id, password) {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('verify_guest_job_password', {
    p_job_id: id,
    p_password: password,
  });

  if (error) {
    console.error('[Jobs] 비밀번호 확인 실패:', error.message);
    throw new Error('비밀번호 확인에 실패했습니다.');
  }

  return !!data;
}
