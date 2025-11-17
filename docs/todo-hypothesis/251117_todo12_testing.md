# Todo 12: 테스트 및 검증

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태

기본 Playwright 테스트만 존재합니다.

## 작업 목표

3-Tier 아키텍처 준수, RLS 정책, 권한 시스템, 구독 상태 체크를 검증하는 테스트를 작성합니다.

## 작업 항목

### 12.1. 3-Tier 아키텍처 준수 검증

- [ ] Tier 1 검증
  - 클라이언트 직접 접근만 사용하는지 확인
  - `createBrowserSupabaseClient()` 사용 확인
  - PUBLISHABLE_KEY 사용 확인
  - RLS 정책 준수 확인

- [ ] Tier 2 검증
  - tRPC만 사용하는지 확인
  - `createServerSupabaseClient()` 사용 확인 (tRPC 내부)
  - PUBLISHABLE_KEY 사용 확인
  - RLS 정책 준수 확인
  - SERVICE_ROLE_KEY 사용하지 않는지 확인

- [ ] Tier 3 검증
  - Server Actions만 사용하는지 확인
  - `createAdminSupabaseClient()` 사용 확인
  - SERVICE_ROLE_KEY 사용 확인
  - 앱 매니저 권한 검증 확인

### 12.2. RLS 정책 테스트

- [ ] 사용자 데이터 격리 테스트
  - 사용자 A가 사용자 B의 데이터에 접근할 수 없는지 확인
  - `profiles` 테이블 RLS 테스트
  - `location_proofs` 테이블 RLS 테스트
  - `memberships` 테이블 RLS 테스트

- [ ] 권한 기반 접근 테스트
  - 관리자 권한이 있는 사용자만 엔티티 데이터 접근 가능한지 확인
  - `entity_subscriptions` 테이블 RLS 테스트
  - `center_org_relationships` 테이블 RLS 테스트

- [ ] 복잡한 권한 체크 테스트
  - `location_proofs` SELECT 정책 테스트
    - 본인 증빙 조회 가능
    - 조직 관리자는 조직 증빙 조회 가능
    - 센터 관리자는 센터 증빙 조회 가능
    - 센터 관리자는 관리하는 조직의 증빙 조회 가능

### 12.3. 권한 시스템 테스트

- [ ] 비트 연산 테스트
  - `hasPermission()` 함수 테스트
  - 권한 추가/제거 테스트
  - 여러 권한 체크 테스트

- [ ] 역할 프리셋 테스트
  - `ORG_MEMBER` 권한 확인
  - `ORG_MANAGER` 권한 확인
  - `ORG_OWNER` 권한 확인
  - `CENTER_STAFF` 권한 확인
  - `CENTER_MANAGER` 권한 확인
  - `CENTER_OWNER` 권한 확인
  - `CENTER_LAW_AGENCY` 권한 확인
  - `APP_MANAGER` 권한 확인

### 12.4. 구독 상태 체크 테스트

- [ ] Middleware 구독 상태 체크 테스트
  - ACTIVE 상태: 정상 접근 가능
  - PAST_DUE 상태: `/billing/suspended`로 리디렉션
  - SUSPENDED 상태: `/billing/suspended`로 리디렉션
  - CANCELED 상태: `/billing/suspended`로 리디렉션
  - NULL 상태: `/billing/suspended`로 리디렉션

- [ ] 예외 경로 테스트
  - `/billing/*` 경로는 구독 상태 체크 제외 확인
  - `/login`, `/signup` 경로는 구독 상태 체크 제외 확인

### 12.5. 통합 테스트

- [ ] 전체 플로우 테스트
  - 회원가입 → 초기화 → 대시보드 접근
  - 조직 생성 → 멤버 초대 → 권한 변경
  - 위치 증빙 생성 → 조회
  - 구독 생성 → 결제 → 상태 업데이트

- [ ] 에러 처리 테스트
  - 권한 없는 접근 시도
  - 잘못된 입력값 처리
  - 네트워크 에러 처리

### 12.6. 성능 테스트

- [ ] RLS 정책 성능 테스트
  - 인덱스가 올바르게 생성되어 있는지 확인
  - 쿼리 성능 측정
  - `(select auth.uid())` 패턴 사용 확인

- [ ] Middleware 성능 테스트
  - DB 쿼리 최소화 확인
  - 응답 시간 측정

## 참고사항

- 테스트는 Playwright를 사용합니다
- RLS 정책 테스트는 Supabase CLI를 사용하여 로컬에서 테스트할 수 있습니다
- 권한 시스템 테스트는 단위 테스트로 작성할 수 있습니다
- 통합 테스트는 실제 플로우를 시뮬레이션합니다
- 성능 테스트는 프로덕션 환경과 유사한 조건에서 수행해야 합니다

