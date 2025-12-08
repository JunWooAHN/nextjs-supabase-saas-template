/**
 * 구독 서비스 인터페이스
 * DI를 위한 인터페이스 정의
 */

import type { SubscriptionWithPlan, PaymentLog } from '../types/billing.types';

export interface GetSubscriptionInput {
  entityId: string;
  entityType: number; // 1: ORGANIZATION, 2: CENTER
}

export interface GetPaymentLogsInput {
  entityId: string;
  entityType: number;
  limit?: number;
}

export interface UpdateSubscriptionInput {
  entityId: string;
  entityType: number;
  planId: string;
}

export interface ISubscriptionService {
  /**
   * 엔티티의 구독 정보 조회 (플랜 정보 포함)
   */
  getSubscription(input: GetSubscriptionInput): Promise<SubscriptionWithPlan | null>;

  /**
   * 결제 로그 목록 조회
   */
  getPaymentLogs(input: GetPaymentLogsInput): Promise<PaymentLog[]>;

  /**
   * 구독 플랜 변경
   * TODO: 구현 필요 (Stripe 연동 후)
   */
  updateSubscription(input: UpdateSubscriptionInput): Promise<void>;

  /**
   * 구독 취소
   * TODO: 구현 필요 (Stripe 연동 후)
   */
  cancelSubscription(entityId: string, entityType: number): Promise<void>;
}

