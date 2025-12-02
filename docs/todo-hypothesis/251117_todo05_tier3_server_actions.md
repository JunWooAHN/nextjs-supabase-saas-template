# Todo 05: Tier 3 (앱 매니저) - Server Actions 구현

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태

`lib/supabase/server.ts`에 `createAdminSupabaseClient()` 존재 ✅

## 작업 목표

Tier 3 (앱 매니저)를 위한 Server Actions를 구현하고, SERVICE_ROLE_KEY를 사용하여 RLS를 우회하는 플랫폼 전체 관리 기능을 제공합니다.

## 작업 항목

### 5.1. Admin 클라이언트 분리 (선택적)

- [ ] `lib/supabase/admin.ts` 생성 (선택적)
  - 현재 `server.ts`에 포함되어 있지만, 분리하는 것을 고려
  - `createAdminSupabaseClient()` 함수
  - `@supabase/supabase-js`의 `createClient` 사용
  - SERVICE_ROLE_KEY 사용
  - 서버 환경 설정: `persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`
  - 경고 주석 추가 (RLS 우회)

### 5.2. 앱 매니저 권한 검증 유틸리티

- [ ] `features/auth/utils/admin.utils.ts` 생성 (또는 `lib/auth/admin.ts`)
  - `verifyAppManager(userId: string): Promise<boolean>` 함수
    - `profiles` 테이블에서 `permissions` 조회
    - `IS_APP_MANAGER` 비트 체크
    - SERVICE_ROLE_KEY 사용 (RLS 우회 필요)

### 5.3. Admin Server Actions 구현

- [ ] `features/auth/actions/admin.actions.ts` 생성 (또는 별도 피처로 분리)
  - `getAllEntitiesForAppManager()` (Server Action)
    - 앱 매니저 권한 검증 (`verifyAppManager`)
    - SERVICE_ROLE_KEY로 모든 엔티티 조회
    - `organizations`, `centers`, `profiles` 조회
    - RLS 우회하여 모든 데이터 접근
  - `getAllUsersForAppManager()` (Server Action)
    - 앱 매니저 권한 검증
    - 모든 사용자 프로필 조회
  - `getAllSubscriptionsForAppManager()` (Server Action)
    - 앱 매니저 권한 검증
    - 모든 구독 상태 조회
  - `updateEntitySubscriptionStatus()` (Server Action)
    - 앱 매니저 권한 검증
    - 엔티티 구독 상태 수동 변경 (긴급 상황용)

### 5.4. 앱 매니저 전용 페이지 구현

- [ ] `(app_manager)` 라우트 그룹 생성 (별도 Todo에서 처리)
- [ ] 앱 매니저 대시보드 페이지
  - 모든 엔티티 통계 표시
  - 모든 사용자 목록 표시
  - 모든 구독 상태 표시

## 참고사항

- SERVICE_ROLE_KEY는 **오직 Tier 3에서만** 사용합니다
- 모든 Server Action은 앱 매니저 권한 검증을 필수로 수행합니다
- RLS를 우회하므로 보안에 각별히 주의해야 합니다
- 일반 비즈니스 로직에는 절대 사용하지 않습니다
- `@supabase/ssr`는 service_role 키를 지원하지 않으므로 `@supabase/supabase-js`를 직접 사용합니다
- **피처 기반 아키텍처**: Server Actions는 `features/{feature}/actions/` 디렉토리에 위치합니다
- 앱 매니저 관련 기능은 `features/auth/actions/admin.actions.ts`에 구현하거나 별도 피처로 분리할 수 있습니다

