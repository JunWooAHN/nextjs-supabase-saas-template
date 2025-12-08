/**
 * 결제 웹훅 핸들러
 * Tier 3: SERVICE_ROLE_KEY 사용 (RLS 우회)
 * 
 * 네이버 페이 웹훅 이벤트를 처리하여:
 * 1. entity_subscriptions 테이블 업데이트
 * 2. payment_logs 테이블에 로그 기록
 * 
 * ⚠️ 중요: 이 핸들러는 service_role 키를 사용하므로 RLS를 우회합니다.
 * 웹훅 시그니처 검증을 반드시 수행해야 합니다.
 * 
 * @see https://docs.pay.naver.com/docs/common/online-payment-overview
 */

import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * 네이버 페이 웹훅 시그니처 검증
 */
function verifyNaverPaySignature(
  body: string,
  signature: string,
  secretKey: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secretKey);
    const calculatedSignature = hmac.update(body).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * 결제 성공 처리 (네이버 페이)
 */
async function handlePaymentSucceeded(event: any) {
  const adminClient = createAdminSupabaseClient();
  const payment = event.data;

  // 메타데이터에서 엔티티 정보 추출
  let customData: any = {};
  try {
    customData = JSON.parse(payment.customData || '{}');
  } catch (e) {
    console.error('Failed to parse customData:', e);
  }

  const entityId = customData.entity_id || payment.entityId;
  const entityType = parseInt(customData.entity_type || payment.entityType || '1');
  const planId = customData.plan_id || payment.planId;

  if (!entityId || !planId) {
    console.error('Missing required metadata:', { entityId, planId });
    return;
  }

  // 구독 기간 계산 (플랜 정보에서 interval 확인 필요)
  const periodEnd = new Date();
  // TODO: 플랜의 interval에 따라 기간 계산 (월간/연간)
  periodEnd.setMonth(periodEnd.getMonth() + 1); // 임시: 1개월

  // 1. entity_subscriptions 업데이트 (UPSERT)
  const { error: subError } = await adminClient
    .from('entity_subscriptions')
    .upsert(
      {
        entity_id: entityId,
        entity_type: entityType,
        plan_id: planId,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        current_period_end: periodEnd.toISOString(),
        payment_provider_customer_id: payment.customerId || null,
        payment_provider_subscription_id: payment.paymentId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'entity_id,entity_type',
      }
    );

  if (subError) {
    console.error('Failed to update subscription:', subError);
    throw subError;
  }

  // 2. payment_logs 기록
  const { error: logError } = await adminClient.from('payment_logs').insert({
    entity_id: entityId,
    entity_type: entityType,
    amount: payment.totalAmount || payment.amount,
    status: PAYMENT_STATUS.SUCCESS,
    provider_payment_id: payment.paymentId,
    metadata: {
      plan_id: planId,
      order_id: payment.orderId,
      approved_at: payment.approvedAt || new Date().toISOString(),
      payment_method: payment.paymentMethod,
      currency: payment.currency || 'KRW',
    },
  });

  if (logError) {
    console.error('Failed to create payment log:', logError);
    throw logError;
  }

  console.log('Payment succeeded:', {
    entityId,
    entityType,
    amount: payment.totalAmount,
    paymentId: payment.paymentId,
  });
}

/**
 * 결제 실패 처리 (네이버 페이)
 */
