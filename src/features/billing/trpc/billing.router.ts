/**
 * 결제 tRPC 라우터
 * Tier 2 (SaaS 관리자) 작업을 위한 tRPC 프로시저
 */

import { router, protectedProcedure } from '@/lib/trpc/server';
import { z } from 'zod';
import { BILLING_SERVICE, SUBSCRIPTION_SERVICE } from '@/lib/di/symbols';
import type { IBillingService } from '../services/billing.service.interface';
import type { ISubscriptionService } from '../services/subscription.service.interface';
import { TRPCError } from '@trpc/server';
import { PERMISSIONS } from '@/lib/permissions';
import { ENTITY_TYPES } from '@/lib/constants';

/**
 * 권한 검증 헬퍼 함수
 * OWNER 또는 MANAGER 권한이 있는지 확인
 */
async function verifyBillingPermission(
  supabase: any,
  userId: string,
  entityId: string,
  entityType: number
): Promise<void> {
  const { data: membership, error } = await supabase
    .from('memberships')
    .select('permissions')
    .eq('user_id', userId)
    .eq('entity_id', entityId)
    .eq('entity_type', entityType)
    .single();

  if (error || !membership) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '해당 엔티티에 대한 접근 권한이 없습니다.',
    });
  }

  const permissions = BigInt(membership.permissions || 0);
  let hasPermission = false;

  if (entityType === ENTITY_TYPES.ORGANIZATION) {
    // ORG_MANAGE_MEMBERS (4) 또는 ORG_OWNER (32)
    hasPermission =
      (permissions & PERMISSIONS.ORG_MANAGE_MEMBERS) !== 0n ||
      (permissions & PERMISSIONS.ORG_OWNER) !== 0n;
  } else if (entityType === ENTITY_TYPES.CENTER) {
    // CENTER_MANAGE_ORGS (4096) 또는 CENTER_OWNER (16384)
    hasPermission =
      (permissions & PERMISSIONS.CENTER_MANAGE_ORGS) !== 0n ||
      (permissions & PERMISSIONS.CENTER_OWNER) !== 0n;
  }

  if (!hasPermission) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: '결제 관리 권한이 없습니다. OWNER 또는 MANAGER 권한이 필요합니다.',
    });
  }
}

export const billingRouter = router({
  /**
   * 결제 세션 생성
   * Tier 2: SaaS 관리자 작업
   * 권한: OWNER 또는 MANAGER
   */
  createBillingSession: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        entityType: z.number().int().min(1).max(2),
        planId: z.string().uuid(),
        returnUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다.',
        });
      }

      // 권한 검증
      await verifyBillingPermission(
        ctx.supabase,
        ctx.user.id,
        input.entityId,
        input.entityType
      );

      const billingService = ctx.container.get<IBillingService>(BILLING_SERVICE);

      try {
        const result = await billingService.createBillingSession({
          entityId: input.entityId,
          entityType: input.entityType,
          planId: input.planId,
          returnUrl: input.returnUrl,
        });

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || '결제 세션 생성에 실패했습니다.',
        });
      }
    }),

  /**
   * 구독 정보 조회
   * Tier 2: SaaS 관리자 작업
   * 권한: OWNER 또는 MANAGER
   */
  getSubscription: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        entityType: z.number().int().min(1).max(2),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다.',
        });
      }

      // 권한 검증
      await verifyBillingPermission(
        ctx.supabase,
        ctx.user.id,
        input.entityId,
        input.entityType
      );

      const subscriptionService = ctx.container.get<ISubscriptionService>(SUBSCRIPTION_SERVICE);

      try {
        const subscription = await subscriptionService.getSubscription({
          entityId: input.entityId,
          entityType: input.entityType,
        });

        return subscription;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || '구독 정보 조회에 실패했습니다.',
        });
      }
    }),

  /**
   * 결제 로그 목록 조회
   * Tier 2: SaaS 관리자 작업
   * 권한: OWNER 또는 MANAGER
   */
  getPaymentLogs: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        entityType: z.number().int().min(1).max(2),
        limit: z.number().int().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다.',
        });
      }

      // 권한 검증
      await verifyBillingPermission(
        ctx.supabase,
        ctx.user.id,
        input.entityId,
        input.entityType
      );

      const subscriptionService = ctx.container.get<ISubscriptionService>(SUBSCRIPTION_SERVICE);

      try {
        const paymentLogs = await subscriptionService.getPaymentLogs({
          entityId: input.entityId,
          entityType: input.entityType,
          limit: input.limit,
        });

        return paymentLogs;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || '결제 로그 조회에 실패했습니다.',
        });
      }
    }),
});

