/**
 * 네이버 페이 결제 승인 API
 * 결제 완료 후 콜백에서 호출
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
 * POST 핸들러: 결제 승인 처리
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId, approveToken } = body;

    if (!paymentId || !approveToken) {
      return NextResponse.json(
        { error: 'paymentId and approveToken are required' },
        { status: 400 }
      );
    }

    // DI 컨테이너 생성
    const supabase = await createServerSupabaseClient();
    const container = createContainer(supabase);

    // BillingService 주입
    const billingService = container.get<IBillingService>(BILLING_SERVICE);

    // 결제 승인
    const approveResult = await billingService.approvePayment(paymentId, approveToken);

    if (approveResult.data.paymentStatus !== 'SUCCESS') {
      return NextResponse.json(
        { error: 'Payment approval failed', data: approveResult.data },
        { status: 400 }
      );
    }

    // 메타데이터에서 엔티티 정보 추출
    // TODO: paymentId로 결제 정보 조회하여 customData 추출
    // 임시로 approveResult에서 추출 (실제로는 결제 요청 시 저장한 정보 사용)
    const adminClient = createAdminSupabaseClient();

    // payment_logs에서 결제 정보 조회 (메타데이터 확인)
    const { data: paymentLog } = await adminClient
      .from('payment_logs')
      .select('entity_id, entity_type, metadata')
      .eq('provider_payment_id', paymentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (paymentLog) {
      const metadata = paymentLog.metadata as any;
      const planId = metadata?.plan_id;

      if (planId) {
        // 구독 기간 계산
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1); // TODO: 플랜의 interval에 따라 계산

        // entity_subscriptions 업데이트
        await adminClient
          .from('entity_subscriptions')
          .upsert(
            {
              entity_id: paymentLog.entity_id,
              entity_type: paymentLog.entity_type,
              plan_id: planId,
              status: SUBSCRIPTION_STATUS.ACTIVE,
              current_period_end: periodEnd.toISOString(),
              payment_provider_subscription_id: paymentId,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'entity_id,entity_type',
            }
          );

        // payment_logs 업데이트 (승인 완료 표시)
        await adminClient
          .from('payment_logs')
          .update({
            status: PAYMENT_STATUS.SUCCESS,
            metadata: {
              ...metadata,
              approved_at: approveResult.data.approvedAt,
              payment_status: 'SUCCESS',
            },
          })
          .eq('provider_payment_id', paymentId);
      }
    }

    return NextResponse.json({
      success: true,
      data: approveResult.data,
    });
  } catch (error: any) {
    console.error('Payment approval error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

