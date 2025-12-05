# v6.0 Context-Driven Architecture 테스트 체크리스트

**작성일**: 2025-01-30  
**기준 문서**: `docs/rules/auth_permissions_251130.md`

## 테스트 전 준비사항

### 1. Database Hook 설정
- [x] Supabase 프로젝트 실행 중 확인
- [x] 마이그레이션 실행: `06_add_custom_access_token_hook_v6.sql`
- [x] Supabase Dashboard > Authentication > Hooks에서 Hook 등록
  - Hook Type: **Access Token Hook**
  - Hook Function: `custom_access_token_hook`
- [ ] Hook이 정상 작동하는지 확인

### 2. 테스트 데이터 준비
- [ ] 테스트 사용자 생성 (또는 기존 사용자 사용)
- [ ] 조직(Organization) 생성
- [ ] 센터(Center) 생성
- [ ] 멤버십(memberships) 데이터 생성
- [ ] 구독 상태(entity_subscriptions) 데이터 생성

## 테스트 시나리오

### 시나리오 1: 기본 인증 테스트

**목표**: 미들웨어가 인증만 체크하는지 확인

- [ ] 미인증 사용자가 `/dashboard` 접근 시 `/login`으로 리디렉션되는지 확인
- [ ] 인증된 사용자가 `/login` 접근 시 `/dashboard`로 리디렉션되는지 확인
- [ ] 인증된 사용자가 보호된 라우트에 정상 접근하는지 확인

**예상 결과**: 
- 미인증 사용자는 로그인 페이지로 리디렉션
- 인증된 사용자는 정상 접근

### 시나리오 2: Context 객체 생성 테스트

**목표**: Context 객체가 올바르게 생성되는지 확인

**2.1. 조직 Context 테스트**
- [ ] `/manage/org/[orgId]/dashboard` 접근
- [ ] 브라우저 개발자 도구에서 Network 탭 확인
- [ ] JWT에 `app_metadata.memberships`가 포함되어 있는지 확인
- [ ] Context 객체가 올바르게 생성되는지 확인 (콘솔 로그 또는 페이지 렌더링 확인)

**2.2. 센터 Context 테스트**
- [ ] `/manage/center/[centerId]/dashboard` 접근
- [ ] 동일한 검증 수행

**예상 결과**:
- JWT에 memberships 정보가 포함됨
- Context 객체가 정상 생성됨
- 페이지가 정상 렌더링됨

### 시나리오 3: 권한 체크 테스트

**목표**: Guard Methods가 올바르게 작동하는지 확인

**3.1. 기본 권한 체크 (ORG_VIEW)**
- [ ] `/manage/org/[orgId]/dashboard` 접근 (ORG_VIEW 권한 있음)
- [ ] 정상 접근되는지 확인
- [ ] `/manage/org/[orgId]/dashboard` 접근 (ORG_VIEW 권한 없음)
- [ ] `/dashboard?error=forbidden`으로 리디렉션되는지 확인

**3.2. OWNER 권한 체크**
- [ ] `/manage/org/[orgId]/settings` 접근 (OWNER 권한 있음)
- [ ] 정상 접근되는지 확인
- [ ] `/manage/org/[orgId]/settings` 접근 (OWNER 권한 없음)
- [ ] 리디렉션되는지 확인

**3.3. MANAGER 권한 체크**
- [ ] `/manage/org/[orgId]/members` 접근 (MANAGER 권한 있음)
- [ ] 정상 접근되는지 확인
- [ ] `/manage/org/[orgId]/members` 접근 (MANAGER 권한 없음)
- [ ] 리디렉션되는지 확인

**예상 결과**:
- 권한이 있으면 정상 접근
- 권한이 없으면 자동 리디렉션

### 시나리오 4: 구독 상태 체크 테스트

**목표**: 구독 상태에 따른 접근 제어 확인

**4.1. 활성 구독**
- [ ] 구독 상태가 ACTIVE인 조직의 `/manage/org/[orgId]/dashboard` 접근
- [ ] 정상 접근되는지 확인

**4.2. 비활성 구독**
- [ ] 구독 상태가 비활성인 조직의 `/manage/org/[orgId]/dashboard` 접근
- [ ] `/manage/org/[orgId]/billing`으로 리디렉션되는지 확인

**4.3. 빌링 페이지 예외**
- [ ] 구독 상태가 비활성인 조직의 `/manage/org/[orgId]/billing` 접근
- [ ] 정상 접근되는지 확인 (리디렉션 없음)

**예상 결과**:
- 활성 구독: 정상 접근
- 비활성 구독: 빌링 페이지로 리디렉션
- 빌링 페이지: 항상 접근 가능

### 시나리오 5: react.cache 동작 테스트

**목표**: Context 객체가 요청 내에서 캐싱되는지 확인

- [ ] Layout과 Page에서 동일한 Context 인스턴스 사용 확인
- [ ] 개발자 도구에서 Network 요청 확인
- [ ] JWT 파싱이 1회만 실행되는지 확인 (로그 확인)

**예상 결과**:
- Layout과 Page에서 동일한 Context 인스턴스 사용
- JWT 파싱이 1회만 실행됨

### 시나리오 6: 클라이언트 동기화 테스트

**목표**: 상태 변경 후 Context 갱신 확인

**6.1. useUserSync Hook 테스트**
- [ ] 클라이언트 컴포넌트에서 `useUserSync` Hook 사용
- [ ] `refreshContext()` 호출
- [ ] JWT가 갱신되는지 확인
- [ ] 서버 컴포넌트가 리렌더링되는지 확인

