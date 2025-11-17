# Todo 10: 인증 및 세션 관리

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태

기본 템플릿 인증만 존재합니다.

## 작업 목표

Supabase 권장 방식에 따른 클라이언트 사이드 인증 패턴을 확인하고, 회원가입 후 초기화 로직을 구현합니다.

## 작업 항목

### 10.1. 클라이언트 사이드 인증 패턴 확인

- [ ] 현재 인증 구현 확인
  - `src/components/auth/sign-in-form.tsx` 확인
  - `src/components/auth/sign-up-form.tsx` 확인
  - Supabase 권장 방식 준수 여부 확인

- [ ] 클라이언트 사이드 인증 패턴 검증
  - `createBrowserSupabaseClient()` 사용 확인
  - `supabase.auth.signUp()` 클라이언트에서 호출 확인
  - `supabase.auth.signInWithPassword()` 클라이언트에서 호출 확인
  - 쿠키 자동 관리 확인
  - OAuth 플로우 확인 (Google, Apple)

### 10.2. 회원가입 후 초기화 로직 구현

- [ ] 회원가입 후 초기화 로직 추가
  - `sign-up-form.tsx`에서 회원가입 성공 후 처리
  - tRPC Mutation 호출: `trpc.initializeUserAccount.mutate({ userId })`
  - 또는 Server Action 호출 (선택적)

- [ ] `initializeUserAccount` tRPC Mutation 구현
  - 위치: `lib/trpc/routers/membership.ts` 또는 별도 파일
  - 기능: 회원가입 후 초기화 작업
  - 로직:
    - 기본 조직 생성 (선택적)
    - 기본 권한 설정
    - 초기 데이터 생성
  - 입력: `{ userId: string }`

### 10.3. OAuth 플로우 확인

- [ ] Google OAuth 플로우 확인
  - `src/components/auth/oauth-buttons.tsx` 확인
  - 리디렉션 URL 설정 확인
  - 콜백 처리 확인 (`app/auth/callback/route.ts`)

- [ ] Apple OAuth 플로우 확인
  - Apple OAuth 설정 확인
  - 리디렉션 URL 설정 확인
  - 콜백 처리 확인

- [ ] OAuth 후 프로필 생성 확인
  - `handle_new_user()` 트리거 함수 확인
  - NULL email 처리 확인 (OAuth 제공자가 email을 제공하지 않는 경우)

### 10.4. 세션 관리 확인

- [ ] 세션 갱신 확인
  - Middleware에서 세션 갱신 확인
  - `supabase.auth.getUser()` 호출 확인
  - 쿠키 갱신 확인

- [ ] 로그아웃 처리 확인
  - `app/auth/signout/route.ts` 확인
  - `supabase.auth.signOut()` 호출 확인
  - 쿠키 삭제 확인

## 참고사항

- Supabase는 클라이언트 사이드 인증을 권장합니다
- 인증 자체는 클라이언트 컴포넌트에서 처리합니다
- 복잡한 비즈니스 로직은 tRPC Mutation에서 처리합니다
- OAuth 플로우는 Supabase가 자동으로 처리합니다
- 세션 관리는 Supabase가 자동으로 처리합니다 (쿠키 기반)

