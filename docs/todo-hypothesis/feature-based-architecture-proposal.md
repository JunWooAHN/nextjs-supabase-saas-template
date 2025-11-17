# 피처 베이스드 아키텍처 & 의존성 주입 도입 제안서

**작성 일시**: 2025년 11월 16일  
**프로젝트**: prove-geo-next-supa-saas  
**목표**: 최소한의 코드 변경으로 피처 베이스드 아키텍처와 의존성 주입 도입

---

## 1. 현재 구조 분석

### 1.1 현재 아키텍처

```
src/
├── app/                    # Next.js App Router (라우트)
│   ├── (marketing)/       # 공개 페이지
│   ├── (protected)/       # 인증 필요 페이지
│   └── api/              # API 라우트
├── components/            # 레이어 기반 구조
│   ├── auth/             # 인증 컴포넌트
│   ├── settings/          # 설정 컴포넌트
│   └── ui/               # 공통 UI 컴포넌트
├── lib/                   # 유틸리티 레이어
│   ├── supabase/         # Supabase 클라이언트
│   ├── auth/             # 인증 유틸리티
│   └── api/              # API 유틸리티
└── hooks/                # 커스텀 훅
```

### 1.2 현재 문제점

#### 의존성 하드코딩
```typescript
// ❌ 문제: 직접 import로 의존성 하드코딩
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function SignUpForm() {
  const supabase = createBrowserSupabaseClient(); // 하드코딩
}
```

#### 기능별 코드 분산
- 인증 관련 코드가 `components/auth/`, `lib/auth/`, `app/(marketing)/login/` 등에 분산
- 피처 단위로 관리 어려움

#### 테스트 어려움
- 의존성 Mock 불가
- 단위 테스트 작성 어려움

---

## 2. 제안하는 구조

### 2.1 피처 베이스드 아키텍처 (점진적 도입)

**원칙:**
- 기존 구조는 최대한 유지
- 새 피처는 피처 베이스드로 작성
- 기존 코드는 점진적으로 마이그레이션

**새 구조:**
```
src/
├── app/                    # Next.js App Router (변경 없음)
│   ├── (marketing)/
│   ├── (protected)/
│   └── api/
├── features/              # 🆕 피처 베이스드 구조
│   ├── auth/
│   │   ├── components/    # 인증 관련 컴포넌트만
│   │   ├── hooks/         # 인증 관련 훅
│   │   ├── services/      # 인증 비즈니스 로직
│   │   ├── types/         # 인증 관련 타입
│   │   └── index.ts       # Public API
│   ├── settings/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   └── dashboard/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── index.ts
├── components/            # 공통 컴포넌트 (유지)
│   └── ui/               # shadcn/ui 컴포넌트
├── lib/                  # 공통 라이브러리 (유지)
│   ├── di/               # 🆕 의존성 주입
│   ├── supabase/         # 인프라 (유지)
│   └── utils.ts
└── hooks/                # 공통 훅 (유지)
```

### 2.2 의존성 주입 패턴

**React Context 기반 경량 DI 패턴 사용**

```typescript
// lib/di/container.ts
// 경량 DI 컨테이너 (복잡한 라이브러리 없이 구현)
```

---

## 3. 구체적 구현 방안

### 3.1 Phase 1: 의존성 주입 인프라 구축 (최소 변경)

#### 3.1.1 DI 컨테이너 생성

```typescript
// lib/di/container.ts
type ServiceFactory<T> = () => T;
type ServiceKey = string | symbol;

class DIContainer {
  private services = new Map<ServiceKey, ServiceFactory<any>>();
  private instances = new Map<ServiceKey, any>();

  register<T>(key: ServiceKey, factory: ServiceFactory<T>): void {
    this.services.set(key, factory);
  }

  resolve<T>(key: ServiceKey): T {
    if (this.instances.has(key)) {
      return this.instances.get(key);
    }

    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service ${String(key)} not found`);
    }

    const instance = factory();
    this.instances.set(key, instance);
    return instance;
  }

  clear(): void {
    this.instances.clear();
  }
}

export const container = new DIContainer();

// 서비스 키 정의
export const SERVICE_KEYS = {
  SUPABASE_CLIENT: Symbol('SUPABASE_CLIENT'),
  SUPABASE_SERVER: Symbol('SUPABASE_SERVER'),
  AUTH_SERVICE: Symbol('AUTH_SERVICE'),
} as const;
```

#### 3.1.2 서비스 등록

```typescript
// lib/di/setup.ts
import { container, SERVICE_KEYS } from './container';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// 기본 구현 등록 (기존 코드와 호환)
container.register(SERVICE_KEYS.SUPABASE_CLIENT, () => {
  return createBrowserSupabaseClient();
});

container.register(SERVICE_KEYS.SUPABASE_SERVER, async () => {
  return await createServerSupabaseClient();
});

