# Todo 09: 데이터 조회 함수 (Data Access Functions)

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태

서버 컴포넌트용 데이터 조회 함수가 없습니다. 피처 기반 아키텍처에 따라 서비스 레이어로 구현해야 합니다.

## 작업 목표

피처 기반 아키텍처에 따라 각 피처의 서비스 레이어를 구현하고, 서버 컴포넌트에서 사용할 수 있도록 합니다.

## 작업 항목

### 9.1. 서비스 레이어 구현 (피처 기반)

- [ ] `features/membership/services/membership.service.ts` 구현
  - `getEntitiesForUser(userId: string)` 메서드
    - 기능: 사용자가 속한 조직/센터 목록 조회
    - 로직:
      - `memberships` 테이블에서 `user_id = userId` 조회
      - `organizations`와 `centers` 테이블 JOIN
      - `entity_type`에 따라 분류
      - 결과 반환: `{ organizations: [], centers: [] }`
    - RLS: 사용자 자신의 멤버십만 조회 가능
  - `getMembershipsForEntity(entityId: string, entityType: number)` 메서드
    - 기능: 엔티티별 멤버십 목록 조회
    - 로직:
      - `memberships` 테이블에서 조회
      - `profiles` 테이블 JOIN (사용자 정보)
      - RLS 정책 적용 (관리자만 조회 가능)
    - RLS: 관리자만 조회 가능

- [ ] `features/proof/services/proof.service.ts` 구현
  - `getMyLocationProofs(userId: string)` 메서드
    - 기능: 내 위치 증빙 조회
    - 로직:
      - `location_proofs` 테이블에서 `user_id = userId` 조회
      - 최신순 정렬 (`created_at DESC`)
      - 선택적 필터링 (entityId, entityType, proofCategory 등)
    - RLS: 본인의 증빙만 조회 가능

- [ ] `features/organization/services/organization.service.ts` 구현
  - `getProjectsForOrg(orgId: string)` 메서드
    - 기능: 조직별 프로젝트 조회
    - 로직:
      - `projects` 테이블에서 `org_id = orgId` 조회
      - RLS 정책 적용 (조직 멤버만 조회 가능)
    - RLS: 조직 멤버만 조회 가능

- [ ] `features/relationship/services/relationship.service.ts` 구현
  - `getOrgsForCenter(centerId: string)` 메서드
    - 기능: 센터별 조직 목록 조회
    - 로직:
      - `center_org_relationships` 테이블에서 `center_id = centerId` 조회
      - `organizations` 테이블 JOIN
      - RLS 정책 적용 (센터 멤버만 조회 가능)
    - RLS: 센터 멤버만 조회 가능

- [ ] `features/billing/services/subscription.service.ts` 구현
  - `getSubscriptionForEntity(entityId: string, entityType: number)` 메서드
    - 기능: 엔티티별 구독 상태 조회
    - 로직:
      - `entity_subscriptions` 테이블에서 조회
      - `subscription_plans` 테이블 JOIN
      - RLS 정책 적용 (OWNER/MANAGER만 조회 가능)
    - RLS: OWNER/MANAGER만 조회 가능

### 9.2. 서버 컴포넌트용 헬퍼 함수 생성 (선택적)

- [ ] `lib/data/read.ts` 생성 (선택적, 서비스 레이어 래퍼)
  - 서버 전용 파일 (Server Component에서 사용)
  - 각 피처의 서비스를 직접 호출하거나, 간단한 헬퍼 함수 제공
  - `createServerSupabaseClient()` 사용하여 서비스 인스턴스 생성
  - 또는 Request-scoped Container 패턴 사용 (tRPC와 동일)

## 참고사항

- **피처 기반 아키텍처**: 데이터 조회 로직은 각 피처의 서비스 레이어에 구현됩니다
- **서비스 레이어**: 복잡한 비즈니스 로직은 서비스에서 처리하고, 서버 컴포넌트는 서비스를 호출합니다
- **DI 패턴**: 서버 컴포넌트에서도 Request-scoped Container를 사용할 수 있습니다 (tRPC와 동일한 패턴)
- **RLS 적용**: `createServerSupabaseClient()`를 사용하여 RLS가 적용됩니다
- **타입 안전성**: 모든 함수는 타입 안전성을 보장합니다 (TypeScript)
- **에러 처리**: 적절히 수행해야 합니다
- **대안**: 필요시 tRPC Query로 대체할 수 있습니다 (Tier 2 작업)
- **간단한 쿼리**: 단순한 CRUD는 서버 컴포넌트에서 직접 쿼리할 수 있습니다 (서비스 레이어 필수 아님)

