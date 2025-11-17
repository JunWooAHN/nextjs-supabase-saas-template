# Todo 04: Tier 2 (SaaS 관리자) - tRPC 구현

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태

tRPC 관련 파일이 완전히 누락되어 있습니다. ❌

## 작업 목표

Tier 2 (SaaS 관리자)를 위한 tRPC 인프라를 구축하고, 모든 관리자 작업을 tRPC로 구현합니다.

## 작업 항목

### 4.1. tRPC 패키지 설치

- [ ] tRPC 패키지 설치
  - `@trpc/server`
  - `@trpc/client`
  - `@trpc/react-query`
  - `@trpc/next`
  - `@tanstack/react-query`
  - `zod` (이미 설치되어 있음)

### 4.2. tRPC 서버 설정

- [ ] `lib/trpc/server.ts` 생성
  - `createTRPCContext()` 함수 구현
    - Supabase 서버 클라이언트 생성 (`createServerSupabaseClient()`)
    - 사용자 세션 확인 (`supabase.auth.getUser()`)
    - Context 반환: `{ supabase, user }`
  - `initTRPC` 초기화
    - 에러 포맷터 설정 (Zod 에러 처리)
  - `publicProcedure` export
  - `protectedProcedure` export
    - 사용자 인증 확인
    - 인증되지 않은 경우 `UNAUTHORIZED` 에러
    - 타입이 `user`로 좁혀짐

### 4.3. tRPC 클라이언트 설정

- [ ] `lib/trpc/client.ts` 생성
  - `createTRPCReact<AppRouter>()` 생성
  - `TRPCProvider` 컴포넌트 구현
    - QueryClient 생성
    - tRPC 클라이언트 생성 (`httpBatchLink` 사용)
    - `trpc.Provider`와 `QueryClientProvider` 래핑

- [ ] `lib/trpc/server.ts`에 서버 컴포넌트용 클라이언트 추가
  - `createTRPCServerClient()` 함수 구현
    - `createTRPCProxyClient` 사용
    - `httpBatchLink` 사용
    - 쿠키를 헤더에 포함

### 4.4. tRPC 라우터 구조 생성

- [ ] `lib/trpc/router.ts` 생성
  - `appRouter` 정의
  - 라우터 모듈화 준비
    - `membership` 라우터
    - `billing` 라우터
    - `relationship` 라우터
    - `proof` 라우터

### 4.5. tRPC API 핸들러 생성

- [ ] `app/api/trpc/[trpc]/route.ts` 생성
  - `fetchRequestHandler` 사용
  - `appRouter` 연결
  - `createTRPCContext` 연결
  - GET, POST 핸들러 export

### 4.6. Membership 라우터 구현

- [ ] `lib/trpc/routers/membership.ts` 생성
  - `inviteUserToEntity` (Mutation)
    - 입력: `{ email: string, entityId: string, entityType: number, permissions: bigint }`
    - 권한 검증: 관리자 권한 확인
    - 사용자 조회 및 멤버십 생성
  - `updateUserPermissions` (Mutation)
    - 입력: `{ userId: string, entityId: string, entityType: number, permissions: bigint }`
    - 권한 검증: 관리자 권한 확인
    - 멤버십 권한 업데이트
  - `removeUserPermission` (Mutation)
    - 입력: `{ userId: string, entityId: string, entityType: number, permission: bigint }`
    - 권한 검증: 관리자 권한 확인
    - 특정 권한 제거
  - `removeUserFromEntity` (Mutation)
    - 입력: `{ userId: string, entityId: string, entityType: number }`
    - 권한 검증: 관리자 권한 확인
    - 멤버십 삭제 (소프트 삭제)

### 4.7. Billing 라우터 구현

- [ ] `lib/trpc/routers/billing.ts` 생성
  - `createCheckoutSession` (Mutation)
    - 입력: `{ entityId: string, entityType: number, planId: string }`
    - 권한 검증: OWNER/MANAGER 권한 확인
    - Stripe/TossPayments 체크아웃 세션 생성
    - 세션 URL 반환
  - `createBillingPortalSession` (Mutation)
    - 입력: `{ entityId: string, entityType: number }`
    - 권한 검증: OWNER/MANAGER 권한 확인
    - Stripe Portal 세션 생성
    - 포털 URL 반환
  - `getSubscriptionForEntity` (Query)
    - 입력: `{ entityId: string, entityType: number }`
    - 권한 검증: OWNER/MANAGER 권한 확인
    - `entity_subscriptions` 조회
    - 구독 상태 반환

### 4.8. Relationship 라우터 구현

- [ ] `lib/trpc/routers/relationship.ts` 생성
  - `linkCenterToOrg` (Mutation)
    - 입력: `{ centerId: string, organizationId: string }`
    - 권한 검증: 센터 관리자 권한 확인
    - `center_org_relationships`에 관계 추가
  - `unlinkCenterFromOrg` (Mutation)
    - 입력: `{ centerId: string, organizationId: string }`
    - 권한 검증: 센터 관리자 권한 확인
    - `center_org_relationships`에서 관계 제거 (소프트 삭제)

### 4.9. Proof 라우터 구현

- [ ] `lib/trpc/routers/proof.ts` 생성
  - `getLocationProofsForEntity` (Query)
    - 입력: `{ entityId: string, entityType: number }`
    - 권한 검증: 관리자 권한 확인
    - `location_proofs` 조회 (해당 엔티티의 모든 증빙)
    - RLS 정책으로 보호됨

### 4.10. 라우터 통합

- [ ] `lib/trpc/router.ts`에 모든 라우터 통합
  - `membership` 라우터 import 및 연결
  - `billing` 라우터 import 및 연결
  - `relationship` 라우터 import 및 연결
  - `proof` 라우터 import 및 연결
  - `AppRouter` 타입 export

### 4.11. tRPC Provider 설정

- [ ] `app/layout.tsx`에 TRPCProvider 추가
  - 클라이언트 컴포넌트로 분리 필요 시 `TRPCProvider` 컴포넌트 생성
  - 루트 레이아웃에 추가

## 참고사항

- 모든 tRPC 프로시저는 `protectedProcedure`를 사용하여 인증을 확인합니다
- 입력값은 Zod 스키마로 검증합니다
- 권한 검증은 비트 연산 (`hasPermission`)을 사용합니다
- RLS 정책이 tRPC에서도 적용되므로 이중 보안이 보장됩니다
- 에러 처리는 표준화된 형식으로 반환합니다

