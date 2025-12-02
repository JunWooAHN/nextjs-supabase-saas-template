# 프로젝트 아키텍처 재검토 및 수정 계획

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태 요약

현재 프로젝트는 기본 Next.js + Supabase 템플릿 상태입니다. prove-geo-web-app v5.1 아키텍처 요구사항과 비교하여 **대부분의 핵심 구조가 누락**되어 있습니다.

## 1. 데이터베이스 스키마 (Database Schema)

### 1.1. 누락된 핵심 테이블 : 나중에 할 것

**현재 상태**: 기본 템플릿 스키마만 존재 (profiles, external_accounts, chat_messages, ai_requests)

**필요한 작업**:
- [ ] `organizations` 테이블 생성 (조직/테넌트)
- [ ] `centers` 테이블 생성 (센터)
- [ ] `memberships` 테이블 생성 (핵심 멤버십 테이블 - user_id, entity_id, entity_type, permissions)
- [ ] `center_org_relationships` 테이블 생성 (N:M 센터-조직 관계)
- [ ] `location_proofs` 테이블 생성 (위치 증빙 - v4.2 핵심)
- [ ] `subscription_plans` 테이블 생성 (구독 플랜 - v5.0)
- [ ] `entity_subscriptions` 테이블 생성 (엔티티별 구독 상태 - v5.0 핵심)
- [ ] `payment_logs` 테이블 생성 (결제 로그 - v5.0)

### 1.2. 기존 테이블 수정

**profiles 테이블**:
- [ ] `permissions` 컬럼 추가 (bigint, 기본값 0) - IS_APP_MANAGER 비트 체크용

### 1.3. RLS 정책 (Row Level Security)

**현재 상태**: 기본 템플릿 RLS만 존재

**필요한 작업**:
- [ ] `memberships` 테이블 RLS 정책 생성 (권한 기반 접근 제어)
- [ ] `organizations` 테이블 RLS 정책 생성
- [ ] `centers` 테이블 RLS 정책 생성
- [ ] `location_proofs` 테이블 RLS 정책 생성 (복잡한 권한 체크: 본인/조직 관리자/센터 관리자)
- [ ] `entity_subscriptions` 테이블 RLS 정책 생성 (OWNER/MANAGER만 조회 가능)
- [ ] `center_org_relationships` 테이블 RLS 정책 생성
- [ ] RLS 성능 최적화 적용 (인덱스, select 래핑, 역할 지정)

### 1.4. 인덱스 및 성능 최적화

- [ ] `memberships` 테이블 인덱스 생성 (user_id, entity_id, entity_type)
- [ ] `location_proofs` 테이블 인덱스 생성 (user_id, entity_id, entity_type, created_at)
- [ ] `entity_subscriptions` 테이블 인덱스 생성 (entity_id, entity_type, status)
- [ ] `center_org_relationships` 테이블 인덱스 생성 (center_id, organization_id)

## 2. 권한 시스템 (Permission System)

### 2.1. 상수 정의 파일

**현재 상태**: 없음

**필요한 작업**:
- [ ] `lib/constants.ts` 생성
  - ENTITY_TYPES (ORGANIZATION: 1, CENTER: 2)
  - PROOF_CATEGORIES (CHECK_IN: 1, CHECK_OUT: 2, GENERAL: 3)
  - PROOF_METHODS (GPS: 1, QR: 2, INSTANT_QR: 3, SYSTEM: 4)
  - SUBSCRIPTION_INTERVALS (MONTHLY: 1, YEARLY: 2)
  - SUBSCRIPTION_STATUS (ACTIVE: 1, PAST_DUE: 2, SUSPENDED: 3, CANCELED: 4)

- [ ] `lib/permissions.ts` 생성
  - PERMISSIONS 객체 (BigInt bitwise 권한)
    - 조직 권한: ORG_VIEW, ORG_EDIT_SETTINGS, ORG_MANAGE_MEMBERS, ORG_VIEW_PROJECTS, ORG_EDIT_PROJECTS
    - 센터 권한: CENTER_VIEW, CENTER_EDIT_SETTINGS, CENTER_MANAGE_ORGS, CENTER_IS_LAW_AGENCY
    - 앱 매니저: IS_APP_MANAGER
  - ROLES 객체 (역할별 권한 프리셋)
    - 조직 역할: ORG_MEMBER, ORG_MANAGER, ORG_OWNER
    - 센터 역할: CENTER_STAFF, CENTER_MANAGER, CENTER_OWNER, CENTER_LAW_AGENCY
    - 앱 매니저: APP_MANAGER

## 3. 3-Tier 아키텍처 구현

### 3.1. Tier 1 (일반 사용자) - 클라이언트 직접 접근