**6.2. tRPC Mutation 연동 테스트**
- [ ] 멤버 초대 Mutation 실행
- [ ] Mutation 성공 후 `refreshContext()` 호출
- [ ] Context가 최신 상태로 갱신되는지 확인

**예상 결과**:
- `refreshContext()` 호출 시 JWT 갱신
- 서버 컴포넌트 리렌더링
- Context가 최신 상태 반영

## 디버깅 팁

### JWT 확인 방법
⚠️ **v6.0 아키텍처: 쿠키 기반 인증 사용 (Local Storage 아님)**

**방법 1: 브라우저 콘솔에서 (권장)**
```javascript
// 브라우저 콘솔에서
// @supabase/ssr의 createBrowserClient 사용 (쿠키 기반)
const { createBrowserClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/ssr@latest/+esm');
const supabase = createBrowserClient('YOUR_SUPABASE_URL', 'YOUR_PUBLISHABLE_KEY');
const { data: { user } } = await supabase.auth.getUser();
console.log('Memberships:', user?.app_metadata?.memberships);
```

**방법 2: 쿠키에서 직접 확인**
```javascript
// 브라우저 개발자 도구 > Application > Cookies
// sb-<project-ref>-auth-token 쿠키 값을 복사하여 jwt.io에서 디코딩
// 또는 브라우저 콘솔에서:
const cookies = document.cookie.split(';');
const authCookie = cookies.find(c => c.includes('sb-') && c.includes('auth-token'));
if (authCookie) {
  const token = authCookie.split('=')[1];
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Memberships:', payload.app_metadata?.memberships);
}
```

### Context 객체 확인
- Layout/Page에서 `console.log(ctx)` 추가
- 브라우저 개발자 도구에서 확인

### 에러 발생 시 확인사항
1. Database Hook이 등록되어 있는가?
2. JWT에 memberships 정보가 포함되어 있는가?
3. 권한 비트가 올바르게 설정되어 있는가?
4. 구독 상태가 올바르게 설정되어 있는가?

## 테스트 결과 기록

### 테스트 일시
- 시작: 2025-01-30
- 완료: ___________

### 코드 검증 결과 (2025-01-30)
- [x] 시나리오 1: 기본 인증 테스트 - ✅ (미들웨어 간소화 완료)
- [x] 시나리오 2: Context 객체 생성 테스트 - ✅ (구현 완료)
- [x] 시나리오 3: 권한 체크 테스트 - ✅ (Guard Methods 구현 완료)
- [x] 시나리오 4: 구독 상태 체크 테스트 - ✅ (requireBilling() 구현 완료)
- [x] 시나리오 5: react.cache 동작 테스트 - ✅ (cache() 적용 완료)
- [x] 시나리오 6: 클라이언트 동기화 테스트 - ✅ (useUserSync Hook 구현 완료)

### 코드 구조 검증 완료
- [x] `src/lib/jwt-context/org-context.ts` - ✅ 구현 완료
- [x] `src/lib/jwt-context/center-context.ts` - ✅ 구현 완료
- [x] `src/lib/jwt-context/index.ts` - ✅ Export 통합 완료
- [x] `src/lib/permissions.ts` - ✅ `fromHex()` 메서드 구현 완료
- [x] `src/middleware.ts` - ✅ 간소화 완료 (인증만 체크)
- [x] `src/app/(org-management)/manage/org/[orgId]/layout.tsx` - ✅ 구현 완료
- [x] `src/app/(org-management)/manage/org/[orgId]/(protected)/layout.tsx` - ✅ 구현 완료
- [x] `src/app/(center-management)/manage/center/[centerId]/layout.tsx` - ✅ 구현 완료
- [x] `src/app/(org-management)/manage/org/[orgId]/dashboard/page.tsx` - ✅ 구현 완료
- [x] `src/app/(org-management)/manage/org/[orgId]/settings/page.tsx` - ✅ 구현 완료
- [x] `src/app/(org-management)/manage/org/[orgId]/members/page.tsx` - ✅ 구현 완료
- [x] `src/app/(org-management)/manage/org/[orgId]/billing/page.tsx` - ✅ 구현 완료
- [x] `src/hooks/use-user-sync.ts` - ✅ 구현 완료
- [x] `supabase/migrations/06_add_custom_access_token_hook_v6.sql` - ✅ 마이그레이션 파일 존재

### 수정 완료 사항
- [x] 리디렉션 URL 수정: `/org-management/` → `/manage/org/`
- [x] 리디렉션 URL 수정: `/center-management/` → `/manage/center/`
- [x] 린터 에러 확인: 에러 없음

### 실제 기능 테스트 (서버 실행 필요)
- [ ] 시나리오 1: 기본 인증 테스트 - ⏳ 서버 실행 후 테스트 필요
- [ ] 시나리오 2: Context 객체 생성 테스트 - ⏳ 서버 실행 후 테스트 필요
- [ ] 시나리오 3: 권한 체크 테스트 - ⏳ 서버 실행 후 테스트 필요
- [ ] 시나리오 4: 구독 상태 체크 테스트 - ⏳ 서버 실행 후 테스트 필요
- [ ] 시나리오 5: react.cache 동작 테스트 - ⏳ 서버 실행 후 테스트 필요
- [ ] 시나리오 6: 클라이언트 동기화 테스트 - ⏳ 서버 실행 후 테스트 필요

### 발견된 문제
1. 리디렉션 URL 불일치 (수정 완료)
   - 문제: `requireBilling()`에서 잘못된 경로 사용
   - 해결: `/manage/org/`, `/manage/center/`로 수정

### 다음 단계
1. Database Hook 등록 (Supabase Dashboard)
2. 개발 서버 실행 (`pnpm run dev`)
3. 실제 기능 테스트 수행 

