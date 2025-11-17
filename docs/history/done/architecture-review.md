# 프로젝트 구조 변경 필요성 검토 보고서

**검토 일시**: 2025년 11월 17일  
**프로젝트**: prove-geo-next-supa-saas  
**검토 범위**: Clean Code Review + Feature-Based Architecture Proposal

> ⚠️ **중요**: 이 문서는 현재 프로젝트 규모(약 50개 파일)를 기준으로 작성되었습니다.  
> **v5.0 계획서를 반영한 재검토 보고서**는 [`architecture-review-v5.md`](./architecture-review-v5.md)를 참조하세요.  
> v5.0 계획에 따르면 프로젝트가 150-200개 파일로 확장될 예정이므로, **구조 변경이 필수적**입니다.

---

## 실행 요약

### 현재 상태
- **프로젝트 규모**: 소규모 SaaS 템플릿 (Auth, Settings, Dashboard)
- **코드 품질**: 양호 (Clean Code 7/10, 구조 8/10)
- **현재 구조**: 레이어 기반 (components/, lib/, hooks/)
- **Supabase 클라이언트 사용**: 17개 파일에서 사용

### 검토 결과
**결론: 현재 단계에서는 대규모 구조 변경이 필요하지 않음**

**이유:**
1. 프로젝트 규모가 작아 복잡도가 낮음
2. 현재 구조가 명확하고 잘 작동함
3. 구조 변경 비용 대비 이득이 제한적
4. 점진적 개선이 더 적합함

---

## 1. 현재 프로젝트 분석

### 1.1 프로젝트 규모

```
현재 기능:
- 인증 (Auth): 3개 컴포넌트, 2개 라우트
- 설정 (Settings): 4개 컴포넌트
- 대시보드 (Dashboard): 1개 페이지
- 공통 UI: 15개 컴포넌트

총 파일 수: 약 50개 (소규모)
```

### 1.2 현재 구조 평가

**✅ 장점:**
- 명확한 레이어 분리 (components/, lib/, hooks/)
- Next.js App Router 패턴 준수
- 관심사 분리가 잘 되어 있음
- 코드가 간결하고 이해하기 쉬움

**⚠️ 개선 가능한 부분:**
- 기능별 코드 분산 (auth 관련 코드가 여러 곳에 분산)
- 의존성 하드코딩 (Supabase 클라이언트 직접 import)
- 테스트 어려움 (Mock 불가)

---

## 2. 제안사항 검토

### 2.1 Clean Code Review 제안사항

#### ✅ 즉시 적용 가능 (우선순위 높음)

**1. 매직 넘버/문자열 제거**
- **비용**: 낮음 (1-2시간)
- **이득**: 높음 (코드 가독성 향상)
- **권장**: ✅ 즉시 적용

**2. 긴 함수 분리**
- **비용**: 중간 (2-4시간)
- **이득**: 중간 (유지보수성 향상)
- **권장**: ✅ 점진적 적용

**3. 주석 추가 (JSDoc)**
- **비용**: 낮음 (1-2시간)
- **이득**: 중간 (문서화 향상)
- **권장**: ✅ 점진적 적용

#### ⚠️ 장기 검토 필요 (우선순위 낮음)

**4. 도메인 모델 도입**
- **비용**: 높음 (1-2주)
- **이득**: 낮음 (현재 규모에서는 과도함)
- **권장**: ❌ 현재 단계에서는 불필요

**5. 의존성 주입 패턴**
- **비용**: 중간-높음 (1주)
- **이득**: 중간 (테스트 용이성)
- **권장**: ⚠️ 선택적 (테스트 필요 시)

### 2.2 Feature-Based Architecture 제안사항

#### ✅ 점진적 도입 고려 (우선순위 중간)

**1. 피처 베이스드 구조 도입**
- **비용**: 중간 (1-2주)
- **이득**: 중간 (코드 조직화)
- **권장**: ⚠️ 선택적 (새 피처 추가 시)

**2. 의존성 주입 컨테이너**
- **비용**: 중간 (1주)
- **이득**: 중간 (테스트 용이성)
- **권장**: ⚠️ 선택적 (테스트 필요 시)

---

## 3. 구조 변경 필요성 평가

### 3.1 변경이 필요한 경우

**✅ 변경 권장:**
- 프로젝트가 100개 이상 파일로 확장될 때
- 5개 이상의 독립적인 피처가 추가될 때
- 단위 테스트 작성이 필수적일 때
- 여러 개발자가 동시에 작업할 때

**현재 프로젝트 상태:**
- 파일 수: 약 50개
- 피처 수: 3개 (Auth, Settings, Dashboard)
- 개발자 수: 소규모
- 테스트: E2E 위주

**결론**: 현재는 구조 변경이 필요하지 않음

### 3.2 현재 구조의 적합성

**현재 레이어 기반 구조가 적합한 이유:**

