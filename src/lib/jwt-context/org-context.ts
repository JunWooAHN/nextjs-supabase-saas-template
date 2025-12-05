/**
 * Organization Context
 * 
 * 조직과 관련된 모든 맥락을 캡슐화한 객체
 * 권한, 구독 상태, 사용자 정보를 하나의 Context로 관리
 * 
 * @module jwt-context/org-context
 */

import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PermissionsBitField } from '@/lib/permissions';
import { PERMISSIONS } from '@/lib/permissions';
import { SUBSCRIPTION_STATUS } from '@/lib/constants';

/**
 * JWT에서 파싱된 멤버십 데이터 타입
 * [구독 상태, 권한(Hex String)]
 */
type MembershipData = [number, string];

/**
 * 멤버십 맵 타입
 * Entity ID를 키로 하는 멤버십 데이터 맵
 */
type MembershipsMap = Record<string, MembershipData>;

/**
 * [Smart Context] 조직과 관련된 모든 맥락을 캡슐화한 객체
 * 
 * 이 클래스는 다음을 제공합니다:
 * - 상태 조회: isBillingActive, isOwner, isManager, roleName
 * - Guard Methods: require(), requireBilling(), requireOwner(), requireManager()
 * 
 * @example
 * ```typescript
 * const ctx = await getOrgContext(orgId);
 * ctx.requireOwner(); // OWNER 권한이 없으면 자동 리디렉션
 * 
 * if (ctx.isBillingActive) {
 *   // 구독이 활성화된 경우에만 실행
 * }
 * ```
 */
export class OrgContext {
  constructor(
    public readonly orgId: string,
    public readonly user: User,
    public readonly permissions: PermissionsBitField,
    private readonly _subscriptionStatus: number,
  ) {}

  // ============================================
  // State Getters
  // ============================================

  /**
   * 구독 상태가 ACTIVE인지 확인
   */
  get isBillingActive(): boolean {
    return this._subscriptionStatus === SUBSCRIPTION_STATUS.ACTIVE;
  }

  /**
   * ORG_OWNER 권한이 있는지 확인
   */
  get isOwner(): boolean {
    return this.permissions.has(PERMISSIONS.ORG_OWNER, false, 1);
  }

  /**
   * ORG_MANAGE_MEMBERS 권한이 있는지 확인 (MANAGER 이상)
   */
  get isManager(): boolean {
    return this.permissions.has(PERMISSIONS.ORG_MANAGE_MEMBERS, false, 1);
  }

  /**
   * 역할 이름 반환
   * OWNER > MANAGER > MEMBER 순서
   */
  get roleName(): string {
    if (this.isOwner) return 'OWNER';
    if (this.isManager) return 'MANAGER';
    return 'MEMBER';
  }

  // ============================================
  // Guard Methods (강제성 검증 - 실패 시 Redirect)
  // ============================================

  /**
   * 특정 권한이 없으면 즉시 리디렉션
   * 
   * @param permission - 필요한 권한 (BigInt)
   * @param redirectUrl - 리디렉션 URL (기본값: '/dashboard?error=forbidden')
   * 
   * @example
   * ```typescript
   * ctx.require(PERMISSIONS.ORG_VIEW);
   * ctx.require(PERMISSIONS.ORG_MANAGE_MEMBERS, '/custom-error');
   * ```
   */
  require(permission: bigint, redirectUrl: string = '/dashboard?error=forbidden'): void {
    if (!this.permissions.has(permission, false, 1)) {
      redirect(redirectUrl);
    }
  }

  /**
   * 구독이 비활성 상태면 빌링 페이지로 강제 이동
   * 
   * @example
   * ```typescript
   * ctx.requireBilling(); // 구독이 비활성이면 /manage/org/[orgId]/billing으로 리디렉션
   * ```
   */
  requireBilling(): void {
    if (!this.isBillingActive) {
      redirect(`/manage/org/${this.orgId}/billing`);
    }
  }

  /**
   * 오직 OWNER만 통과
   * 
   * @example
   * ```typescript
   * ctx.requireOwner(); // OWNER가 아니면 자동 리디렉션
   * ```
   */
  requireOwner(): void {
    this.require(PERMISSIONS.ORG_OWNER);
  }

  /**
   * MANAGER 이상만 통과 (MANAGER 또는 OWNER)
   * 
   * @example
   * ```typescript
   * ctx.requireManager(); // MANAGER 이상이 아니면 자동 리디렉션
   * ```
   */
  requireManager(): void {
    this.require(PERMISSIONS.ORG_MANAGE_MEMBERS);
  }
}

/**
 * [Factory] Request-Scoped Singleton 생성기
 * 
 * ⚠️ 중요: react.cache()를 사용하여 동일한 요청 내에서
 * 여러 번 호출해도 1회만 실행됩니다.
 * 
 * Next.js App Router의 렌더링 주기:
 * 1. Layout 렌더링 → getOrgContext() 호출 (실행)
 * 2. Page 렌더링 → getOrgContext() 호출 (캐시 Hit)
 * 3. Component 렌더링 → getOrgContext() 호출 (캐시 Hit)
 * 
 * 이렇게 하면 JWT 파싱과 PermissionsBitField 생성 비용을 절감할 수 있습니다.
 * 
 * @param orgId - 조직 UUID
 * @returns OrgContext 인스턴스 (요청별 싱글톤)
 * 
 * @throws {redirect} 인증되지 않은 사용자 또는 멤버십이 없는 경우
 * 
 * @example
 * ```typescript
 * // Layout에서
 * const ctx = await getOrgContext(params.orgId);
 * ctx.require(PERMISSIONS.ORG_VIEW);
 * 
 * // Page에서 (캐시된 객체 재사용)
 * const ctx = await getOrgContext(params.orgId);
 * if (ctx.isOwner) {
 *   // Owner 전용 UI
 * }
 * ```
 */
export const getOrgContext = cache(async (orgId: string): Promise<OrgContext> => {
  // 1. Supabase 클라이언트 생성 (요청별 세션 포함)
  const supabase = await createServerSupabaseClient();
  
  // 2. 사용자 세션 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/login');
  }

  // 3. JWT에서 memberships 파싱 (v5.6 Spec: Hex String)
  const memberships = user.app_metadata?.memberships as MembershipsMap | undefined;
  const membershipData = memberships?.[orgId];

  // 4. 멤버십이 없으면 접근 불가
  if (!membershipData) {
    redirect('/dashboard');
  }

  // 5. 멤버십 데이터 파싱
  const [status, permHex] = membershipData;
  
  // 6. PermissionsBitField 생성 (Hex String → BigInt)
  const permissions = PermissionsBitField.fromHex(permHex);

  // 7. OrgContext 인스턴스 생성 및 반환
  return new OrgContext(orgId, user, permissions, status);
});

