# Todo 09: 데이터 조회 함수 (Data Access Functions)

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태

서버 컴포넌트용 데이터 조회 함수가 없습니다.

## 작업 목표

서버 컴포넌트에서 사용할 데이터 조회 함수를 구현합니다.

## 작업 항목

### 9.1. 서버 컴포넌트용 데이터 조회 함수 생성

- [ ] `app/data/read.ts` 생성
  - 서버 전용 파일 (Server Component에서 사용)
  - `createServerSupabaseClient()` 사용

- [ ] `getEntitiesForUser(userId: string)` 함수 구현
  - 기능: 사용자가 속한 조직/센터 목록 조회
  - 로직:
    - `memberships` 테이블에서 `user_id = userId` 조회
    - `organizations`와 `centers` 테이블 JOIN
    - `entity_type`에 따라 분류
    - 결과 반환: `{ organizations: [], centers: [] }`
  - RLS: 사용자 자신의 멤버십만 조회 가능

- [ ] `getMyLocationProofs(userId: string)` 함수 구현
  - 기능: 내 위치 증빙 조회
  - 로직:
    - `location_proofs` 테이블에서 `user_id = userId` 조회
    - 최신순 정렬 (`created_at DESC`)
    - 선택적 필터링 (entityId, entityType, proofCategory 등)
  - RLS: 본인의 증빙만 조회 가능

- [ ] `getProjectsForOrg(orgId: string)` 함수 구현
  - 기능: 조직별 프로젝트 조회
  - 로직:
    - `projects` 테이블에서 `org_id = orgId` 조회
    - RLS 정책 적용 (조직 멤버만 조회 가능)
  - RLS: 조직 멤버만 조회 가능

- [ ] `getOrgsForCenter(centerId: string)` 함수 구현
  - 기능: 센터별 조직 목록 조회
  - 로직:
    - `center_org_relationships` 테이블에서 `center_id = centerId` 조회
    - `organizations` 테이블 JOIN
    - RLS 정책 적용 (센터 멤버만 조회 가능)
  - RLS: 센터 멤버만 조회 가능

- [ ] `getSubscriptionForEntity(entityId: string, entityType: number)` 함수 구현
  - 기능: 엔티티별 구독 상태 조회
  - 로직:
    - `entity_subscriptions` 테이블에서 조회
    - `subscription_plans` 테이블 JOIN
    - RLS 정책 적용 (OWNER/MANAGER만 조회 가능)
  - RLS: OWNER/MANAGER만 조회 가능

- [ ] `getMembershipsForEntity(entityId: string, entityType: number)` 함수 구현
  - 기능: 엔티티별 멤버십 목록 조회
  - 로직:
    - `memberships` 테이블에서 조회
    - `profiles` 테이블 JOIN (사용자 정보)
    - RLS 정책 적용 (관리자만 조회 가능)
  - RLS: 관리자만 조회 가능

## 참고사항

- 모든 함수는 서버 전용입니다 (Server Component에서만 사용)
- `createServerSupabaseClient()`를 사용하여 RLS가 적용됩니다
- 모든 함수는 타입 안전성을 보장합니다 (TypeScript)
- 에러 처리는 적절히 수행해야 합니다
- 필요시 tRPC Query로 대체할 수 있습니다 (Tier 2 작업)