async function handlePaymentFailed(event: any) {
  const adminClient = createAdminSupabaseClient();
  const payment = event.data;

  let customData: any = {};
  try {
    customData = JSON.parse(payment.customData || '{}');
  } catch (e) {
    console.error('Failed to parse customData:', e);
  }

  const entityId = customData.entity_id || payment.entityId;
  const entityType = parseInt(customData.entity_type || payment.entityType || '1');

  if (!entityId) {
    console.error('Missing entity_id in metadata');
    return;
  }

  // 구독 상태를 PAST_DUE 또는 SUSPENDED로 변경
  // 네이버 페이의 재시도 횟수 등을 확인하여 결정
  const attemptCount = payment.attemptCount || 0;
  const status =
    attemptCount >= 3 ? SUBSCRIPTION_STATUS.SUSPENDED : SUBSCRIPTION_STATUS.PAST_DUE;

  // 1. entity_subscriptions 업데이트
  const { error: subError } = await adminClient
    .from('entity_subscriptions')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('entity_id', entityId)
    .eq('entity_type', entityType);

  if (subError) {
    console.error('Failed to update subscription:', subError);
    throw subError;
  }

  // 2. payment_logs 기록
  const { error: logError } = await adminClient.from('payment_logs').insert({
    entity_id: entityId,
    entity_type: entityType,
    amount: payment.totalAmount || payment.amount,
    status: PAYMENT_STATUS.FAILED,
    provider_payment_id: payment.paymentId,
    metadata: {
      attempt_count: attemptCount,
      failure_reason: payment.failureReason || payment.message,
      order_id: payment.orderId,
    },
  });

  if (logError) {
    console.error('Failed to create payment log:', logError);
    throw logError;
  }

  console.log('Payment failed:', { entityId, entityType, status });
}

/**
 * 결제 취소 처리 (네이버 페이)
 */
async function handlePaymentCanceled(event: any) {
  const adminClient = createAdminSupabaseClient();
  const payment = event.data;

  let customData: any = {};
  try {
    customData = JSON.parse(payment.customData || '{}');
  } catch (e) {
    console.error('Failed to parse customData:', e);
  }

  const entityId = customData.entity_id || payment.entityId;
  const entityType = parseInt(customData.entity_type || payment.entityType || '1');

  if (!entityId) {
    console.error('Missing entity_id in metadata');
    return;
  }

  // entity_subscriptions를 CANCELED로 업데이트
  const { error } = await adminClient
    .from('entity_subscriptions')
    .update({
      status: SUBSCRIPTION_STATUS.CANCELED,
      updated_at: new Date().toISOString(),
    })
    .eq('entity_id', entityId)
    .eq('entity_type', entityType);

  if (error) {
    console.error('Failed to cancel subscription:', error);
    throw error;
  }

  // payment_logs에 취소 기록
  await adminClient.from('payment_logs').insert({
    entity_id: entityId,
    entity_type: entityType,
    amount: payment.totalAmount || payment.amount,
    status: PAYMENT_STATUS.FAILED, // 취소는 FAILED로 기록
    provider_payment_id: payment.paymentId,
    metadata: {
      cancel_reason: payment.cancelReason,
      canceled_at: payment.canceledAt || new Date().toISOString(),
    },
  });

  console.log('Payment canceled:', { entityId, entityType });
}

/**
 * POST 핸들러: 네이버 페이 웹훅 이벤트 처리
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-naver-signature');

    // 웹훅 시그니처 검증
    const webhookSecret = process.env.NAVER_PAY_WEBHOOK_SECRET || '';
    if (webhookSecret && signature) {
      const isValid = verifyNaverPaySignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error('Webhook signature verification failed');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else if (process.env.NODE_ENV === 'production') {
      // 프로덕션 환경에서는 시그니처 검증 필수
      return NextResponse.json(
        { error: 'Missing webhook secret or signature' },
        { status: 400 }
      );
    }

    // 이벤트 파싱
    let event: any;
    try {
      event = JSON.parse(body);
    } catch (err: any) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // 네이버 페이 이벤트 타입별 처리
    // 네이버 페이의 실제 이벤트 타입은 문서 확인 필요
    switch (event.eventType || event.type) {
      case 'PAYMENT_SUCCESS':
      case 'payment.succeeded':
        await handlePaymentSucceeded(event);
        break;

      case 'PAYMENT_FAILED':
      case 'payment.failed':
        await handlePaymentFailed(event);
        break;

      case 'PAYMENT_CANCELED':
      case 'payment.canceled':
        await handlePaymentCanceled(event);
        break;

      default:
        console.log(`Unhandled event type: ${event.eventType || event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

