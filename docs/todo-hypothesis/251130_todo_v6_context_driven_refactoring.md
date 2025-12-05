# Todo: v6.0 Context-Driven Architecture 리팩토링

**작성일**: 2025-01-30  
**기준 문서**: 
- `docs/rules/auth_permissions_251130.md` (v6.0 아키텍처 명세)
- `docs/rules/auth_permissions_251130_review.md` (검토 결과)
- `docs/rules/5.1.md` (v5.6 기준)

## 목표

v5.6의 미들웨어 기반 접근 제어를 v6.0의 Context-Driven Architecture로 전환하여:
1. 선언적 접근 제어로 개발 생산성 향상
2. 데이터와 행위의 응집으로 코드 품질 향상
3. react.cache를 통한 성능 최적화
4. Context 클래스로 비즈니스 로직 집중화

## 작업 단계

### Phase 1: 핵심 인프라 구축 (Foundation)

#### 1.1. PermissionsBitField.fromHex() 메서드 추가

**목표**: v5.6에서 정의한 Hex String 파싱 로직 구현

- [ ] `src/lib/permissions.ts` 파일 확인
- [ ] `PermissionsBitField` 클래스에 `fromHex()` static 메서드 추가
  ```typescript
  static fromHex(hex: string): PermissionsBitField {
    return new PermissionsBitField(BigInt(`0x${hex}`));
  }
  ```
- [ ] 단위 테스트 작성 (선택적)
- [ ] 문서화 (JSDoc 주석 추가)

**참고**: v5.6 룰 문서의 `auth_permissions_251124.md` 참조

#### 1.2. Context 클래스 구현

**목표**: `OrgContext`, `CenterContext` 클래스 구현

**1.2.1. 폴더 구조 생성**
- [ ] `src/lib/jwt-context/` 폴더 생성
- [ ] `src/lib/jwt-context/org-context.ts` 파일 생성
- [ ] `src/lib/jwt-context/center-context.ts` 파일 생성
- [ ] `src/lib/jwt-context/index.ts` 파일 생성 (export 통합)

**1.2.2. OrgContext 클래스 구현**
- [ ] 클래스 정의 및 생성자 구현
  ```typescript
  export class OrgContext {
    constructor(
      public readonly orgId: string,
      public readonly user: User,
      public readonly permissions: PermissionsBitField,
      private readonly _subscriptionStatus: number,
    ) {}
  }
  ```
- [ ] State Getters 구현
  - `isBillingActive`: 구독 상태가 ACTIVE인지 확인
  - `isOwner`: ORG_OWNER 권한이 있는지 확인
  - `isManager`: ORG_MANAGE_MEMBERS 권한이 있는지 확인
  - `roleName`: 역할 이름 반환 ('OWNER', 'MANAGER', 'MEMBER')
- [ ] Guard Methods 구현
  - `require(permission: bigint, redirectUrl?)`: 특정 권한 체크
  - `requireBilling()`: 구독 상태 체크
  - `requireOwner()`: OWNER 권한 체크
  - `requireManager()`: MANAGER 권한 체크
- [ ] 타입 정의 (User 타입 import)
- [ ] 에러 처리 (redirect 실패 시)

**1.2.3. CenterContext 클래스 구현**
- [ ] OrgContext와 동일한 구조로 구현
- [ ] Center 관련 권한 상수 사용 (CENTER_VIEW, CENTER_MANAGE_ORGS 등)
- [ ] Center 관련 리디렉션 URL 사용

**1.2.4. react.cache를 사용한 팩토리 함수 구현**

**getOrgContext 구현:**
- [ ] `cache()` import
- [ ] 팩토리 함수 정의
  ```typescript
  export const getOrgContext = cache(async (orgId: string) => {
    // 1. Supabase 클라이언트 생성
    // 2. 사용자 세션 확인
    // 3. JWT에서 memberships 파싱
    // 4. PermissionsBitField 생성
    // 5. OrgContext 인스턴스 반환
  });
  ```
- [ ] 에러 처리 (인증 실패, 멤버십 없음 등)
- [ ] 상세한 JSDoc 주석 추가 (react.cache 동작 설명)

**getCenterContext 구현:**
- [ ] OrgContext와 동일한 패턴으로 구현
- [ ] Center 관련 로직 적용

**1.2.5. 타입 정의**
- [ ] `MembershipData` 타입 정의
  ```typescript
  type MembershipData = [number, string]; // [Status, PermissionsHex]
  ```
- [ ] `MembershipsMap` 타입 정의
  ```typescript
  type MembershipsMap = Record<string, MembershipData>;
  ```

