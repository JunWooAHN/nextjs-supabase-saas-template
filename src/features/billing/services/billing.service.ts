/**
 * 결제 서비스 구현체
 * DI를 통한 의존성 주입 패턴
 * 
 * 네이버 페이 API 연동
 * @see https://docs.pay.naver.com/docs/common/online-payment-overview
 */

import { injectable, inject } from 'inversify';
import { IBillingService, CreateBillingSessionInput } from './billing.service.interface';
import { SUPABASE_CLIENT } from '@/lib/di/symbols';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BillingSession,
  BillingSessionInfo,
  NaverPayPaymentResponse,
  NaverPayApproveResponse,
} from '../types/billing.types';

@injectable()
export class BillingService implements IBillingService {
  private readonly naverPayApiUrl: string;
  private readonly naverPayClientId: string;
  private readonly naverPaySecretKey: string;

  constructor(@inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {
    // 네이버 페이 API 설정
    this.naverPayApiUrl =
      process.env.NAVER_PAY_API_URL || 'https://dev.apis.naver.com';
    this.naverPayClientId = process.env.NAVER_PAY_CLIENT_ID || '';
    this.naverPaySecretKey = process.env.NAVER_PAY_SECRET_KEY || '';

    if (!this.naverPayClientId || !this.naverPaySecretKey) {
      console.warn(
        '네이버 페이 API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.'
      );
    }
  }

  /**
   * 네이버 페이 결제 요청 생성
   * 
   * 1. 플랜 정보 조회
   * 2. 네이버 페이 결제 요청 API 호출
   * 3. 결제 페이지 URL 반환
   * 
   * @see https://docs.pay.naver.com/docs/guide/online-payment-guide
   */
  async createBillingSession(input: CreateBillingSessionInput): Promise<BillingSession> {
    // 플랜 정보 조회
    const { data: plan, error: planError } = await this.supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', input.planId)
      .single();

    if (planError || !plan) {
      throw new Error(`플랜을 찾을 수 없습니다: ${input.planId}`);
    }

    if (!plan.active) {
      throw new Error('비활성화된 플랜입니다.');
    }

    // 결제 금액 계산 (조직당 금액 + 멤버당 금액 * 멤버 수)
    // TODO: 실제 멤버 수 조회 필요
    const memberCount = 1; // 임시 값
    const totalAmount = plan.price_per_org + plan.price_per_member * memberCount;

    // 네이버 페이 결제 요청 API 호출
    const orderId = `ORDER_${Date.now()}_${input.entityId}`;
    const returnUrl = `${input.returnUrl}?paymentId={paymentId}`;

    try {
      const response = await fetch(`${this.naverPayApiUrl}/online/v2/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Naver-Client-Id': this.naverPayClientId,
          'X-Naver-Client-Secret': this.naverPaySecretKey,
        },
        body: JSON.stringify({
          merchantPayKey: orderId,
          productName: plan.name,
          totalPayAmount: totalAmount,
          taxScopeAmount: totalAmount,
          taxExScopeAmount: 0,
          returnUrl,
          // 메타데이터에 엔티티 정보 포함
          customData: JSON.stringify({
            entity_id: input.entityId,
            entity_type: input.entityType,
            plan_id: input.planId,
          }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `네이버 페이 API 오류: ${errorData.message || response.statusText}`
        );
      }

      const data: NaverPayPaymentResponse = await response.json();

      if (data.code !== 'SUCCESS') {
        throw new Error(`네이버 페이 결제 요청 실패: ${data.message}`);
      }

      return {
        url: data.data.paymentUrl,
        paymentId: data.data.paymentId,
      };
    } catch (error: any) {
      throw new Error(`결제 세션 생성 실패: ${error.message}`);
    }
  }

  /**
   * 네이버 페이 결제 정보 조회
   * 
   * @param paymentId 네이버 페이 결제 ID
   */
  async getBillingSession(paymentId: string): Promise<BillingSessionInfo | null> {
    try {
      const response = await fetch(
        `${this.naverPayApiUrl}/online/v2/payments/${paymentId}`,
        {
          method: 'GET',
          headers: {
            'X-Naver-Client-Id': this.naverPayClientId,
            'X-Naver-Client-Secret': this.naverPaySecretKey,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`결제 정보 조회 실패: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        paymentId: data.data?.paymentId || paymentId,
        status: data.data?.paymentStatus || 'UNKNOWN',
        url: null,
        metadata: data.data,
      };
    } catch (error: any) {
      throw new Error(`결제 정보 조회 실패: ${error.message}`);
    }
  }

  /**
   * 네이버 페이 결제 승인
   * 결제 완료 후 콜백에서 호출
   * 
   * @param paymentId 네이버 페이 결제 ID
   * @param approveToken 네이버 페이 승인 토큰
   */
  async approvePayment(
    paymentId: string,
    approveToken: string
  ): Promise<NaverPayApproveResponse> {
    try {
      const response = await fetch(
        `${this.naverPayApiUrl}/online/v2/payments/${paymentId}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Naver-Client-Id': this.naverPayClientId,
            'X-Naver-Client-Secret': this.naverPaySecretKey,
          },
          body: JSON.stringify({
            approveToken,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `네이버 페이 승인 API 오류: ${errorData.message || response.statusText}`
        );
      }

      const data: NaverPayApproveResponse = await response.json();

      if (data.code !== 'SUCCESS') {
        throw new Error(`네이버 페이 결제 승인 실패: ${data.message}`);
      }

      return data;
    } catch (error: any) {
      throw new Error(`결제 승인 실패: ${error.message}`);
    }
  }

  /**
   * 네이버 페이 결제 취소
   * 
   * @param paymentId 네이버 페이 결제 ID
   * @param cancelReason 취소 사유
   */
  async cancelPayment(
    paymentId: string,
    cancelReason: string
  ): Promise<NaverPayApproveResponse> {
    try {
      const response = await fetch(
        `${this.naverPayApiUrl}/online/v2/payments/${paymentId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Naver-Client-Id': this.naverPayClientId,
            'X-Naver-Client-Secret': this.naverPaySecretKey,
          },
          body: JSON.stringify({
            cancelReason,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `네이버 페이 취소 API 오류: ${errorData.message || response.statusText}`
        );
      }

      const data: NaverPayApproveResponse = await response.json();

      if (data.code !== 'SUCCESS') {
        throw new Error(`네이버 페이 결제 취소 실패: ${data.message}`);
      }

      return data;
    } catch (error: any) {
      throw new Error(`결제 취소 실패: ${error.message}`);
    }
  }
}