1. **명확성**: 각 레이어의 역할이 명확함
   ```
   components/ → UI 컴포넌트
   lib/        → 비즈니스 로직/유틸리티
   hooks/      → 재사용 가능한 로직
   app/        → 라우팅
   ```

2. **Next.js 패턴**: App Router의 표준 구조와 일치

3. **유지보수성**: 작은 프로젝트에서는 충분히 관리 가능

4. **학습 곡선**: 새로운 개발자가 빠르게 이해 가능

---

## 4. 실용적 개선 방안

### 4.1 즉시 적용 가능한 개선 (Phase 1)

#### 1. 매직 넘버/문자열 상수화

**작업:**
```typescript
// tests/constants.ts (신규 생성)
export const TEST_TIMEOUTS = {
  SIGNUP: 3000,
  LOGIN: 2000,
  PAGE_LOAD: 5000,
} as const;

// lib/constants.ts (신규 생성)
export const AUTH_MESSAGES = {
  SIGNUP_SUCCESS: 'Check your email for the confirmation link!',
  SIGNIN_SUCCESS: 'Successfully signed in!',
  ERROR_UNEXPECTED: 'An unexpected error occurred',
} as const;
```

**예상 시간**: 1-2시간  
**우선순위**: 높음

#### 2. 테스트 헬퍼 함수 추출

**작업:**
```typescript
// tests/helpers/auth-helpers.ts (신규 생성)
export async function signUpUser(page, userData) { /* ... */ }
export async function signInUser(page, email, password) { /* ... */ }
```

**예상 시간**: 2-3시간  
**우선순위**: 중간

#### 3. 핵심 함수에 JSDoc 추가

**작업:**
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/auth/actions.ts`
- `middleware.ts`

**예상 시간**: 2-3시간  
**우선순위**: 중간

### 4.2 점진적 개선 (Phase 2)

#### 1. 비즈니스 로직 분리 (Service 계층)

**현재:**
```typescript
// components/auth/sign-up-form.tsx
const supabase = createBrowserSupabaseClient();
await supabase.auth.signUp({ ... });
```

**개선:**
```typescript
// lib/auth/services/sign-up.service.ts (신규)
export async function signUp(data: SignUpData) {
  const supabase = createBrowserSupabaseClient();
  return await supabase.auth.signUp({ ... });
}

// components/auth/sign-up-form.tsx
import { signUp } from '@/lib/auth/services/sign-up.service';
await signUp({ email, password, fullName });
```

**예상 시간**: 4-6시간  
**우선순위**: 낮음 (필요 시)

**장점:**
- 비즈니스 로직 재사용 가능
- 컴포넌트는 UI만 담당
- 테스트 용이성 향상

**단점:**
- 현재 규모에서는 과도할 수 있음
- 추가 파일 생성

#### 2. 커스텀 훅으로 로직 분리

**현재:**
```typescript
// components/auth/sign-up-form.tsx
const [isLoading, setIsLoading] = useState(false);
const handleSubmit = async () => { /* ... */ };
```

**개선:**
```typescript
// hooks/use-sign-up.ts (신규)
export function useSignUp() {
  const [isLoading, setIsLoading] = useState(false);
  const signUp = async (data) => { /* ... */ };
  return { signUp, isLoading };
}