**체크리스트:**
- [ ] Context 클래스가 올바른 타입으로 정의되었는가?
- [ ] Guard Methods가 redirect()를 올바르게 사용하는가?
- [ ] react.cache가 올바르게 적용되었는가?
- [ ] 에러 처리가 충분한가?

### Phase 2: 미들웨어 간소화

#### 2.1. 미들웨어 리팩토링

**목표**: 권한/구독 체크를 Layout으로 이동, 인증만 유지

- [ ] `src/middleware.ts` 파일 확인
- [ ] 기존 권한 체크 로직 제거
  - [ ] 조직 관리 경로 권한 체크 제거
  - [ ] 센터 관리 경로 권한 체크 제거
  - [ ] 구독 상태 체크 제거
- [ ] 인증 체크만 유지
  - [ ] 미인증 사용자 리디렉션
  - [ ] 인증된 사용자 auth 라우트 리디렉션
- [ ] 주석 업데이트 (역할 변경 설명)
- [ ] 테스트 (인증만 체크하는지 확인)

**참고**: 
- 미들웨어는 이제 인증(Authentication)만 담당
- 권한(Authorization)과 구독 체크는 Layout에서 처리

**체크리스트:**
- [ ] 미들웨어가 인증만 체크하는가?
- [ ] 권한/구독 체크 로직이 완전히 제거되었는가?
- [ ] 기존 기능이 정상 작동하는가?

### Phase 3: Layout 리팩토링

#### 3.1. 조직 관리 Layout 리팩토링

**목표**: Context 객체를 사용한 접근 제어로 전환

**3.1.1. 최상위 Layout (org-management/[orgId]/layout.tsx)**
- [ ] 파일 존재 여부 확인
- [ ] `getOrgContext` import
- [ ] Context 객체 생성
  ```typescript
  const ctx = await getOrgContext(params.orgId);
  ```
- [ ] 기본 권한 체크 추가
  ```typescript
  ctx.require(PERMISSIONS.ORG_VIEW);
  ```
- [ ] Context 객체를 하위 컴포넌트에 전달 (필요시)
- [ ] 기존 JWT 직접 파싱 코드 제거

**3.1.2. 보호된 Layout (org-management/[orgId]/(protected)/layout.tsx)**
- [ ] 파일 생성 또는 수정
- [ ] `getOrgContext` import (캐시된 객체 재사용)
- [ ] 구독 상태 체크 추가
  ```typescript
  const ctx = await getOrgContext(params.orgId);
  ctx.requireBilling();
  ```
- [ ] 빌링 페이지는 제외 로직 (이미 billing 경로는 제외되어야 함)

**3.1.3. 특정 권한이 필요한 Layout**
- [ ] OWNER 전용 페이지 Layout (예: settings)
  ```typescript
  ctx.requireOwner();
  ```
- [ ] MANAGER 전용 페이지 Layout
  ```typescript
  ctx.requireManager();
  ```

**체크리스트:**
- [ ] 모든 Layout에서 Context 객체를 사용하는가?
- [ ] Guard Methods가 올바르게 적용되었는가?
- [ ] 기존 기능이 정상 작동하는가?

#### 3.2. 센터 관리 Layout 리팩토링

**목표**: 조직 관리와 동일한 패턴 적용

- [ ] `center-management/[centerId]/layout.tsx` 리팩토링
- [ ] `getCenterContext` 사용
- [ ] Center 관련 권한 체크 적용
- [ ] Center 관련 구독 상태 체크 적용

**체크리스트:**
- [ ] Center Layout이 Org Layout과 동일한 패턴을 따르는가?
- [ ] Center 관련 권한이 올바르게 체크되는가?

### Phase 4: Page 리팩토링

#### 4.1. 조직 관리 Page 리팩토링

**목표**: JWT 직접 파싱 제거, Context 객체 사용

**4.1.1. Dashboard Page**
- [ ] `org-management/[orgId]/dashboard/page.tsx` 확인
- [ ] `getOrgContext` import
- [ ] Context 객체 생성 (캐시 Hit)
- [ ] JWT 직접 파싱 코드 제거
- [ ] Context 객체의 getter 사용
  ```typescript
  {ctx.isOwner && <AdminPanel />}
  {ctx.isBillingActive && <Feature />}
  ```

**4.1.2. Settings Page**
- [ ] `org-management/[orgId]/settings/page.tsx` 확인
- [ ] Context 객체 사용
- [ ] `ctx.requireOwner()` 적용 (OWNER 전용)
- [ ] JWT 직접 파싱 코드 제거