// 테스트용 Mock 등록 가능
if (process.env.NODE_ENV === 'test') {
  container.register(SERVICE_KEYS.SUPABASE_CLIENT, () => {
    return mockSupabaseClient();
  });
}
```

#### 3.1.3 React Hook으로 DI 사용

```typescript
// lib/di/use-service.ts
import { useContext, createContext } from 'react';
import { container, SERVICE_KEYS } from './container';

const DIContext = createContext(container);

export function useService<T>(key: symbol): T {
  const di = useContext(DIContext);
  return di.resolve<T>(key);
}

// 편의 훅
export function useSupabaseClient() {
  return useService(SERVICE_KEYS.SUPABASE_CLIENT);
}
```

### 3.2 Phase 2: 첫 번째 피처 마이그레이션 (Auth)

#### 3.2.1 Auth 피처 구조 생성

```
src/features/auth/
├── components/
│   ├── sign-in-form.tsx      # components/auth/에서 이동
│   ├── sign-up-form.tsx      # components/auth/에서 이동
│   └── oauth-buttons.tsx     # components/auth/에서 이동
├── hooks/
│   ├── use-sign-in.ts        # 새로 작성
│   ├── use-sign-up.ts        # 새로 작성
│   └── use-auth.ts           # 새로 작성
├── services/
│   └── auth.service.ts       # 비즈니스 로직 분리
├── types/
│   └── index.ts              # 타입 정의
└── index.ts                  # Public API
```

#### 3.2.2 Auth Service 생성

```typescript
// features/auth/services/auth.service.ts
import { container, SERVICE_KEYS } from '@/lib/di/container';

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthService {
  signUp(data: SignUpData): Promise<{ error: Error | null }>;
  signIn(email: string, password: string): Promise<{ error: Error | null }>;
  signOut(): Promise<void>;
}

class AuthServiceImpl implements AuthService {
  async signUp(data: SignUpData) {
    const supabase = container.resolve(SERVICE_KEYS.SUPABASE_CLIENT);
    
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
        },
      },
    });

    return { error };
  }

  async signIn(email: string, password: string) {
    const supabase = container.resolve(SERVICE_KEYS.SUPABASE_CLIENT);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  }

  async signOut() {
    const supabase = container.resolve(SERVICE_KEYS.SUPABASE_CLIENT);
    await supabase.auth.signOut();
  }
}

// 서비스 등록
container.register(SERVICE_KEYS.AUTH_SERVICE, () => new AuthServiceImpl());

export const authService = container.resolve<AuthService>(SERVICE_KEYS.AUTH_SERVICE);
```

#### 3.2.3 Auth Hook 생성

```typescript
// features/auth/hooks/use-sign-up.ts
import { useState } from 'react';
import { useService } from '@/lib/di/use-service';
import { SERVICE_KEYS } from '@/lib/di/container';
import type { AuthService } from '../services/auth.service';
import { toast } from 'sonner';

