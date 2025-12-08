/**
 * 네이버 페이 결제 취소 API
 * 
 * Tier 2: tRPC를 통한 호출 또는 직접 API 호출
 */

import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import { createContainer } from '@/lib/di/container';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BILLING_SERVICE } from '@/lib/di/symbols';
import type { IBillingService } from '@/features/billing/services/billing.service.interface';

/**
 * POST 핸들러: 결제 취소 처리
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId, cancelReason } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'paymentId is required' },
        { status: 400 }
      );
    }

    // DI 컨테이너 생성
    const supabase = await createServerSupabaseClient();
    const container = createContainer(supabase);

    // BillingService 주입
    const billingService = container.get<IBillingService>(BILLING_SERVICE);

    // 결제 취소
    const cancelResult = await billingService.cancelPayment(
      paymentId,
      cancelReason || '사용자 요청'
    );

    // payment_logs에서 결제 정보 조회
    const adminClient = createAdminSupabaseClient();
    const { data: paymentLog } = await adminClient
      .from('payment_logs')
      .select('entity_id, entity_type')
      .eq('provider_payment_id', paymentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (paymentLog) {
      // entity_subscriptions를 CANCELED로 업데이트
      await adminClient
        .from('entity_subscriptions')
        .update({
          status: SUBSCRIPTION_STATUS.CANCELED,
          updated_at: new Date().toISOString(),
        })
        .eq('entity_id', paymentLog.entity_id)
        .eq('entity_type', paymentLog.entity_type);

      // payment_logs에 취소 기록 추가
      await adminClient.from('payment_logs').insert({
        entity_id: paymentLog.entity_id,
        entity_type: paymentLog.entity_type,
        amount: cancelResult.data.totalAmount || 0,
        status: PAYMENT_STATUS.FAILED, // 취소는 FAILED로 기록
        provider_payment_id: paymentId,
        metadata: {
          cancel_reason: cancelReason || '사용자 요청',
          canceled_at: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: cancelResult.data,
    });
  } catch (error: any) {
    console.error('Payment cancel error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

