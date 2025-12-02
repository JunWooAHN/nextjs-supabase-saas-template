# subscription_plans 테이블

**작성일**: 2025-11-18  
**기준 문서**: `docs/rules/5.1.md`

## 개요

구독 플랜 테이블. 조직/센터가 선택할 수 있는 구독 플랜을 정의합니다.

## 테이블 정의

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 예: "Basic", "Pro"
  interval SMALLINT NOT NULL CHECK (interval IN (1, 2)), -- 1: 월간, 2: 연간
  price_per_org INTEGER NOT NULL, -- 조직당 청구 금액 (원 단위)
  price_per_member INTEGER DEFAULT 0, -- 조직 멤버당 추가 청구 금액 (원 단위)
  active BOOLEAN DEFAULT true, -- 현재 판매 중인 플랜인지
  features JSONB DEFAULT '{}', -- 플랜별 기능 제한
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 컬럼 설명

- **id**: UUID (Primary Key) - 구독 플랜 고유 ID
- **name**: TEXT (NOT NULL, UNIQUE) - 플랜 이름 (예: "Basic", "Pro")
- **interval**: SMALLINT (NOT NULL) - 구독 주기
  - 1: MONTHLY (월간)
  - 2: YEARLY (연간)
- **price_per_org**: INTEGER (NOT NULL) - 조직당 청구 금액 (원 단위)
- **price_per_member**: INTEGER (기본값 0) - 조직 멤버당 추가 청구 금액 (원 단위)
- **active**: BOOLEAN (기본값 true) - 현재 판매 중인 플랜인지
- **features**: JSONB (기본값 '{}') - 플랜별 기능 제한
  - 예: `{ "max_employees": 50, "gps_tracking": true, "auto_approval": true }`
- **created_at**: TIMESTAMP WITH TIME ZONE - 생성 시간
- **updated_at**: TIMESTAMP WITH TIME ZONE - 수정 시간

## 인덱스

```sql
CREATE INDEX idx_subscription_plans_active ON subscription_plans(active) WHERE active = true;
CREATE INDEX idx_subscription_plans_name ON subscription_plans(name);
```

## RLS 정책

```sql
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- SELECT: 모든 인증된 사용자는 조회 가능 (플랜 선택용)
CREATE POLICY "subscription_plans_select" ON subscription_plans
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND active = true
  );

-- INSERT/UPDATE: 앱 매니저만 가능
CREATE POLICY "subscription_plans_modify" ON subscription_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.permissions & 1152921504606846976)::bigint > 0 -- IS_APP_MANAGER
    )
  );
```

## 관련 상수

- **구독 주기**: `lib/constants.ts`의 `SUBSCRIPTION_INTERVALS`

## 참고사항

- 플랜은 앱 매니저만 생성/수정 가능
- 활성 플랜만 사용자에게 표시
- 기능 제한은 JSONB로 유연하게 관리

