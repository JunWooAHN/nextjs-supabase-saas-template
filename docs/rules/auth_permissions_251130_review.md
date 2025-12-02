# v6.0 Context-Driven Architecture 검토 결과

**작성일**: 2025-01-30  
**검토 문서**: `docs/rules/auth_permissions_251130.md`  
**기준 문서**: `docs/rules/5.1.md` (v5.6), `docs/rules/auth_permissions_251124.md` (v5.6)

## 1. 핵심 변화 요약

### v5.6 → v6.0 주요 변경사항

| 항목 | v5.6 | v6.0 |
|------|------|------|
| **접근 제어 위치** | 미들웨어 (middleware.ts) | Layout/Page (Context 객체) |
| **권한 체크 방식** | 미들웨어에서 JWT 파싱 + 리디렉션 | Context 클래스의 Guard Methods |
| **데이터 캡슐화** | 없음 (JWT 직접 파싱) | Context 클래스로 데이터+행위 응집 |
| **재사용성** | 미들웨어 로직 중복 가능 | react.cache로 메모이제이션 |
| **UI 접근성** | JWT 직접 파싱 필요 | Context 객체로 간접 접근 |

## 2. 아키텍처 분석

### 2.1. ✅ 장점 (Strengths)

#### 1. **선언적 접근 제어 (Declarative Access Control)**

**v5.6 방식:**
```typescript
// middleware.ts - 명령형
if ((permissions & PERM_BITS.ORG_VIEW) === 0n) {
  return NextResponse.redirect(...);
}
```

**v6.0 방식:**
```typescript
// layout.tsx - 선언적
const ctx = await getOrgContext(params.orgId);
ctx.require(PERMISSIONS.ORG_VIEW); // 한 줄로 처리
```

**장점**: 코드가 더 읽기 쉽고 의도가 명확함

#### 2. **데이터와 행위의 응집 (Cohesion)**

**v5.6 방식:**
```typescript
// Page에서 권한 체크 + UI 렌더링 분리
const memberships = user.app_metadata.memberships?.[orgId];
const [status, permHex] = memberships;
const permissions = PermissionsBitField.fromHex(permHex);
const isOwner = permissions.has(PERMISSIONS.ORG_OWNER);

if (!isOwner) {
  redirect('/dashboard');
}
```

**v6.0 방식:**
```typescript
// Context 객체로 캡슐화
const ctx = await getOrgContext(params.orgId);
ctx.requireOwner(); // Guard Method

// UI에서도 간단하게 접근
{ctx.isOwner && <DeleteButton />}
```

**장점**: 
- 반복 코드 제거
- 비즈니스 로직이 한 곳에 집중
- 테스트 용이성 향상

#### 3. **react.cache를 통한 성능 최적화**

**v6.0 방식:**
```typescript
export const getOrgContext = cache(async (orgId: string) => {
  // JWT 파싱, PermissionsBitField 생성 등
  // 한 요청 내에서 여러 번 호출해도 1회만 실행
});
```

**장점**:
- Layout, Page, Component에서 중복 호출해도 1회만 실행
- JWT 파싱 비용 절감
- Next.js App Router의 렌더링 메커니즘과 완벽히 일치

#### 4. **UI에서의 권한 정보 접근 용이성**

**v5.6 방식:**
```typescript
// Page에서 매번 JWT 파싱 필요
const memberships = user.app_metadata.memberships?.[orgId];
const [status, permHex] = memberships;
const permissions = PermissionsBitField.fromHex(permHex);
const isOwner = permissions.has(PERMISSIONS.ORG_OWNER);
```

**v6.0 방식:**
```typescript
// Context 객체로 간단하게 접근
const ctx = await getOrgContext(params.orgId);
{ctx.isOwner && <AdminPanel />}
{ctx.isBillingActive && <Feature />}
```

**장점**: UI 코드가 훨씬 간결해짐

### 2.2. ⚠️ 잠재적 문제점 및 해결 방안

#### 1. **미들웨어와 Layout의 역할 분담**

**문제점:**
- v5.6: 미들웨어에서 모든 접근 제어
- v6.0: Layout에서 접근 제어
- **미들웨어의 역할이 모호해질 수 있음**

**해결 방안:**
```typescript
// middleware.ts - 최소한의 방어 (인증만)
export async function middleware(request: NextRequest) {
  const { data: { user } } = await supabase.auth.getUser();
  
  // 인증되지 않은 사용자만 차단
  if (!user && isProtectedRoute) {
    return NextResponse.redirect('/login');
  }
  
  // 권한/구독 체크는 Layout에서 처리
  return NextResponse.next();
}
```

**권장사항**: 미들웨어는 인증(Authentication)만, Layout은 권한(Authorization)과 구독 체크

#### 2. **Context 생성 실패 시 에러 처리**

**문제점:**
```typescript
const ctx = await getOrgContext(params.orgId);
// 만약 getOrgContext 내부에서 redirect()가 실패하면?
```

**해결 방안:**
```typescript
export const getOrgContext = cache(async (orgId: string) => {
  // ... JWT 파싱 ...
  
  if (!data) {
    // redirect()는 항상 throw하므로 안전
    redirect('/dashboard');
  }
  
  // 에러 발생 시 Next.js가 자동으로 처리
  return new OrgContext(...);
});
```

**권장사항**: `redirect()`는 항상 throw하므로 안전하지만, 명시적 에러 처리 추가 고려

#### 3. **클라이언트 동기화 복잡도**

**문제점:**
- 서버 Context는 JWT 쿠키 기반
- 클라이언트에서 상태 변경 시 수동 동기화 필요
- `refreshSession()` + `router.refresh()` 호출 필요