**4.1.3. Members Page**
- [ ] `org-management/[orgId]/members/page.tsx` 확인
- [ ] Context 객체 사용
- [ ] `ctx.requireManager()` 적용 (MANAGER 이상)
- [ ] JWT 직접 파싱 코드 제거

**4.1.4. Billing Page**
- [ ] `org-management/[orgId]/billing/page.tsx` 확인
- [ ] Context 객체 사용
- [ ] 구독 상태 체크는 제외 (billing 페이지는 항상 접근 가능)
- [ ] JWT 직접 파싱 코드 제거

**체크리스트:**
- [ ] 모든 Page에서 Context 객체를 사용하는가?
- [ ] JWT 직접 파싱 코드가 완전히 제거되었는가?
- [ ] UI에서 Context getter를 올바르게 사용하는가?

#### 4.2. 센터 관리 Page 리팩토링

**목표**: 조직 관리와 동일한 패턴 적용

- [ ] `center-management/[centerId]/*/page.tsx` 파일들 확인
- [ ] `getCenterContext` 사용
- [ ] Center 관련 Context getter 사용
- [ ] JWT 직접 파싱 코드 제거

**체크리스트:**
- [ ] Center Page가 Org Page와 동일한 패턴을 따르는가?

### Phase 5: 클라이언트 동기화

#### 5.1. useUserSync Hook 구현

**목표**: 서버 Context 갱신을 위한 클라이언트 Hook 구현

- [ ] `src/hooks/use-user-sync.ts` 파일 생성
- [ ] Hook 구현
  ```typescript
  export function useUserSync() {
    const supabase = createBrowserSupabaseClient();
    const router = useRouter();
    
    const refreshContext = async () => {
      await supabase.auth.refreshSession();
      router.refresh();
    };
    
    return { refreshContext };
  }
  ```
- [ ] 에러 처리 추가
- [ ] 로딩 상태 관리 (선택적)
- [ ] JSDoc 주석 추가

**체크리스트:**
- [ ] Hook이 올바르게 구현되었는가?
- [ ] refreshSession()과 router.refresh()가 올바르게 호출되는가?

#### 5.2. tRPC Mutation에 동기화 로직 추가

**목표**: 상태 변경 시 자동으로 Context 갱신

**5.2.1. 멤버십 관련 Mutation**
- [ ] `features/membership/trpc/membership.router.ts` 확인
- [ ] `inviteUserToEntity` Mutation에 동기화 로직 추가
- [ ] `updateUserPermissions` Mutation에 동기화 로직 추가
- [ ] `removeUserFromEntity` Mutation에 동기화 로직 추가

**5.2.2. 빌링 관련 Mutation**
- [ ] `features/billing/trpc/billing.router.ts` 확인
- [ ] `createCheckoutSession` Mutation 후 동기화 (결제 성공 시)
- [ ] `createBillingPortalSession` Mutation 후 동기화 (구독 변경 시)

**5.2.3. 패턴 표준화**
- [ ] tRPC Mutation 성공 시 자동 호출 패턴 정의
- [ ] 유틸리티 함수 생성 (선택적)
  ```typescript
  // 예시: tRPC Mutation wrapper
  export function withContextRefresh<T>(
    mutation: MutationFunction<T>,
    onSuccess?: () => void
  ) {
    // ...
  }
  ```

**체크리스트:**
- [ ] 모든 상태 변경 Mutation에 동기화 로직이 추가되었는가?
- [ ] 동기화 패턴이 일관되게 적용되었는가?

#### 5.3. 클라이언트 컴포넌트에서 사용

**목표**: 상태 변경 후 Context 갱신

- [ ] 결제 성공 페이지에서 `useUserSync` 사용
- [ ] 멤버 초대 수락 페이지에서 `useUserSync` 사용
- [ ] 플랜 업그레이드 완료 시 `useUserSync` 사용
- [ ] 권한 변경 완료 시 `useUserSync` 사용

**체크리스트:**
- [ ] 모든 상태 변경 지점에서 동기화가 호출되는가?

### Phase 6: 테스트 및 검증

#### 6.1. 기능 테스트

**목표**: 리팩토링 후 기능이 정상 작동하는지 확인

- [ ] 인증 테스트
  - [ ] 미인증 사용자 접근 차단
  - [ ] 인증된 사용자 정상 접근
- [ ] 권한 테스트
  - [ ] 권한 없는 사용자 접근 차단
  - [ ] 권한 있는 사용자 정상 접근
  - [ ] OWNER 전용 페이지 접근 제어
  - [ ] MANAGER 전용 페이지 접근 제어