**현재 상태**: `lib/supabase/client.ts` 존재 ✅

**필요한 작업**:
- [ ] Tier 1 사용 예시 구현 확인 (위치 증빙 생성 등)
- [ ] RLS 정책이 Tier 1 사용을 올바르게 보호하는지 검증

### 3.2. Tier 2 (SaaS 관리자) - tRPC

**현재 상태**: 완전히 누락 ❌

**필요한 작업**:
- [ ] tRPC 패키지 설치 (`@trpc/server`, `@trpc/client`, `@trpc/react-query`, `@trpc/next`, `@tanstack/react-query`)
- [ ] `lib/trpc/server.ts` 생성
  - `createTRPCContext()` 함수 (Supabase 서버 클라이언트, 사용자 세션)
  - `protectedProcedure` 정의
  - `publicProcedure` 정의
- [ ] `lib/trpc/client.ts` 생성
  - 클라이언트 컴포넌트용 tRPC 클라이언트
  - `TRPCProvider` 컴포넌트
- [ ] `lib/trpc/router.ts` 생성
  - `appRouter` 정의
  - 라우터 모듈화 (membership, billing, relationship, proof)
- [ ] `app/api/trpc/[trpc]/route.ts` 생성
  - tRPC API 핸들러
- [ ] `lib/trpc/routers/membership.ts` 생성
  - `inviteUserToEntity` (Mutation)
  - `updateUserPermissions` (Mutation)
  - `removeUserPermission` (Mutation)
  - `removeUserFromEntity` (Mutation)
- [ ] `lib/trpc/routers/billing.ts` 생성
  - `createCheckoutSession` (Mutation)
  - `createBillingPortalSession` (Mutation)
  - `getSubscriptionForEntity` (Query)
- [ ] `lib/trpc/routers/relationship.ts` 생성
  - `linkCenterToOrg` (Mutation)
  - `unlinkCenterFromOrg` (Mutation)
- [ ] `lib/trpc/routers/proof.ts` 생성
  - `getLocationProofsForEntity` (Query)

### 3.3. Tier 3 (앱 매니저) - Server Actions

**현재 상태**: `lib/supabase/server.ts`에 `createAdminSupabaseClient()` 존재 ✅

**필요한 작업**:
- [ ] `lib/supabase/admin.ts` 분리 (선택적 - 현재 server.ts에 포함되어 있음)
- [ ] `app/actions/admin.ts` 생성
  - `getAllEntitiesForAppManager()` (Server Action)
  - 앱 매니저 권한 검증 로직
- [ ] 앱 매니저 전용 페이지 구현

## 4. 라우트 구조 (Route Structure)

### 4.1. 누락된 라우트 그룹

**현재 상태**: `(marketing)`, `(user)` 존재 (✅ `(protected)` 제거 완료 - 역할별 라우트 그룹으로 대체)

**필요한 작업**:
- [ ] `(user)` 라우트 그룹 생성 (일반 사용자)
- [ ] `(org_management)` 라우트 그룹 생성 (조직 관리)
  - `(org-management)/[orgId]/billing/page.tsx` 포함 (빌링 관리)
- [ ] `(center_management)` 라우트 그룹 생성 (센터 관리)
  - `(center-management)/[centerId]/billing/page.tsx` 포함 (빌링 관리)
- [ ] `(law_agency)` 라우트 그룹 생성 (법정 대리인)
- [ ] `(app_manager)` 라우트 그룹 생성 (앱 매니저)
- ❌ `(billing)` 라우트 그룹 불필요 (엔티티별 라우트에 포함)

### 4.2. API 라우트

**필요한 작업**:
- [ ] `app/api/trpc/[trpc]/route.ts` 생성 (tRPC 핸들러)
- [ ] `app/api/webhooks/payment/route.ts` 생성
  - Stripe/TossPayments 웹훅 이벤트 수신
  - SERVICE_ROLE_KEY 사용 (RLS 우회)
  - `entity_subscriptions` 업데이트
  - `payment_logs` 기록

## 5. Middleware 개선

### 5.1. 역할 기반 접근 제어

**현재 상태**: 기본 인증만 존재

**필요한 작업**:
- [ ] `/app-manager` 경로 접근 제어 (IS_APP_MANAGER 비트 체크)
- [ ] `/center-management` 경로 접근 제어 (CENTER_VIEW 비트 체크)
- [ ] `/law-agency` 경로 접근 제어 (CENTER_IS_LAW_AGENCY 비트 체크)
- [ ] 역할 기반 접근 제어 로직 구현 (DB 쿼리)

### 5.2. 구독 상태 기반 기능 정지

