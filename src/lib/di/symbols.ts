/**
 * DI 컨테이너 심볼 정의
 * InversifyJS에서 사용할 심볼들을 중앙에서 관리합니다.
 */

// Supabase 클라이언트
export const SUPABASE_CLIENT = Symbol('SupabaseClient');
export const SUPABASE_ADMIN_CLIENT = Symbol('SupabaseAdminClient');

// 서비스 계층
export const AUTH_SERVICE = Symbol('AuthService');
export const MEMBERSHIP_SERVICE = Symbol('MembershipService');
export const BILLING_SERVICE = Symbol('BillingService');
export const SUBSCRIPTION_SERVICE = Symbol('SubscriptionService');
export const PROOF_SERVICE = Symbol('ProofService');
export const ORGANIZATION_SERVICE = Symbol('OrganizationService');
export const CENTER_SERVICE = Symbol('CenterService');
export const RELATIONSHIP_SERVICE = Symbol('RelationshipService');

