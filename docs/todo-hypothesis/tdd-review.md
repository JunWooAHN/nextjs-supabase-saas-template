# 프로젝트 TDD 아키텍처 검토 보고서

**검토 일시**: 2025년 11월 16일  
**프로젝트**: prove-geo-next-supa-saas  
**검토 범위**: TDD 아키텍처, 테스트 전략, 테스트 커버리지, 테스트 인프라

---

## 전체 평가 요약

| 항목 | 점수 | 평가 |
|------|------|------|
| **TDD 아키텍처** | 3/10 | 미흡 |
| **테스트 커버리지** | 2/10 | 매우 낮음 |
| **테스트 인프라** | 4/10 | 보통 |
| **테스트 전략** | 2/10 | 매우 낮음 |
| **TDD 사이클 준수** | 1/10 | 매우 낮음 |

---

## 1. 현재 테스트 상태 분석

### 1.1 테스트 파일 현황

#### ✅ 존재하는 테스트
- `tests/auth-setup.spec.ts` - 인증 설정 E2E 테스트 (1개)
- `tests/route-smoke.spec.ts` - 라우트 스모크 E2E 테스트 (여러 개)

#### ❌ 부재하는 테스트
- 단위 테스트: 0개
- 통합 테스트: 0개
- 컴포넌트 테스트: 0개
- API 라우트 테스트: 0개

### 1.2 테스트 커버리지

**예상 커버리지: < 10%**

| 계층 | 커버리지 | 상태 |
|------|----------|------|
| 유틸리티 함수 | 0% | ❌ |
| 비즈니스 로직 | 0% | ❌ |
| API 라우트 | 0% | ❌ |
| 컴포넌트 | 0% | ❌ |
| E2E 플로우 | ~30% | ⚠️ |

### 1.3 테스트 인프라

#### ✅ 현재 설정
- Playwright E2E 테스트 설정 완료
- 테스트 스크립트: `test`, `test:ui`, `test:headed`
- CI/CD 통합 가능 (설정 필요)

#### ❌ 부재하는 인프라
- 단위 테스트 프레임워크 (Vitest/Jest) 없음
- 테스트 유틸리티/헬퍼 부재
- Mock/Stub 인프라 없음
- 커버리지 리포트 설정 없음

---

## 2. TDD 아키텍처 평가

### 2.1 TDD 사이클 준수도

#### ❌ 현재 상태: 미준수 (1/10)

```
TDD 사이클: Red → Green → Refactor
현재 상태: Green (코드 작성) → (테스트 작성) → (리팩토링 없음)
```

**문제점:**
- 코드를 먼저 작성하고 나중에 테스트 추가
- 테스트가 코드를 주도하지 않음
- 리팩토링 단계가 없음

**예시:**
```typescript
// 현재 방식: 코드 먼저 작성
// 1. sign-up-form.tsx 작성
// 2. 나중에 E2E 테스트 추가

// TDD 방식: 테스트 먼저 작성
// 1. 테스트 작성 (실패)
// 2. 최소한의 코드 작성 (성공)
// 3. 리팩토링
```

### 2.2 테스트 전략 부재

#### ❌ 문제점

**2.2.1 테스트 피라미드 미구축**
```
현재:        목표:
  /\
 /E2E\      /E2E\
/    \     /    \
        /Unit\  /Integration\
       /      \ /          \
```

**2.2.2 테스트 격리 부족**
```typescript
// tests/auth-setup.spec.ts
// ❌ 문제: 실제 데이터베이스에 의존
// ❌ 문제: 테스트 간 상태 공유 가능성
// ❌ 문제: 테스트 순서에 의존적일 수 있음
```

**2.2.3 Mock/Stub 부재**
- 외부 의존성 Mock 불가
- 데이터베이스 Mock 없음
- API 호출 Mock 없음

### 2.3 테스트 가능성 문제

#### ⚠️ 테스트하기 어려운 구조

