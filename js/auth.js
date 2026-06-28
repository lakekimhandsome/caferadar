/**
 * Supabase Authentication & 프로필
 */
import { getSupabase } from './supabase.js';

export const authState = {
  user: null,
  profile: null,
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

  if (!user) return;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[Auth] 프로필 조회 실패:', error.message);
    return;
  }

  authState.profile = data;
}

export function isLoggedIn() {
  return !!authState.user;
}

export function getNickname() {
  return authState.profile?.nickname || authState.user?.email?.split('@')[0] || '회원';
}

export async function signUp(email, password, nickname) {
  const supabase = getSupabase();

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { nickname: nickname.trim() } },
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
  return { success: true, message: '로그아웃되었습니다.' };
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
