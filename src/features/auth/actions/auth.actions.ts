/**
 * Auth Server Actions
 * Tier 1 작업 (일반 사용자) - 로그아웃 등
 * 
 * 참고: 인증 자체는 클라이언트에서 처리하지만,
 * 로그아웃 후 리다이렉트가 필요한 경우 Server Action 사용
 */

'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * 로그아웃 처리
 * Server Action을 사용하여 로그아웃 후 리다이렉트
 */
export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

