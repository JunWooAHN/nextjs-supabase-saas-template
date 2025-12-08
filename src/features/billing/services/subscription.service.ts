/**
 * 구독 서비스 구현체
 * DI를 통한 의존성 주입 패턴
 */

import { injectable, inject } from 'inversify';
import {
  ISubscriptionService,
  GetSubscriptionInput,
  GetPaymentLogsInput,
  UpdateSubscriptionInput,
} from './subscription.service.interface';
import { SUPABASE_CLIENT } from '@/lib/di/symbols';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionWithPlan, PaymentLog } from '../types/billing.types';

@injectable()
export class SubscriptionService implements ISubscriptionService {
  constructor(
    @inject(SUPABASE_CLIENT) private supabase: SupabaseClient
  ) {}

  /**
   * 엔티티의 구독 정보 조회 (플랜 정보 포함)
   */
  async getSubscription(input: GetSubscriptionInput): Promise<SubscriptionWithPlan | null> {
    const { data, error } = await this.supabase
      .from('entity_subscriptions')
      .select(`
        *,
        subscription_plans (
          id,
          name,
          interval,
          price_per_org,
          price_per_member,
          active,
          features,
          created_at,
          updated_at
        )
      `)
      .eq('entity_id', input.entityId)
      .eq('entity_type', input.entityType)
      .single();

    if (error) {
      // 구독 정보가 없는 경우 null 반환 (에러가 아닌 정상 상태)
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data as SubscriptionWithPlan;
  }

  /**
   * 결제 로그 목록 조회
   */
  async getPaymentLogs(input: GetPaymentLogsInput): Promise<PaymentLog[]> {
    const limit = input.limit || 50;

    const { data, error } = await this.supabase
      .from('payment_logs')
      .select('*')
      .eq('entity_id', input.entityId)
      .eq('entity_type', input.entityType)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data || []) as PaymentLog[];
  }

  /**
   * 구독 플랜 변경
   * TODO: Stripe 연동 후 구현 필요
   */
  async updateSubscription(input: UpdateSubscriptionInput): Promise<void> {
    // TODO: Stripe 구독 업데이트 로직 구현
    throw new Error('Not implemented: Stripe integration required');
  }

  /**
   * 구독 취소
   * TODO: Stripe 연동 후 구현 필요
   */
  async cancelSubscription(entityId: string, entityType: number): Promise<void> {
    // TODO: Stripe 구독 취소 로직 구현
    throw new Error('Not implemented: Stripe integration required');
  }
}

