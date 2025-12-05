'use client';

import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useCallback, useState } from 'react';

/**
 * 사용자 Context 동기화 Hook
 * 
 * 서버 Context(OrgContext, CenterContext)는 JWT 쿠키를 기반으로 생성됩니다.
 * 따라서 Tier 2 작업(tRPC Mutation)으로 상태가 변경되면,
 * 반드시 클라이언트 쿠키를 갱신해야 합니다.
 * 
 * 사용 시점:
 * - 결제 성공 페이지 (PaymentSuccess)
 * - 멤버 초대 수락 완료 페이지
 * - 플랜 업그레이드 완료 시점
 * - 권한 변경 완료 시점
 * 
 * @example
 * ```typescript
 * const { refreshContext, isRefreshing } = useUserSync();
 * 
 * const handleSuccess = async () => {
 *   await mutation.mutateAsync(data);
 *   await refreshContext(); // JWT 갱신 및 서버 컴포넌트 리렌더링
 * };
 * ```
 */
export function useUserSync() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * 서버 Context 갱신
   * 
   * 1. Supabase Auth Hook 트리거 → 새 JWT 발급 (쿠키 갱신)
   * 2. Server Component 리렌더링 요청 → 새 쿠키로 getOrgContext/getCenterContext 다시 실행됨
   * 
   * @throws {Error} refreshSession 실패 시
   */
  const refreshContext = useCallback(async () => {
    try {
      setIsRefreshing(true);

      // 1. Supabase Auth Hook 트리거 → 새 JWT 발급 (쿠키 갱신)
      const { error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Failed to refresh session:', refreshError);
        throw refreshError;
      }

      // 2. Server Component 리렌더링 요청
      // 새 쿠키로 getOrgContext/getCenterContext가 다시 실행되어 최신 정보 반영
      router.refresh();
    } catch (error) {
      console.error('Failed to refresh context:', error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [supabase, router]);

  return {
    refreshContext,
    isRefreshing,
  };
}