**해결 방안:**
```typescript
// useUserSync Hook을 표준화
export function useUserSync() {
  const refreshContext = async () => {
    await supabase.auth.refreshSession(); // 새 JWT 발급
    router.refresh(); // Server Component 리렌더링
  };
  return { refreshContext };
}

// tRPC Mutation 후 자동 호출
const mutation = trpc.membership.inviteUser.useMutation({
  onSuccess: () => {
    refreshContext(); // 자동 동기화
  },
});
```

**권장사항**: 
- `useUserSync` Hook을 표준화
- tRPC Mutation 성공 시 자동 호출 패턴 적용
- 문서화 및 가이드 제공

#### 4. **react.cache의 동작 방식 이해 필요**

**문제점:**
- `react.cache()`는 React의 내부 API
- 동작 방식이 명확하지 않으면 버그 발생 가능

**해결 방안:**
```typescript
// 명확한 주석과 문서화
/**
 * [Factory] Request-Scoped Singleton 생성기
 * 
 * ⚠️ 중요: react.cache()를 사용하여 동일한 요청 내에서
 * 여러 번 호출해도 1회만 실행됩니다.
 * 
 * Next.js App Router의 렌더링 주기:
 * 1. Layout 렌더링 → getOrgContext() 호출 (실행)
 * 2. Page 렌더링 → getOrgContext() 호출 (캐시 Hit)
 * 3. Component 렌더링 → getOrgContext() 호출 (캐시 Hit)
 * 
 * @param orgId - 조직 UUID
 * @returns OrgContext 인스턴스 (요청별 싱글톤)
 */
export const getOrgContext = cache(async (orgId: string) => {
  // ...
});
```

**권장사항**: 
- 상세한 주석 추가
- 팀 내 공유 문서 작성
- 테스트 코드로 동작 검증

## 3. v5.6과의 호환성

### 3.1. ✅ 호환 가능한 부분

1. **JWT 구조**: v5.6의 `app_metadata.memberships` 구조 그대로 사용
2. **PermissionsBitField.fromHex()**: v5.6에서 추가한 메서드 그대로 사용
3. **Database Hook**: `custom_access_token_hook` 함수 그대로 사용
4. **3-Tier 아키텍처**: Tier 1/2/3 구조 유지

### 3.2. ⚠️ 마이그레이션 필요 부분

1. **미들웨어 로직**: 권한/구독 체크 제거, 인증만 유지
2. **Layout 파일**: Context 객체 생성 및 Guard Methods 적용
3. **Page 파일**: JWT 직접 파싱 제거, Context 객체 사용
4. **클라이언트 동기화**: `useUserSync` Hook 추가

## 4. 권장 사항

### 4.1. ✅ 즉시 적용 권장

1. **Context 클래스 설계**: `OrgContext`, `CenterContext` 구현
2. **react.cache 적용**: `getOrgContext`, `getCenterContext` 팩토리 함수
3. **Guard Methods**: `require()`, `requireBilling()`, `requireOwner()` 구현
4. **Layout 리팩토링**: 기존 미들웨어 로직을 Layout으로 이동

### 4.2. ⚠️ 단계적 적용 필요

1. **미들웨어 간소화**: 
   - 1단계: 인증만 체크하도록 변경
   - 2단계: 권한/구독 체크는 Layout으로 이동
   
2. **클라이언트 동기화**:
   - 1단계: `useUserSync` Hook 구현
   - 2단계: tRPC Mutation에 자동 호출 패턴 적용
   - 3단계: 문서화 및 가이드 제공

3. **에러 처리 강화**:
   - Context 생성 실패 시 명시적 에러 처리
   - Fallback 로직 추가 (JWT 없을 경우)

### 4.3. 📝 문서화 필요

1. **아키텍처 가이드**: Context-Driven Architecture 상세 설명
2. **마이그레이션 가이드**: v5.6 → v6.0 전환 가이드
3. **Best Practices**: Context 사용 패턴 및 주의사항
4. **Troubleshooting**: 자주 발생하는 문제 및 해결 방법

## 5. 결론

### 5.1. 전체 평가

**✅ 매우 긍정적**: v6.0은 v5.6의 자연스러운 진화입니다.

**핵심 가치:**
1. **개발 생산성 향상**: 반복 코드 제거, 선언적 접근 제어
2. **코드 품질 향상**: 데이터와 행위의 응집, 캡슐화
3. **성능 최적화**: react.cache를 통한 중복 실행 방지
4. **유지보수성 향상**: Context 클래스로 비즈니스 로직 집중

**잠재적 리스크:**
1. 미들웨어와 Layout의 역할 분담 명확화 필요
2. 클라이언트 동기화 복잡도 관리 필요
3. react.cache 동작 방식 이해 필요

### 5.2. 최종 권장사항

**✅ 적용 권장**: v6.0은 v5.6을 개선한 우수한 아키텍처입니다.

**필수 작업:**
1. `OrgContext`, `CenterContext` 클래스 구현
2. `getOrgContext`, `getCenterContext` 팩토리 함수 (react.cache 적용)
3. Layout 파일 리팩토링 (Guard Methods 적용)
4. 미들웨어 간소화 (인증만 체크)
5. `useUserSync` Hook 구현 및 표준화

**선택 작업:**
- 에러 처리 강화
- 테스트 코드 작성
- 문서화 및 가이드 작성

**주의사항:**
- react.cache 동작 방식 이해 필수
- 클라이언트 동기화 패턴 표준화 필요
- 미들웨어와 Layout의 역할 분담 명확화 필요

## 6. 참고 문서

- [Next.js App Router - Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [React cache() API](https://react.dev/reference/react/cache)
- [기존 룰: 5.1.md](./5.1.md)
- [v5.6 룰: auth_permissions_251124.md](./auth_permissions_251124.md)

