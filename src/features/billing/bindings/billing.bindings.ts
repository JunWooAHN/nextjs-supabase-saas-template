/**
 * 결제 서비스 바인딩
 * DI 컨테이너에 결제 관련 서비스를 바인딩합니다.
 */

import { Container } from 'inversify';
import { BILLING_SERVICE, SUBSCRIPTION_SERVICE } from '@/lib/di/symbols';
import { BillingService } from '../services/billing.service';
import { SubscriptionService } from '../services/subscription.service';
import type { IBillingService } from '../services/billing.service.interface';
import type { ISubscriptionService } from '../services/subscription.service.interface';

/**
 * 결제 관련 서비스 바인딩 함수
 * 요청별 컨테이너에 서비스를 등록합니다.
 */
export function bindBillingServices(container: Container): void {
  container
    .bind<IBillingService>(BILLING_SERVICE)
    .to(BillingService)
    .inSingletonScope();

  container
    .bind<ISubscriptionService>(SUBSCRIPTION_SERVICE)
    .to(SubscriptionService)
    .inSingletonScope();
}

