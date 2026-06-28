/**
 * Supabase 클라이언트 초기화
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

let client = null;

/** Supabase 클라이언트 싱글톤 */
export function getSupabase() {
  if (!client) {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
      console.warn('[CafeRadar] config.js에 Supabase URL/Key를 설정해주세요.');
    }
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
