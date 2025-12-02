# payment_logs 테이블

**작성일**: 2025-11-18  
**기준 문서**: `docs/rules/5.1.md`

## 개요

결제 로그 테이블. 모든 결제 시도를 기록하여 감사 추적을 제공합니다.

## 테이블 정의

```sql
CREATE TABLE payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL, -- organizations.id 또는 centers.id 참조
  entity_type SMALLINT NOT NULL CHECK (entity_type IN (1, 2)), -- 1=ORG, 2=CENTER
  amount INTEGER NOT NULL CHECK (amount > 0), -- 결제 금액 (원 단위)
  status SMALLINT NOT NULL CHECK (status IN (1, 2)), -- 1: Success, 2: Failed
  provider_payment_id TEXT, -- 예: Stripe pi_... 또는 in_...
  metadata JSONB DEFAULT '{}', -- 추가 메타데이터
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 컬럼 설명

- **id**: UUID (Primary Key) - 결제 로그 고유 ID
- **entity_id**: UUID (NOT NULL) - 엔티티 ID (`organizations.id` 또는 `centers.id`)
- **entity_type**: SMALLINT (NOT NULL) - 엔티티 타입 (1=ORGANIZATION, 2=CENTER)
- **amount**: INTEGER (NOT NULL) - 결제 금액 (원 단위, 양수만 가능)
- **status**: SMALLINT (NOT NULL) - 결제 상태
  - 1: Success (성공)
  - 2: Failed (실패)
- **provider_payment_id**: TEXT - 결제 제공자 결제 ID (예: Stripe `pi_...` 또는 `in_...`)
- **metadata**: JSONB (기본값 '{}') - 추가 메타데이터
  - 예: `{ "plan_id": "...", "period_start": "...", "period_end": "..." }`
- **created_at**: TIMESTAMP WITH TIME ZONE - 생성 시간

## 인덱스

```sql
CREATE INDEX idx_payment_logs_entity ON payment_logs(entity_id, entity_type);
CREATE INDEX idx_payment_logs_status ON payment_logs(status);
CREATE INDEX idx_payment_logs_created_at ON payment_logs(created_at DESC);
CREATE INDEX idx_payment_logs_provider_id ON payment_logs(provider_payment_id) WHERE provider_payment_id IS NOT NULL;
```

## RLS 정책

```sql
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: OWNER 또는 MANAGER만 조회 가능
CREATE POLICY "payment_logs_select" ON payment_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.entity_id = payment_logs.entity_id
        AND m.entity_type = payment_logs.entity_type
        AND m.status = 'active'
        AND (
          (m.entity_type = 1 AND (m.permissions & 4)::bigint > 0) -- ORG_MANAGE_MEMBERS
          OR (m.entity_type = 2 AND (m.permissions & 4096)::bigint > 0) -- CENTER_MANAGE_ORGS
        )
    )
  );

-- INSERT: 웹훅에서만 수행 (service_role 키 사용)
-- (app/api/webhooks/payment/route.ts에서 처리)
```

## 관련 상수

- **엔티티 타입**: `lib/constants.ts`의 `ENTITY_TYPES`
- **결제 상태**: 추후 `lib/constants.ts`에 추가 필요
  - `PAYMENT_STATUS.SUCCESS = 1`
  - `PAYMENT_STATUS.FAILED = 2`

## 참고사항

- 모든 결제 시도는 로그로 기록되어야 함
- INSERT는 웹훅에서만 수행 (service_role 키 사용)
- 감사 추적을 위해 삭제 불가 (읽기 전용)

