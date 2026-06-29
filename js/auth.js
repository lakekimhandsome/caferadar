/**
 * Supabase Authentication & 프로필
 */
import { getSupabase } from './supabase.js';

export const authState = {
  user: null,
  profile: null,
  isAdmin: false,
};

export async function initAuth(onChange) {
  const supabase = getSupabase();

  const { data: { session } } = await supabase.auth.getSession();
  await setSessionUser(session?.user ?? null);
  onChange('INITIAL');

  supabase.auth.onAuthStateChange(async (_event, session) => {
    await setSessionUser(session?.user ?? null);
    onChange(_event);
  });
}

async function setSessionUser(user) {
  authState.user = user;
  authState.profile = null;
  authState.isAdmin = false;

  if (!user) return;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[Auth] 프로필 조회 실패:', error.message);
  } else {
    authState.profile = data;
  }

  const { data: adminFlag, error: adminError } = await supabase.rpc('is_admin');
  if (adminError) {
    console.error('[Auth] 관리자 확인 실패:', adminError.message);
    authState.isAdmin = !!data?.is_admin;
  } else {
    authState.isAdmin = !!adminFlag;
  }
}

export function isLoggedIn() {
  return !!authState.user;
}

export function isAdmin() {
  return authState.isAdmin;
}

export function getNickname() {
  return authState.profile?.nickname || authState.user?.email?.split('@')[0] || '회원';
}

/** 닉네임 중복 확인 */
export async function checkNicknameAvailable(nickname) {
  const trimmed = nickname?.trim() || '';
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc('is_nickname_available', {
    p_nickname: trimmed,
  });

  if (error) {
    console.error('[Auth] 닉네임 확인 실패:', error.message);

    // RPC 미적용 시 profiles 공개 조회로 fallback
    if (error.code === 'PGRST202' || error.code === '42883') {
      return checkNicknameAvailableFallback(trimmed);
    }

    throw new Error('닉네임 확인에 실패했습니다.');
  }

  return {
    available: !!data?.available,
    message: data?.message || (data?.available ? '사용 가능한 닉네임입니다.' : '이미 사용 중인 닉네임입니다.'),
  };
}

async function checkNicknameAvailableFallback(nickname) {
  if (!nickname) {
    return { available: false, message: '닉네임을 입력해주세요.' };
  }
  if (nickname.length < 2) {
    return { available: false, message: '닉네임은 2자 이상이어야 합니다.' };
  }
  if (nickname.length > 20) {
    return { available: false, message: '닉네임은 20자 이하여야 합니다.' };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('nickname', nickname)
    .limit(1);

  if (error) throw new Error('닉네임 확인에 실패했습니다.');

  const taken = (data || []).length > 0;
  return {
    available: !taken,
    message: taken ? '이미 사용 중인 닉네임입니다.' : '사용 가능한 닉네임입니다.',
  };
}

export async function signUp(email, password, nickname) {
  const trimmedNickname = nickname.trim();
  const nickCheck = await checkNicknameAvailable(trimmedNickname);
  if (!nickCheck.available) {
    return { success: false, message: nickCheck.message };
  }

  const supabase = getSupabase();

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { nickname: trimmedNickname } },
  });

  if (error) return { success: false, message: translateAuthError(error.message) };
  if (!data.user) return { success: false, message: '회원가입에 실패했습니다.' };

  // 이메일 확인이 켜져 있으면 세션이 없을 수 있음 (프로필은 DB 트리거로 생성)
  if (!data.session) {
    return { success: true, message: '가입 확인 메일을 발송했습니다. 이메일을 확인한 뒤 로그인해주세요.' };
  }

  await setSessionUser(data.user);
  return { success: true, message: '회원가입이 완료되었습니다!' };
}

export async function signIn(email, password) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) return { success: false, message: translateAuthError(error.message) };

  await setSessionUser(data.user);
  return { success: true, message: `${getNickname()}님, 환영합니다!` };
}

export async function signOut() {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) return { success: false, message: error.message };

  authState.user = null;
  authState.profile = null;
  authState.isAdmin = false;
  return { success: true, message: '로그아웃되었습니다.' };
}

/** 회원 탈퇴 — 비밀번호 확인 후 계정·후기·프로필 삭제 */
export async function deleteAccount(password) {
  if (!authState.user?.email) {
    return { success: false, message: '로그인이 필요합니다.' };
  }

  const supabase = getSupabase();

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: authState.user.email,
    password,
  });

  if (verifyError) {
    return { success: false, message: '비밀번호가 올바르지 않습니다.' };
  }

  const { error } = await supabase.rpc('delete_own_account');

  if (error) {
    console.error('[Auth] 탈퇴 실패:', error);
    const msg = error.message || '';
    const code = error.code || '';

    if (msg.includes('NOT_AUTHENTICATED')) {
      return { success: false, message: '로그인이 필요합니다.' };
    }
    if (code === 'PGRST202' || (code === '42883' && msg.includes('Could not find the function'))) {
      return { success: false, message: '탈퇴 기능이 준비되지 않았습니다. migration_withdraw_reapply.sql을 실행한 뒤 1~2분 후 다시 시도해주세요.' };
    }
    if (msg.includes('permission denied') && msg.includes('users')) {
      return { success: false, message: '탈퇴 권한 오류입니다. migration_withdraw_reapply.sql을 다시 실행해주세요.' };
    }
    return { success: false, message: msg || '탈퇴 처리에 실패했습니다.' };
  }

  authState.user = null;
  authState.profile = null;
  authState.isAdmin = false;
  await supabase.auth.signOut();

  return { success: true, message: '회원 탈퇴가 완료되었습니다.' };
}

export function requireAuth(onRequired) {
  if (isLoggedIn()) return true;
  onRequired?.();
  return false;
}

function translateAuthError(message) {
  if (message.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (message.includes('User already registered')) return '이미 가입된 이메일입니다.';
  if (message.includes('Password should be at least')) return '비밀번호는 6자 이상이어야 합니다.';
  return message;
}
