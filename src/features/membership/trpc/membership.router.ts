/**
 * 멤버십 tRPC 라우터
 * Tier 2 (SaaS 관리자) 작업을 위한 tRPC 프로시저
 */

import { router, protectedProcedure } from '@/lib/trpc/server';
import { z } from 'zod';
import { MEMBERSHIP_SERVICE } from '@/lib/di/symbols';
import type { IMembershipService } from '../services/membership.service.interface';
import { TRPCError } from '@trpc/server';

export const membershipRouter = router({
  /**
   * 엔티티에 사용자 초대
   * Tier 2: SaaS 관리자 작업
   */
  inviteUserToEntity: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        entityId: z.string().uuid(),
        entityType: z.number().int().min(1).max(2), // 1: ORGANIZATION, 2: CENTER
        permissions: z.string().transform((val) => BigInt(val)), // BigInt 변환
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 권한 검증: 사용자가 해당 엔티티의 관리자 권한이 있는지 확인
      // TODO: 권한 검증 로직 추가

      // 요청별 DI 컨테이너에서 서비스 주입받아 사용
      // ctx.container은 해당 요청 전용 컨테이너이므로 사용자별 세션이 보장됩니다.
      const membershipService = ctx.container.get<IMembershipService>(MEMBERSHIP_SERVICE);

      try {
        await membershipService.inviteUserToEntity({
          email: input.email,
          entityId: input.entityId,
          entityType: input.entityType,
          permissions: input.permissions,
        });

        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to invite user',
        });
      }
    }),

  /**
   * 사용자 권한 업데이트
   * Tier 2: SaaS 관리자 작업
   */
  updateUserPermissions: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        entityId: z.string().uuid(),
        permissions: z.string().transform((val) => BigInt(val)),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 권한 검증: 사용자가 해당 엔티티의 관리자 권한이 있는지 확인
      // TODO: 권한 검증 로직 추가

      const membershipService = ctx.container.get<IMembershipService>(MEMBERSHIP_SERVICE);

      try {
        await membershipService.updateUserPermissions({
          userId: input.userId,
          entityId: input.entityId,
          permissions: input.permissions,
        });

        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update permissions',
        });
      }
    }),

  /**
   * 엔티티에서 사용자 제거
   * Tier 2: SaaS 관리자 작업
   */
  removeUserFromEntity: protectedProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        entityId: z.string().uuid(),
        entityType: z.number().int().min(1).max(2),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 권한 검증
      // TODO: 권한 검증 로직 추가

      const membershipService = ctx.container.get<IMembershipService>(MEMBERSHIP_SERVICE);

      try {
        await membershipService.removeUserFromEntity({
          userId: input.userId,
          entityId: input.entityId,
          entityType: input.entityType,
        });

        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to remove user',
        });
      }
    }),

  /**
   * 엔티티의 멤버 목록 조회
   * Tier 2: SaaS 관리자 작업
   */
  getMembersForEntity: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        entityType: z.number().int().min(1).max(2),
      })
    )
    .query(async ({ ctx, input }) => {
      // 권한 검증
      // TODO: 권한 검증 로직 추가

      const membershipService = ctx.container.get<IMembershipService>(MEMBERSHIP_SERVICE);

      try {
        const members = await membershipService.getMembersForEntity(
          input.entityId,
          input.entityType
        );

        return members;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch members',
        });
      }
    }),
});

