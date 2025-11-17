# Todo 07: Middleware 개선

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태

기본 인증만 존재합니다. 역할 기반 접근 제어와 구독 상태 체크가 없습니다.

## 작업 목표

Middleware에 역할 기반 접근 제어와 구독 상태 기반 기능 정지를 추가합니다.

## 작업 항목

### 7.1. 역할 기반 접근 제어 구현

- [ ] `/app-manager` 경로 접근 제어
  - 요청 경로가 `/app-manager`로 시작하는지 확인
  - 사용자 세션 확인
  - `profiles` 테이블에서 `permissions` 조회
  - `IS_APP_MANAGER` 비트 체크: `(permissions & PERMISSIONS.IS_APP_MANAGER) !== 0n`
  - 권한이 없으면 `/dashboard` 또는 `/login`으로 리디렉션

- [ ] `/center-management` 경로 접근 제어
  - 요청 경로가 `/center-management`로 시작하는지 확인
  - 사용자 세션 확인
  - `memberships` 테이블에서 `entity_type = 2` (CENTER) 조회
  - `CENTER_VIEW` 비트 체크: `(permissions & PERMISSIONS.CENTER_VIEW) !== 0n`
  - 권한이 없으면 `/dashboard`로 리디렉션

- [ ] `/law-agency` 경로 접근 제어
  - 요청 경로가 `/law-agency`로 시작하는지 확인
  - 사용자 세션 확인
  - `memberships` 테이블에서 `entity_type = 2` (CENTER) 조회
  - `CENTER_IS_LAW_AGENCY` 비트 체크: `(permissions & PERMISSIONS.CENTER_IS_LAW_AGENCY) !== 0n`
  - 권한이 없으면 `/dashboard`로 리디렉션

- [ ] 역할 기반 접근 제어 로직 모듈화
  - `lib/middleware/permissions.ts` 생성 (선택적)
  - 권한 체크 함수들 분리
  - 재사용 가능한 유틸리티 함수 생성

### 7.2. 구독 상태 기반 기능 정지 구현

- [ ] 구독 상태 체크 로직 추가
  - 핵심 기능 라우트 그룹 확인: `(user)`, `(org_management)`, `(center_management)`
  - 요청 경로가 해당 라우트 그룹에 속하는지 확인

- [ ] 엔티티 ID 추출
  - URL 파라미터에서 `[orgId]` 또는 `[centerId]` 추출
  - 또는 세션/쿠키에서 현재 활성화된 엔티티 ID 가져오기
  - 엔티티 타입 결정 (1: ORGANIZATION, 2: CENTER)

- [ ] 구독 상태 조회
  - `entity_subscriptions` 테이블에서 해당 엔티티의 구독 상태 조회
  - `entity_id`와 `entity_type`으로 필터링
  - `status` 컬럼 확인

- [ ] 기능 정지 로직
  - `IF (status IS NULL OR status !== SUBSCRIPTION_STATUS.ACTIVE)`
  - `THEN redirect('/billing/suspended')`
  - ACTIVE가 아닌 경우 (PAST_DUE, SUSPENDED, CANCELED, NULL) 모두 정지

- [ ] 예외 경로 처리
  - `/billing/*` 경로는 구독 상태 체크 제외
  - `/login`, `/signup` 등 인증 관련 경로는 제외
  - API 라우트는 제외 (이미 matcher에 포함됨)

### 7.3. Middleware 성능 최적화

- [ ] DB 쿼리 최적화
  - 필요한 경우에만 DB 쿼리 수행
  - 인증되지 않은 사용자는 조기 리턴
  - 쿼리 결과 캐싱 고려 (선택적)

- [ ] 에러 처리
  - DB 쿼리 실패 시 기본 동작 (인증된 사용자는 통과)
  - 로깅 추가 (선택적)

## 참고사항

- Middleware는 모든 요청에 실행되므로 성능에 주의해야 합니다
- DB 쿼리는 최소화하고, 필요한 경우에만 수행합니다
- 역할 기반 접근 제어는 Middleware와 각 라우트 그룹의 `layout.tsx`에서 이중으로 확인할 수 있습니다
- 구독 상태 체크는 핵심 기능 라우트에만 적용합니다
- `/billing/suspended` 페이지는 구독 상태 체크를 우회해야 합니다 (무한 루프 방지)