**2.3.1 하드코딩된 의존성**
```typescript
// ❌ 문제: 직접 import로 의존성 하드코딩
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

// ✅ 개선: 의존성 주입 가능한 구조
export function SignUpForm({ supabaseClient }) { /* ... */ }
```

**2.3.2 비즈니스 로직이 컴포넌트에 혼재**
```typescript
// ❌ 문제: 비즈니스 로직이 컴포넌트에 있음
export function SignUpForm() {
  const handleSubmit = async () => {
    // 비즈니스 로직이 여기에...
  };
}

// ✅ 개선: 비즈니스 로직을 서비스로 분리
export function SignUpForm() {
  const handleSubmit = async () => {
    await authService.signUp(data);
  };
}
```

---

## 3. 테스트 전략 제안

### 3.1 테스트 피라미드 구축

#### 목표 구조
```
        /\
       /E2E\        (10%) - 사용자 시나리오 검증
      /    \
     /      \
    /Integration\   (30%) - API, DB 연동 테스트
   /            \
  /              \
 /    Unit Tests  \  (60%) - 함수, 컴포넌트 단위 테스트
/                  \
```

### 3.2 테스트 전략

#### 3.2.1 단위 테스트 (60%)
**대상:**
- 유틸리티 함수 (`lib/utils.ts`)
- API 에러 핸들러 (`lib/api/errors.ts`)
- Supabase 클라이언트 팩토리
- 인증 세션 유틸리티
- 순수 함수들

**도구:** Vitest

#### 3.2.2 통합 테스트 (30%)
**대상:**
- API 라우트 (`app/api/**`)
- 미들웨어 (`middleware.ts`)
- 데이터베이스 연동
- 외부 서비스 연동

**도구:** Vitest + MSW (Mock Service Worker)

#### 3.2.3 E2E 테스트 (10%)
**대상:**
- 사용자 시나리오
- 인증 플로우
- 라우트 보호

**도구:** Playwright (현재 사용 중)

---

## 4. 구체적 개선 방안

### 4.1 테스트 인프라 구축

#### 4.1.1 Vitest 설정 추가

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### 4.1.2 테스트 유틸리티 작성

```typescript
// tests/utils/test-helpers.ts
export async function createTestUser() { /* ... */ }
export async function cleanupTestUser() { /* ... */ }
export function mockSupabaseClient() { /* ... */ }
export function createMockRequest() { /* ... */ }
```

#### 4.1.3 테스트 스크립트 추가

```json
// package.json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest --coverage",
    "test:all": "pnpm test:unit && pnpm test:e2e"
  }
}
```

### 4.2 단위 테스트 추가

#### 4.2.1 유틸리티 함수 테스트

```typescript
// src/lib/utils.test.ts
import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });
  
  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });
  
  it('should handle Tailwind class conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
```

#### 4.2.2 API 에러 핸들러 테스트

```typescript
// src/lib/api/errors.test.ts
import { describe, it, expect } from 'vitest';
import { errorResponse, okResponse } from './errors';

describe('errorResponse', () => {
  it('should return standardized error format', async () => {
    const response = errorResponse('TEST_ERROR', 'Test message');
    const body = await response.json();
    
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('TEST_ERROR');
    expect(body.error.message).toBe('Test message');
    expect(body.timestamp).toBeDefined();
  });
  
  it('should include details when provided', async () => {
    const response = errorResponse('VALIDATION_ERROR', 'Invalid input', {
      details: { field: 'email' },
    });
    const body = await response.json();
    
    expect(body.error.details).toEqual({ field: 'email' });
  });
});

describe('okResponse', () => {
  it('should return success response with data', async () => {
    const response = okResponse({ data: 'test' });
    const body = await response.json();
    
    expect(response.status).toBe(200);
    expect(body.data).toBe('test');
    expect(body.timestamp).toBeDefined();
  });
});
```

### 4.3 통합 테스트 추가

#### 4.3.1 API 라우트 테스트