export function useSignUp() {
  const authService = useService<AuthService>(SERVICE_KEYS.AUTH_SERVICE);
  const [isLoading, setIsLoading] = useState(false);

  const signUp = async (data: { email: string; password: string; fullName: string }) => {
    setIsLoading(true);
    try {
      const { error } = await authService.signUp(data);
      
      if (error) {
        toast.error(error.message);
        return { success: false, error };
      }

      toast.success('Check your email for the confirmation link!');
      return { success: true };
    } catch (error) {
      toast.error('An unexpected error occurred');
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return { signUp, isLoading };
}
```

#### 3.2.4 컴포넌트 리팩토링 (최소 변경)

```typescript
// features/auth/components/sign-up-form.tsx
'use client';

import { useSignUp } from '../hooks/use-sign-up';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SignUpFormProps {
  onSuccess?: () => void;
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const { signUp, isLoading } = useSignUp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signUp({ email, password, fullName });
    if (result.success && onSuccess) {
      onSuccess();
    }
  };

  // ... 나머지 JSX는 동일
}
```

#### 3.2.5 Public API Export

```typescript
// features/auth/index.ts
// 피처의 Public API만 export
export { SignUpForm } from './components/sign-up-form';
export { SignInForm } from './components/sign-in-form';
export { OAuthButtons } from './components/oauth-buttons';
export { useSignUp } from './hooks/use-sign-up';
export { useSignIn } from './hooks/use-sign-in';
export { useAuth } from './hooks/use-auth';
export type { SignUpData } from './services/auth.service';
```

### 3.3 Phase 3: 기존 코드와의 호환성 유지

#### 3.3.1 기존 Import 경로 유지 (Alias)

```typescript
// components/auth/sign-up-form.tsx (레거시 경로 유지)
// 새 코드로 re-export
export { SignUpForm } from '@/features/auth';

// 또는 점진적 마이그레이션을 위한 래퍼
import { SignUpForm as NewSignUpForm } from '@/features/auth';

export function SignUpForm(props: SignUpFormProps) {
  return <NewSignUpForm {...props} />;
}
```

#### 3.3.2 기존 코드는 그대로 동작

- 기존 `components/auth/` 경로는 유지
- 새 코드는 `features/auth/` 사용
- 점진적으로 마이그레이션

---

## 4. 마이그레이션 전략

### 4.1 단계별 마이그레이션

#### Step 1: 인프라 구축 (1주)
1. ✅ DI 컨테이너 생성
2. ✅ 서비스 등록
3. ✅ React Hook 생성
4. ✅ 기존 코드와 호환성 테스트

#### Step 2: Auth 피처 마이그레이션 (1주)
1. ✅ `features/auth/` 구조 생성
2. ✅ Auth Service 작성
3. ✅ Auth Hooks 작성
4. ✅ 컴포넌트 마이그레이션
5. ✅ 기존 경로에 re-export

#### Step 3: 다른 피처 마이그레이션 (점진적)
1. Settings 피처
2. Dashboard 피처
3. 기타 피처들

### 4.2 마이그레이션 체크리스트

**각 피처 마이그레이션 시:**
- [ ] 피처 폴더 구조 생성
- [ ] Service 계층 작성 (비즈니스 로직 분리)
- [ ] Hooks 작성 (컴포넌트 로직 분리)
- [ ] 컴포넌트 리팩토링 (Service/Hook 사용)
- [ ] Public API 정의
- [ ] 기존 경로에 re-export (호환성)
- [ ] 테스트 작성

---

## 5. 장점

### 5.1 리팩토링 용이성

**Before:**
```typescript
// 비즈니스 로직이 컴포넌트에 있음
export function SignUpForm() {
  const handleSubmit = async () => {
    const supabase = createBrowserSupabaseClient(); // 하드코딩
    // 비즈니스 로직...
  };
}
```

**After:**
```typescript
// 비즈니스 로직이 Service에 있음
export function SignUpForm() {
  const { signUp } = useSignUp(); // Hook 사용
  // 컴포넌트는 UI만 담당
}
```

### 5.2 테스트 용이성

**Before:**
```typescript
// ❌ Mock 불가능
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
```

**After:**
```typescript
// ✅ Mock 가능
container.register(SERVICE_KEYS.SUPABASE_CLIENT, () => mockClient);
```

### 5.3 코드 재사용성

- Service는 여러 컴포넌트에서 재사용 가능
- Hook은 여러 컴포넌트에서 재사용 가능
- 피처 단위로 코드 그룹화

### 5.4 유지보수성

- 피처별로 코드가 그룹화되어 찾기 쉬움
- 비즈니스 로직이 Service에 집중
- 의존성이 명시적으로 관리됨

---

## 6. 주의사항

### 6.1 Next.js App Router 호환성

- Server Components에서는 Hook 사용 불가
- Server Actions 사용 시 Service 직접 호출

```typescript
// Server Component에서
import { authService } from '@/features/auth/services/auth.service';

export async function ServerComponent() {
  const result = await authService.signUp(data);
}
```

### 6.2 점진적 마이그레이션

- 기존 코드는 유지
- 새 코드는 새 구조 사용
- 점진적으로 마이그레이션

### 6.3 성능 고려

- DI 컨테이너는 싱글톤 패턴 사용
- 불필요한 재생성 방지

---

## 7. 구현 예시

### 7.1 완전한 Auth 피처 예시

```
features/auth/
├── components/
│   ├── sign-in-form.tsx
│   ├── sign-up-form.tsx
│   └── oauth-buttons.tsx
├── hooks/
│   ├── use-sign-in.ts
│   ├── use-sign-up.ts
│   └── use-auth.ts
├── services/
│   └── auth.service.ts
├── types/
│   └── index.ts
└── index.ts
```

### 7.2 사용 예시

```typescript
// app/(marketing)/signup/page.tsx
import { SignUpForm } from '@/features/auth';

export default function SignUpPage() {
  return <SignUpForm />;
}
```

```typescript
// 테스트
import { container, SERVICE_KEYS } from '@/lib/di/container';
import { mockSupabaseClient } from '@/tests/mocks';

beforeEach(() => {
  container.register(SERVICE_KEYS.SUPABASE_CLIENT, () => mockSupabaseClient);
});
```

---

## 8. 결론

### 최소 변경 원칙 준수

1. ✅ 기존 구조 유지 (components/, lib/ 그대로)
2. ✅ 새 구조 추가 (features/ 추가)
3. ✅ 기존 코드 호환성 유지 (re-export)
4. ✅ 점진적 마이그레이션 가능

### 개선 효과

1. ✅ 리팩토링 용이성 향상
2. ✅ 테스트 용이성 향상
3. ✅ 코드 재사용성 향상
4. ✅ 유지보수성 향상

### 다음 단계

1. DI 인프라 구축
2. Auth 피처 마이그레이션 (파일럿)
3. 다른 피처 점진적 마이그레이션