**필요한 작업**:
- [ ] 구독 상태 체크 로직 추가
- [ ] `entity_subscriptions` 테이블 조회
- [ ] `status !== ACTIVE`인 경우 엔티티별 billing 페이지로 리디렉션
  - 조직: `/org-management/[orgId]/billing`
  - 센터: `/center-management/[centerId]/billing`
- [ ] 핵심 기능 라우트 그룹에 적용 (`(user)`, `(org_management)`, `(center_management)`)

## 6. 컴포넌트 (Components)

### 6.1. 핵심 컴포넌트 구현

**필요한 작업**:
- [ ] `EntitySwitcher` 컴포넌트 (조직/센터 전환 드롭다운)
- [ ] `MemberInviteForm` 컴포넌트 (Tier 2: tRPC Mutation 사용)
- [ ] `CreateProofButton` 컴포넌트 (Tier 1: 클라이언트 직접 접근)
- [ ] `ProofsDataTable` 컴포넌트 (entityId, entityType 기반 증빙 목록)
- [ ] `PlanSelector` 컴포넌트 (Tier 2: tRPC Query/Mutation 사용)
- [ ] `ManageSubscriptionButton` 컴포넌트 (Tier 2: tRPC Mutation 사용)
- [ ] `ClientListTable` 컴포넌트 (법정 대리인용)
- [ ] `AppManagerTable` 컴포넌트 (앱 매니저용)

### 6.2. 기존 컴포넌트 수정

**필요한 작업**:
- [ ] `SidebarNav` 컴포넌트 수정 (사용자 권한에 따른 메뉴 표시)
- [ ] `UserProfileButton` 컴포넌트 확인/수정

## 7. 데이터 조회 함수 (Data Access Functions)

### 7.1. 서버 컴포넌트용 데이터 조회

**필요한 작업**:
- [ ] `app/data/read.ts` 생성
  - `getEntitiesForUser(userId)` - 사용자가 속한 조직/센터 목록
  - `getMyLocationProofs()` - 내 위치 증빙 조회
  - `getProjectsForOrg(orgId)` - 조직별 프로젝트 조회
  - `getOrgsForCenter(centerId)` - 센터별 조직 목록

## 8. 인증 및 세션 관리

### 8.1. 인증 플로우 개선

**현재 상태**: 기본 템플릿 인증만 존재

**필요한 작업**:
- [ ] 클라이언트 사이드 인증 패턴 확인 (Supabase 권장 방식)
- [ ] 회원가입 후 초기화 로직 (tRPC Mutation 연동)
- [ ] OAuth 플로우 확인 (Google, Apple)

## 9. 타입 시스템

### 9.1. 데이터베이스 타입 생성

**필요한 작업**:
- [ ] Supabase 타입 자동 생성 설정
- [ ] `types/supabase.ts` 생성 (또는 `lib/types.ts`)
- [ ] 모든 DB 쿼리에서 타입 사용 확인

## 10. 테스트 및 검증

### 10.1. 아키텍처 준수 검증

**필요한 작업**:
- [ ] 3-Tier 아키텍처 준수 확인
  - Tier 1: 클라이언트 직접 접근만 사용
  - Tier 2: tRPC만 사용
  - Tier 3: Server Actions + SERVICE_ROLE_KEY만 사용
- [ ] RLS 정책 테스트
- [ ] 권한 시스템 테스트 (비트 연산)
- [ ] 구독 상태 체크 테스트

## 우선순위 제안

### Phase 1: 핵심 인프라
1. 데이터베이스 스키마 생성 (모든 테이블)
2. 권한 시스템 구현 (constants.ts, permissions.ts)
3. RLS 정책 생성 및 최적화

### Phase 2: 3-Tier 아키텍처 구현
1. tRPC 설정 및 기본 구조
2. Tier 2 라우터 구현 (membership, billing 등)
3. Tier 3 Server Actions 구현

### Phase 3: 라우트 및 컴포넌트
1. 라우트 그룹 생성
2. Middleware 개선 (역할 기반 접근 제어, 구독 상태 체크)
3. 핵심 컴포넌트 구현

### Phase 4: 통합 및 테스트
1. 전체 플로우 테스트
2. 아키텍처 준수 검증
3. 성능 최적화 확인

## 참고사항

- 모든 작업은 `docs/rules/00_supabase_architecture_1.5.md`의 원칙을 준수해야 합니다.
- 특히 **3-Tier 아키텍처 모델**을 엄격히 준수해야 합니다.
- SERVICE_ROLE_KEY는 **오직 Tier 3에서만** 사용해야 합니다.
- RLS 정책은 **모든 테이블에 필수**입니다.
- 소프트 삭제 패턴을 사용해야 합니다 (물리적 DELETE 금지).

