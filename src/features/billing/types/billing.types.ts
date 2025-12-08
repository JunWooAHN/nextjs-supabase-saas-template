/**
 * 결제 관련 타입 정의
 */

import { SUBSCRIPTION_STATUS, SUBSCRIPTION_INTERVALS } from '@/lib/constants';

/**
 * 구독 플랜 정보
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  interval: number; // 1: MONTHLY, 2: YEARLY
  price_per_org: number;
  price_per_member: number;
  active: boolean;
  features: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * 엔티티 구독 정보 (플랜 정보 포함)
 */
export interface SubscriptionWithPlan {
  entity_id: string;
  entity_type: number;
  plan_id: string | null;
  status: number; // SUBSCRIPTION_STATUS
  current_period_end: string | null;
  payment_provider_customer_id: string | null;
  payment_provider_subscription_id: string | null;
  created_at: string;
  updated_at: string;
  subscription_plans: SubscriptionPlan | null;
}

/**
 * 결제 로그 정보
 */
export interface PaymentLog {
  id: string;
  entity_id: string;
  entity_type: number;
  amount: number;
  status: number; // 1: SUCCESS, 2: FAILED
  provider_payment_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * 네이버 페이 결제 요청 응답
 */
export interface NaverPayPaymentResponse {
  code: string; // 응답 코드
  message: string; // 응답 메시지
  data: {
    paymentId: string; // 결제 ID
    paymentUrl: string; // 결제 페이지 URL
    mobileUrl?: string; // 모바일 결제 URL (선택)
  };
}

/**
 * 결제 세션 생성 결과 (네이버 페이)
 */
export interface BillingSession {
  url: string;
  paymentId: string; // 네이버 페이 결제 ID
}

/**
 * 네이버 페이 결제 승인 요청
 */
export interface NaverPayApproveRequest {
  paymentId: string;
  approveToken: string;
}

/**
 * 네이버 페이 결제 승인 응답
 */
export interface NaverPayApproveResponse {
  code: string;
  message: string;
  data: {
    paymentId: string;
    paymentStatus: string; // SUCCESS, FAILED, CANCELED
    totalAmount: number;
    approvedAt: string;
    orderId?: string;
  };
}

/**
 * 결제 세션 정보
 */
export interface BillingSessionInfo {
  paymentId: string;
  status: string;
  url: string | null;
  metadata?: Record<string, any>;
}

