# entity_subscriptions 테이블

**작성일**: 2025-11-18  
**기준 문서**: `docs/rules/5.1.md`, `docs/customer-journey/251118_user_journey_hypothesis.md`

## 개요

엔티티별 구독 상태 테이블. 조직/센터의 구독 상태를 관리하며, 구독 미가입 시 서비스 사용을 제한합니다.

## 테이블 정의

```sql
CREATE TABLE entity_subscriptions (
  entity_id UUID NOT NULL, -- organizations.id 또는 centers.id 참조
  entity_type SMALLINT NOT NULL CHECK (entity_type IN (1, 2)), -- 1=ORG, 2=CENTER
  plan_id UUID REFERENCES subscription_plans(id),
  status SMALLINT NOT NULL CHECK (status IN (1, 2, 3, 4)), -- 1: Active, 2: PastDue, 3: Suspended, 4: Canceled
  current_period_end TIMESTAMP WITH TIME ZONE, -- 현재 결제된 기간의 종료일
  payment_provider_customer_id TEXT, -- 예: Stripe cus_...
  payment_provider_subscription_id TEXT, -- 예: Stripe sub_...
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (entity_id, entity_type)
);
```

## 컬럼 설명

- **entity_id**: UUID (NOT NULL) - 엔티티 ID (`organizations.id` 또는 `centers.id`)
- **entity_type**: SMALLINT (NOT NULL) - 엔티티 타입 (1=ORGANIZATION, 2=CENTER)
- **plan_id**: UUID - 구독 플랜 ID (`subscription_plans.id` 참조)
- **status**: SMALLINT (NOT NULL) - 구독 상태
  - 1: ACTIVE (활성)
  - 2: PAST_DUE (연체)
  - 3: SUSPENDED (정지)
  - 4: CANCELED (취소)
- **current_period_end**: TIMESTAMP WITH TIME ZONE - 현재 결제된 기간의 종료일
- **payment_provider_customer_id**: TEXT - 결제 제공자 고객 ID (예: Stripe `cus_...`)
- **payment_provider_subscription_id**: TEXT - 결제 제공자 구독 ID (예: Stripe `sub_...`)
- **created_at**: TIMESTAMP WITH TIME ZONE - 생성 시간
- **updated_at**: TIMESTAMP WITH TIME ZONE - 수정 시간

## 인덱스

```sql
CREATE INDEX idx_entity_subscriptions_entity ON entity_subscriptions(entity_id, entity_type);
CREATE INDEX idx_entity_subscriptions_status ON entity_subscriptions(status);
CREATE INDEX idx_entity_subscriptions_entity_status ON entity_subscriptions(entity_id, entity_type, status);
CREATE INDEX idx_entity_subscriptions_period_end ON entity_subscriptions(current_period_end) WHERE status = 1;
```

## RLS 정책

```sql
ALTER TABLE entity_subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT: OWNER 또는 MANAGER만 조회 가능
CREATE POLICY "entity_subscriptions_select" ON entity_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.entity_id = entity_subscriptions.entity_id
        AND m.entity_type = entity_subscriptions.entity_type
        AND m.status = 'active'
        AND (
          (m.entity_type = 1 AND (m.permissions & 4)::bigint > 0) -- ORG_MANAGE_MEMBERS
          OR (m.entity_type = 2 AND (m.permissions & 4096)::bigint > 0) -- CENTER_MANAGE_ORGS
        )
    )
  );

-- INSERT/UPDATE: RLS가 아닌 service_role 키를 사용하는 웹훅에서만 수행
-- (app/api/webhooks/payment/route.ts에서 처리)
```

## 관련 상수

- **엔티티 타입**: `lib/constants.ts`의 `ENTITY_TYPES`
- **구독 상태**: `lib/constants.ts`의 `SUBSCRIPTION_STATUS`

## 참고사항

- 구독 상태가 `ACTIVE`가 아닌 경우 서비스 사용 제한 (시나리오 5, 6)
- INSERT/UPDATE는 웹훅에서만 수행 (service_role 키 사용)
- 구독 만료 시 자동으로 상태 변경 필요 (배치 작업)