- [ ] 구독 상태 테스트
  - [ ] 비활성 구독 사용자 빌링 페이지 리디렉션
  - [ ] 활성 구독 사용자 정상 접근
  - [ ] 빌링 페이지는 항상 접근 가능
- [ ] Context 캐싱 테스트
  - [ ] Layout과 Page에서 동일한 Context 인스턴스 사용 확인
  - [ ] react.cache가 올바르게 작동하는지 확인

**체크리스트:**
- [ ] 모든 기능이 정상 작동하는가?
- [ ] 성능이 개선되었는가? (DB 조회 감소)

#### 6.2. 에러 처리 테스트

**목표**: 에러 상황에서도 안정적으로 작동하는지 확인

- [ ] JWT가 없는 경우 처리
- [ ] memberships가 없는 경우 처리
- [ ] 잘못된 orgId/centerId 접근 시 처리
- [ ] redirect() 실패 시 처리

**체크리스트:**
- [ ] 모든 에러 상황이 올바르게 처리되는가?

#### 6.3. 클라이언트 동기화 테스트

**목표**: 상태 변경 후 Context 갱신이 올바르게 작동하는지 확인

- [ ] 멤버 초대 후 권한 정보 갱신 확인
- [ ] 권한 변경 후 권한 정보 갱신 확인
- [ ] 결제 성공 후 구독 상태 갱신 확인
- [ ] 구독 변경 후 구독 상태 갱신 확인

**체크리스트:**
- [ ] 상태 변경 후 Context가 올바르게 갱신되는가?
- [ ] UI가 최신 상태를 반영하는가?

### Phase 7: 문서화 및 정리

#### 7.1. 코드 문서화

- [ ] Context 클래스 JSDoc 주석 완성
- [ ] 팩토리 함수 JSDoc 주석 완성
- [ ] Guard Methods 사용 예시 추가
- [ ] react.cache 동작 방식 설명 추가

#### 7.2. 아키텍처 문서 업데이트

- [ ] `docs/rules/5.1.md` v6.0 섹션 추가
- [ ] Context-Driven Architecture 가이드 작성
- [ ] 마이그레이션 가이드 작성 (v5.6 → v6.0)
- [ ] Best Practices 문서 작성
- [ ] Troubleshooting 가이드 작성

#### 7.3. 코드 리뷰 및 정리

- [ ] 사용하지 않는 코드 제거
- [ ] 중복 코드 제거
- [ ] 타입 안전성 확인
- [ ] 코드 스타일 일관성 확인

## 우선순위

### 높음 (즉시 구현)
1. Phase 1: 핵심 인프라 구축
2. Phase 2: 미들웨어 간소화
3. Phase 3: Layout 리팩토링

### 중간 (단계적 구현)
4. Phase 4: Page 리팩토링
5. Phase 5: 클라이언트 동기화

### 낮음 (선택적)
6. Phase 6: 테스트 및 검증
7. Phase 7: 문서화 및 정리

## 주의사항

1. **react.cache 동작 방식 이해 필수**
   - 동일한 요청 내에서만 캐싱됨
   - 요청 간에는 캐싱되지 않음
   - 서버 컴포넌트에서만 사용 가능

2. **미들웨어와 Layout의 역할 분담**
   - 미들웨어: 인증(Authentication)만 담당
   - Layout: 권한(Authorization)과 구독 체크 담당

3. **클라이언트 동기화 패턴 표준화**
   - 모든 상태 변경 Mutation에 동기화 로직 추가
   - 일관된 패턴 사용

4. **에러 처리**
   - redirect()는 항상 throw하므로 안전
   - 하지만 명시적 에러 처리 추가 고려

5. **타입 안전성**
   - User 타입, MembershipData 타입 등 명확히 정의
   - any 타입 사용 지양

## 참고 문서

- [v6.0 아키텍처 명세](./auth_permissions_251130.md)
- [v6.0 검토 결과](./auth_permissions_251130_review.md)
- [v5.6 룰](./auth_permissions_251124.md)
- [기존 룰: 5.1.md](../rules/5.1.md)
- [Next.js App Router - Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [React cache() API](https://react.dev/reference/react/cache)

## 진행 상황 추적

**시작일**: 2025-01-30  
**예상 완료일**: TBD  
**현재 단계**: Planning

### 완료된 작업
- [ ] Phase 1 완료
- [ ] Phase 2 완료
- [ ] Phase 3 완료
- [ ] Phase 4 완료
- [ ] Phase 5 완료
- [ ] Phase 6 완료
- [ ] Phase 7 완료

### 진행 중인 작업
- 현재 진행 중인 작업 없음

### 차단 사항
- 차단 사항 없음

