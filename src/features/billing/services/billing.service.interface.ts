/**
 * 결제 서비스 인터페이스
 * DI를 위한 인터페이스 정의
 */

import type {
  BillingSession,
  BillingSessionInfo,
  NaverPayApproveResponse,
} from '../types/billing.types';

export interface CreateBillingSessionInput {
  entityId: string;
  entityType: number; // 1: ORGANIZATION, 2: CENTER
  planId: string;
  returnUrl: string;
}

export interface IBillingService {
  /**
   * 결제 세션 생성 (네이버 페이)
   */
  createBillingSession(input: CreateBillingSessionInput): Promise<BillingSession>;

  /**
   * 결제 세션 조회
   */
  getBillingSession(paymentId: string): Promise<BillingSessionInfo | null>;

  /**
   * 결제 승인 (네이버 페이)
   */
  approvePayment(
    paymentId: string,
    approveToken: string
  ): Promise<NaverPayApproveResponse>;

  /**
   * 결제 취소 (네이버 페이)
   */
  cancelPayment(
    paymentId: string,
    cancelReason: string
  ): Promise<NaverPayApproveResponse>;
}

