/**
 * tRPC 서버 설정
 * Tier 2 (SaaS 관리자) 작업을 위한 tRPC 인프라
 * 
 * ⚠️ 중요: 요청별 DI 컨테이너 패턴
 * 각 요청마다 새로운 DI 컨테이너를 생성하여 사용자별 세션을 보장합니다.
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createContainer } from '@/lib/di/container';
import { z } from 'zod';
import type { Container } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

/**
 * tRPC Context 타입 정의
 * 요청별 DI 컨테이너를 포함합니다.
 */
export interface TRPCContext {
  supabase: SupabaseClient;
  user: User | null;
  container: Container; // 요청별 DI 컨테이너
}

/**
 * Context 생성 함수
 * 
 * ⚠️ 중요: 요청마다 호출되어 새로운 컨텍스트를 생성합니다.
 * - 요청별 Supabase 클라이언트 생성 (쿠키 기반 세션)
 * - 요청별 DI 컨테이너 생성 및 Supabase 클라이언트 바인딩
 * 
 * 이 패턴은 모든 사용자가 독립적인 세션을 가지도록 보장합니다.
 */
export async function createTRPCContext(): Promise<TRPCContext> {
  // 1. 요청별 Supabase 클라이언트 생성 (쿠키 기반)
  const supabase = await createServerSupabaseClient();

  // 2. 요청별 DI 컨테이너 생성
  // Supabase 클라이언트를 컨테이너에 바인딩하여 서비스에서 사용 가능하도록 함
  const container = createContainer(supabase);

  // 3. 사용자 세션 확인
  const { data: { user } } = await supabase.auth.getUser();

  return {
    supabase,
    user,
    container, // 요청별 컨테이너를 Context에 포함
  };
}

// tRPC 초기화
const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof z.ZodError
          ? error.cause.flatten()
          : null,
      },
    };
  },
});

// Base router와 procedure export
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * 인증이 필요한 procedure
 * 사용자 인증을 확인하고 타입을 좁힙니다.
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // 타입이 user로 좁혀짐
    },
  });
});

