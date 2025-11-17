# Todo 01: 데이터베이스 스키마 (Database Schema)

**작성일**: 2025-11-17  
**마지막 업데이트**: 2025-11-17  
**마이그레이션 버전**: 00_initial_schema.sql (기본 템플릿)  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`
- `docs/rules/251117_permission_system_improvement.md` (권한 시스템 개선안)
- `docs/todo-hypothesis/251117_schema_migration_strategy.md` (마이그레이션 전략)

## ⚠️ 중요: 마이그레이션 우선 원칙

> **이 문서는 참고용입니다. 실제 스키마는 `supabase/migrations/` 디렉토리의 마이그레이션 파일을 참조하세요.**

**스키마 변경 프로세스:**
1. 마이그레이션 파일 작성 (`supabase/migrations/`)
2. 마이그레이션 적용 및 테스트
3. 이 문서 업데이트 (변경 사항 반영)

자세한 내용은 [마이그레이션 전략 문서](./251117_schema_migration_strategy.md)를 참조하세요.

## 현재 상태

기본 템플릿 스키마만 존재 (profiles, external_accounts, chat_messages, ai_requests)

**마이그레이션 파일:**
- `00_initial_schema.sql` - 기본 템플릿 스키마
- `01_rls_setting_251116.sql` - RLS 정책 (기존)

## 작업 목표

prove-geo-web-app v5.1 아키텍처에 필요한 모든 데이터베이스 테이블, RLS 정책, 인덱스를 생성합니다.

## 작업 항목

### 1.1. 누락된 핵심 테이블 생성

- [ ] `organizations` 테이블 생성 (조직/테넌트)
  - id: uuid (Primary Key, gen_random_uuid())
  - name: text
  - created_at: timestamp

- [ ] `centers` 테이블 생성 (센터)
  - id: uuid (Primary Key, gen_random_uuid())
  - name: text
  - created_at: timestamp

- [ ] `memberships` 테이블 생성 (핵심 멤버십 테이블)
  - user_id: uuid (profiles.id 참조)
  - entity_id: uuid (organizations.id 또는 centers.id 참조)
  - entity_type: smallint (1=ORG, 2=CENTER)
  - permissions: bigint (기본값 0)
    - **권한 비트 정의**: `docs/rules/251117_permission_system_improvement.md` 참조
    - ORG_OWNER: 32 (1n << 5n) - 명시적 OWNER 플래그
    - CENTER_OWNER: 16384 (1n << 14n) - 명시적 OWNER 플래그
  - status: text (기본값 'active') - 소프트 삭제용
  - deleted_at: timestamptz (NULL) - 소프트 삭제용
  - Primary Key: (user_id, entity_id)
  - **마이그레이션**: `02_add_core_tables_251117.sql` (예정)

- [ ] `center_org_relationships` 테이블 생성 (N:M 센터-조직 관계)
  - center_id: uuid (centers.id 참조)
  - organization_id: uuid (organizations.id 참조)
  - Primary Key: (center_id, organization_id)

- [ ] `location_proofs` 테이블 생성 (위치 증빙 - v4.2 핵심)
  - id: uuid (Primary Key, gen_random_uuid())
  - user_id: uuid (profiles.id 참조)
  - entity_id: uuid (organizations.id 또는 centers.id 참조)
  - entity_type: smallint (1: ORGANIZATION, 2: CENTER)
  - proof_category: smallint (1: 출근, 2: 퇴근, 3: 일반)
  - proof_method: smallint (1: GPS, 2: QR, 3: INSTANT_QR, 4: SYSTEM)
  - location: jsonb (예: { "latitude": 37.123, "longitude": 127.123, "accuracy": 15.0 })
  - created_at: timestamp with time zone (기본값 now())

- [ ] `subscription_plans` 테이블 생성 (구독 플랜 - v5.0)
  - id: uuid (Primary Key, gen_random_uuid())
  - name: text (예: "Basic", "Pro")
  - interval: smallint (1=월간, 2=연간)
  - price_per_org: integer (조직당 청구 금액, 원 단위)
  - price_per_member: integer (조직 멤버당 추가 청구 금액, 원 단위)
  - active: boolean (현재 판매 중인 플랜인지)

- [ ] `entity_subscriptions` 테이블 생성 (엔티티별 구독 상태 - v5.0 핵심)
  - entity_id: uuid (Primary Key. organizations.id 또는 centers.id 참조)
  - entity_type: smallint (1=ORG, 2=CENTER)
  - plan_id: uuid (subscription_plans.id 참조)
  - status: smallint (1=Active, 2=PastDue, 3=Suspended, 4=Canceled)
  - current_period_end: timestamp with time zone (현재 결제된 기간의 종료일)
  - payment_provider_customer_id: text (예: Stripe cus_...)
  - payment_provider_subscription_id: text (예: Stripe sub_...)
  - updated_at: timestamp

- [ ] `payment_logs` 테이블 생성 (결제 로그 - v5.0)
  - id: uuid (Primary Key)
  - entity_id: uuid (결제 주체 엔티티)
  - amount: integer (결제 금액)
  - status: smallint (1=Success, 2=Failed)
  - provider_payment_id: text (예: Stripe pi_... 또는 in_...)
  - created_at: timestamp with time zone (기본값 now())

### 1.2. 기존 테이블 수정

- [ ] `profiles` 테이블에 `permissions` 컬럼 추가
  - permissions: bigint (기본값 0) - IS_APP_MANAGER 비트 체크용
  - IS_APP_MANAGER: 1n << 60n (권한 시스템 개선안 참조)
  - **마이그레이션**: `02_add_core_tables_251117.sql` (예정)

- [ ] 모든 테이블에 소프트 삭제 컬럼 추가 (선택적)
  - status: text (기본값 'active')
  - deleted_at: timestamptz (NULL)
  - **마이그레이션**: `03_add_soft_delete_251118.sql` (예정)

### 1.3. RLS 정책 (Row Level Security) 생성

- [ ] `memberships` 테이블 RLS 정책 생성
  - 권한 기반 접근 제어
  - 사용자는 자신의 멤버십만 조회 가능
  - 관리자는 해당 엔티티의 멤버십 조회/수정 가능

- [ ] `organizations` 테이블 RLS 정책 생성
  - 멤버는 자신이 속한 조직만 조회 가능
  - 관리자는 조직 설정 수정 가능

- [ ] `centers` 테이블 RLS 정책 생성
  - 멤버는 자신이 속한 센터만 조회 가능
  - 관리자는 센터 설정 수정 가능

- [ ] `location_proofs` 테이블 RLS 정책 생성
  - SELECT: 복잡한 권한 체크
    - 본인이 생성한 증빙
    - 증빙이 조직(type=1) 소속이고 내가 그 조직의 관리자인 경우
    - 증빙이 센터(type=2) 소속이고 내가 그 센터의 관리자인 경우
    - 증빙이 조직(type=1) 소속이고 내가 그 조직을 관리하는 센터의 관리자인 경우
  - INSERT: 본인의 증빙만 삽입 가능 (user_id = auth.uid())

- [ ] `entity_subscriptions` 테이블 RLS 정책 생성
  - SELECT: OWNER/MANAGER만 조회 가능
  - INSERT/UPDATE: RLS가 아닌 service_role 키를 사용하는 웹훅에서만 수행

- [ ] `center_org_relationships` 테이블 RLS 정책 생성
  - 센터 관리자는 자신의 센터가 관리하는 조직 관계만 조회 가능

- [ ] RLS 성능 최적화 적용
  - 인덱스 추가 (RLS 정책에서 사용하는 컬럼)
  - `auth.uid()`를 `(select auth.uid())`로 감싸기
  - 역할 명시 (`TO authenticated`)
  - Security Definer 함수 사용 (복잡한 JOIN이 필요한 경우)

### 1.4. 인덱스 및 성능 최적화

- [ ] `memberships` 테이블 인덱스 생성
  - idx_memberships_user_id (user_id)
  - idx_memberships_entity_id (entity_id, entity_type)
  - idx_memberships_user_entity (user_id, entity_id, entity_type)

- [ ] `location_proofs` 테이블 인덱스 생성
  - idx_location_proofs_user_id (user_id)
  - idx_location_proofs_entity (entity_id, entity_type)
  - idx_location_proofs_created_at (created_at DESC)
  - idx_location_proofs_user_created (user_id, created_at DESC)

- [ ] `entity_subscriptions` 테이블 인덱스 생성
  - idx_entity_subscriptions_entity (entity_id, entity_type)
  - idx_entity_subscriptions_status (status)
  - idx_entity_subscriptions_entity_status (entity_id, entity_type, status)

- [ ] `center_org_relationships` 테이블 인덱스 생성
  - idx_center_org_center_id (center_id)
  - idx_center_org_org_id (organization_id)
  - idx_center_org_both (center_id, organization_id)

## 참고사항

### 스키마 변경 관리

- **마이그레이션 우선**: 모든 스키마 변경은 마이그레이션 파일로 관리
- **문서 동기화**: 마이그레이션 적용 후 이 문서 업데이트
- **권한 상수 동기화**: `lib/permissions.ts`의 `PERMISSIONS_SQL`과 마이그레이션 파일 동기화

### RLS 정책

- 모든 테이블에 RLS를 활성화해야 합니다 (`ALTER TABLE table_name ENABLE ROW LEVEL SECURITY`)
- RLS 정책은 `docs/rules/00_supabase_architecture_1.5.md`의 성능 최적화 가이드를 따라야 합니다
- 권한 체크 시 `PERMISSIONS_SQL` 상수 사용 (매직 넘버 금지)

### 소프트 삭제

- 소프트 삭제 패턴을 사용해야 합니다 (물리적 DELETE 금지)
- `status` 컬럼과 `deleted_at` 컬럼 사용
- 인덱스에 `WHERE status != 'deleted'` 조건 추가

### 인덱스

- 모든 외래키에 인덱스를 생성해야 합니다
- RLS 정책에서 사용하는 컬럼에 인덱스 추가
- 소프트 삭제 필터링을 위한 부분 인덱스 사용

## 마이그레이션 계획

### 예정된 마이그레이션

1. **`02_add_core_tables_251117.sql`** (우선순위: 높음)
   - organizations, centers, memberships 테이블 생성
   - profiles.permissions 컬럼 추가
   - 기본 RLS 정책 생성

2. **`03_add_permissions_251117.sql`** (우선순위: 높음)
   - 기존 OWNER 권한을 명시적으로 설정
   - 권한 시스템 개선안 반영

3. **`04_add_soft_delete_251118.sql`** (우선순위: 중간)
   - 모든 테이블에 소프트 삭제 컬럼 추가
   - RLS 정책 업데이트

4. **`05_add_location_proofs_251118.sql`** (우선순위: 중간)
   - location_proofs 테이블 생성
   - 복잡한 RLS 정책 구현

5. **`06_add_subscription_251119.sql`** (우선순위: 낮음)
   - subscription_plans, entity_subscriptions, payment_logs 테이블 생성

## 권한 시스템 동기화

**권한 상수 정의 위치:**
- TypeScript: `lib/permissions.ts` (예정)
- SQL 주석: 마이그레이션 파일에 `PERMISSIONS_SQL` 값 명시

**동기화 체크리스트:**
- [ ] `PERMISSIONS` (BigInt)와 `PERMISSIONS_SQL` (Number) 값 일치 확인
- [ ] 마이그레이션 파일 주석에 권한 상수 참조 추가
- [ ] RLS 정책에서 매직 넘버 대신 주석으로 상수 참조