```typescript
// src/app/api/auth/signout/route.test.ts
import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';
import { createServerSupabaseClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server');

describe('POST /api/auth/signout', () => {
  it('should sign out user and redirect', async () => {
    const mockSupabase = {
      auth: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };
    
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any);
    
    const request = new Request('http://localhost/api/auth/signout', {
      method: 'POST',
    });
    
    const response = await POST(request);
    
    expect(response.status).toBe(302);
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });
});
```

#### 4.3.2 미들웨어 테스트

```typescript
// src/middleware.test.ts
import { describe, it, expect } from 'vitest';
import { middleware } from './middleware';

describe('middleware', () => {
  it('should redirect unauthenticated users from protected routes', async () => {
    // 테스트 구현
  });
  
  it('should allow authenticated users to access protected routes', async () => {
    // 테스트 구현
  });
});
```

### 4.4 CI/CD 통합

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test:unit
      - run: pnpm test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test:e2e
```

---

## 5. TDD 문화 정착 방안

### 5.1 TDD 가이드 작성

**문서:** `docs/TDD_GUIDE.md`

**내용:**
- TDD 사이클 설명 (Red → Green → Refactor)
- 테스트 작성 가이드
- Mock/Stub 사용법
- 테스트 작성 예시

### 5.2 코드 리뷰 체크리스트 업데이트

**필수 항목:**
- [ ] 새 기능에 대한 테스트 작성 여부
- [ ] 테스트 커버리지 확인
- [ ] 테스트가 실제로 실패하는지 확인 (TDD)
- [ ] Mock/Stub 사용 적절성

### 5.3 점진적 도입 전략

**Phase 1: 새 기능만 TDD (1개월)**
- 새 기능은 반드시 TDD로 작성
- 기존 코드는 유지

**Phase 2: 리팩토링 시 TDD (2개월)**
- 리팩토링 전 테스트 작성
- 테스트 통과 확인 후 리팩토링

**Phase 3: 전체 TDD 전환 (지속)**
- 모든 코드 변경에 TDD 적용

---

## 6. 개선 로드맵

### Phase 1: 테스트 인프라 구축 (1-2주)
1. ✅ Vitest 설정 추가
2. ✅ 테스트 유틸리티 작성
3. ✅ 테스트 스크립트 추가
4. ✅ CI/CD 파이프라인 구축

### Phase 2: 핵심 로직 테스트 (2-3주)
1. ✅ 유틸리티 함수 단위 테스트
2. ✅ API 라우트 통합 테스트
3. ✅ 비즈니스 로직 단위 테스트
4. ✅ 미들웨어 통합 테스트

### Phase 3: TDD 문화 정착 (지속)
1. ✅ TDD 가이드 문서 작성
2. ✅ 코드 리뷰 체크리스트 업데이트
3. ✅ 새 기능은 TDD로 작성
4. ✅ 리팩토링 시 테스트 먼저 작성

### Phase 4: 커버리지 목표 달성 (지속)
1. ✅ 커버리지 목표 설정 (60%)
2. ✅ 커버리지 리포트 자동화
3. ✅ 커버리지 모니터링

---

## 7. 종합 평가

### 현재 상태
- **TDD 아키텍처**: 미흡 (3/10)
  - E2E 테스트만 존재
  - 단위/통합 테스트 부재
  - TDD 사이클 미준수

### 결론

프로젝트는 **TDD 측면에서 개선이 시급**합니다. 

현재는 **"테스트 가능한 코드"** 수준이며, **"테스트 주도 개발"**로 전환하는 것이 다음 단계입니다.

**우선순위:**
1. 테스트 인프라 구축 (Vitest, 테스트 유틸리티)
2. 핵심 로직 단위 테스트 작성
3. TDD 사이클 도입 및 문화 정착

E2E 테스트만으로는 충분하지 않으며, 단위/통합 테스트를 추가하고 TDD 사이클을 도입하면 코드 품질과 유지보수성이 크게 향상될 것입니다.