// components/auth/sign-up-form.tsx
const { signUp, isLoading } = useSignUp();
```

**예상 시간**: 2-3시간  
**우선순위**: 중간

### 4.3 장기 검토 (Phase 3)

#### 1. 피처 베이스드 구조 도입

**시기:**
- 새 피처가 3개 이상 추가될 때
- 프로젝트가 100개 이상 파일로 확장될 때

**방식:**
- 기존 코드는 유지
- 새 피처만 피처 베이스드로 작성
- 점진적 마이그레이션

#### 2. 의존성 주입 도입

**시기:**
- 단위 테스트 작성이 필수적일 때
- 여러 구현체를 교체해야 할 때

**방식:**
- React Context 기반 경량 DI
- 복잡한 라이브러리 없이 구현

---

## 5. 권장 사항

### 5.1 즉시 적용 (이번 주)

1. ✅ **매직 넘버/문자열 상수화**
   - `tests/constants.ts` 생성
   - `lib/constants.ts` 생성
   - 하드코딩된 값 제거

2. ✅ **테스트 헬퍼 함수 추출**
   - `tests/helpers/` 디렉토리 생성
   - 공통 테스트 로직 분리

### 5.2 점진적 적용 (다음 2-3주)

1. ⚠️ **JSDoc 주석 추가**
   - 핵심 함수부터 시작
   - 공개 API 우선

2. ⚠️ **커스텀 훅으로 로직 분리**
   - `useSignUp`, `useSignIn` 등
   - 컴포넌트 로직 분리

### 5.3 장기 검토 (필요 시)

1. ⚠️ **Service 계층 도입**
   - 비즈니스 로직이 복잡해질 때
   - 재사용이 필요할 때

2. ⚠️ **피처 베이스드 구조**
   - 프로젝트가 확장될 때
   - 새 피처 추가 시

3. ⚠️ **의존성 주입**
   - 단위 테스트 필요 시
   - Mock이 필수적일 때

---

## 6. 구조 변경 vs 점진적 개선

### 6.1 구조 변경의 비용

**대규모 구조 변경 시:**
- 리팩토링 시간: 1-2주
- 테스트 시간: 1주
- 학습 곡선: 새로운 개발자 적응 시간
- 리스크: 기존 코드 동작 보장 필요

**현재 프로젝트 규모에서는:**
- 비용 > 이득
- 불필요한 복잡도 증가

### 6.2 점진적 개선의 이점

**점진적 개선 시:**
- 즉시 적용 가능한 개선부터 시작
- 리스크 최소화
- 필요할 때만 구조 변경
- 유연성 유지

**권장 접근:**
1. 즉시 적용 가능한 개선 (매직 넘버, 헬퍼 함수)
2. 점진적 개선 (훅 분리, 주석 추가)
3. 필요 시 구조 변경 (피처 베이스드, DI)

---

## 7. 결론 및 권장사항

### 7.1 현재 단계 권장사항

**✅ 즉시 적용:**
1. 매직 넘버/문자열 상수화
2. 테스트 헬퍼 함수 추출

**⚠️ 점진적 적용:**
1. JSDoc 주석 추가
2. 커스텀 훅으로 로직 분리

**❌ 현재 단계에서 불필요:**
1. 대규모 구조 변경 (피처 베이스드)
2. 의존성 주입 컨테이너
3. 도메인 모델 도입

### 7.2 장기 로드맵

**프로젝트 확장 시점에 검토:**
- 파일 수가 100개 이상일 때
- 피처가 5개 이상일 때
- 단위 테스트가 필수적일 때
- 여러 개발자가 동시 작업할 때

**그때 고려할 사항:**
1. 피처 베이스드 구조 도입
2. 의존성 주입 패턴 적용
3. Service 계층 구축

### 7.3 최종 결론

**현재 프로젝트는 구조 변경이 필요하지 않습니다.**

**이유:**
1. 프로젝트 규모가 작아 현재 구조로 충분
2. 코드 품질이 양호함 (7-8/10)
3. 구조 변경 비용 대비 이득이 제한적
4. 점진적 개선이 더 적합

**대신 권장하는 접근:**
1. 즉시 적용 가능한 개선부터 시작
2. 코드 품질 향상에 집중
3. 필요할 때만 구조 변경 검토
4. 유연성과 실용성 균형 유지

---

## 8. 다음 단계

### 8.1 즉시 실행 가능한 작업

1. **매직 넘버 상수화**
   ```bash
   # 파일 생성
   - tests/constants.ts
   - lib/constants.ts
   ```

2. **테스트 헬퍼 함수 추출**
   ```bash
   # 디렉토리 생성
   - tests/helpers/auth-helpers.ts
   ```

3. **JSDoc 주석 추가**
   - 핵심 함수부터 시작
   - 공개 API 우선

### 8.2 점진적 개선 작업

1. **커스텀 훅 분리**
   - `hooks/use-sign-up.ts`
   - `hooks/use-sign-in.ts`

2. **비즈니스 로직 분리** (필요 시)
   - `lib/auth/services/` 디렉토리
   - Service 함수 생성

### 8.3 모니터링 포인트

**구조 변경을 고려해야 하는 시점:**
- 파일 수가 100개 이상
- 피처가 5개 이상
- 코드 중복이 증가
- 유지보수가 어려워짐
- 테스트 작성이 어려워짐

**그때 다시 검토:**
- 피처 베이스드 아키텍처
- 의존성 주입 패턴
- 도메인 모델 도입

---

**검토 완료일**: 2025년 11월 17일  
**다음 검토 시점**: 프로젝트 확장 시 (파일 수 100개 이상 또는 피처 5개 이상)

---

## 📌 v5.0 계획 반영 참고

**v5.0 계획서** (`docs/history/rule/5.0.md`)를 검토한 결과, 이 문서의 결론이 변경되었습니다.

**v5.0 계획 요약:**
- 프로젝트가 엔터프라이즈급 복잡도로 확장 (150-200개 파일 예상)
- 7가지 사용자 역할, 10개 이상의 데이터베이스 테이블
- 복잡한 비즈니스 로직 (비트 연산 권한, 구독/결제 시스템)
- 여러 라우트 그룹 및 Server Actions

**v5.0 반영 검토 결과:**
- ✅ **구조 변경이 필수적**
- ✅ **피처 베이스드 아키텍처 도입 권장**
- ✅ **Service 계층 구축 필요**

**상세한 검토 내용은 [`architecture-review-v5.md`](./architecture-review-v5.md)를 참조하세요.**

