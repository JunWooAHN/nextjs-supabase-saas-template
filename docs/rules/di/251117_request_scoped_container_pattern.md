# 요청별(Request-Scoped) DI 컨테이너 패턴

## 1. 문제 정의

### 리스크 1: 싱글톤 컨테이너와 요청별 의존성 충돌

**문제점:**
- InversifyJS Container는 보통 **싱글톤(Singleton)**으로 생성됩니다.
- 하지만 `createServerSupabaseClient()`는 **요청(Request)마다** 새로 생성되어야 합니다.
- 왜냐하면 `cookies()`를 읽어 해당 사용자의 인증 세션을 알아내야 하기 때문입니다.

**위험:**
만약 싱글톤 DI 컨테이너가 `createServerSupabaseClient`를 앱 시작 시점에 한 번만 바인딩한다면, 모든 사용자(A, B, C)가 첫 번째 사용자(A)의 인증 세션을 공유하게 되는 **끔찍한 보안 사고**가 발생할 수 있습니다.

## 2. 해결 방법: 요청별 컨테이너 패턴

### 2.1. 핵심 원칙

1. **싱글톤 컨테이너 절대 사용 금지**
2. **요청마다 새로운 컨테이너 생성**
3. **요청별 Supabase 클라이언트를 컨테이너에 바인딩**

### 2.2. 구현 패턴

#### Step 1: 팩토리 함수로 컨테이너 생성

```typescript
// lib/di/container.ts
import { Container } from 'inversify';
import { SUPABASE_CLIENT } from './symbols';
import type { SupabaseClient } from '@supabase/supabase-js';
import { bindAuthServices } from '@/features/auth/bindings/auth.bindings';
import { bindMembershipServices } from '@/features/membership/bindings/membership.bindings';

/**
 * 요청별 DI 컨테이너 생성 팩토리 함수
 * 
 * ⚠️ 중요: 이 함수는 요청마다 호출되어야 합니다.
 * 
 * @param supabase - 요청별 Supabase 클라이언트 (쿠키 기반 세션 포함)
 * @returns 새로운 DI 컨테이너 인스턴스
 */
export function createContainer(supabase: SupabaseClient): Container {
  const container = new Container();

  // 요청별 Supabase 클라이언트 바인딩
  // 이 클라이언트는 해당 요청의 쿠키를 포함하므로 사용자별 세션이 보장됩니다.
  container.bind<SupabaseClient>(SUPABASE_CLIENT).toConstantValue(supabase);

  // 서비스 바인딩 등록
  bindAuthServices(container);
  bindMembershipServices(container);

  return container;
}
```

#### Step 2: tRPC Context에서 요청마다 컨테이너 생성

```typescript
// lib/trpc/server.ts
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createContainer } from '@/lib/di/container';

export async function createTRPCContext() {
  // 1. 요청별 Supabase 클라이언트 생성 (쿠키 기반)
  const supabase = await createServerSupabaseClient();

  // 2. 요청별 DI 컨테이너 생성
  // Supabase 클라이언트를 컨테이너에 바인딩하여 서비스에서 사용 가능하도록 함
  const container = createContainer(supabase);

  // 3. 사용자 세션 확인
  const { data: { user } } = await supabase.auth.getUser();

  return {
    supabase,
    user,
    container, // 요청별 컨테이너를 Context에 포함
  };
}
```

#### Step 3: tRPC 라우터에서 요청별 컨테이너 사용

```typescript
// features/membership/trpc/membership.router.ts
import { router, protectedProcedure } from '@/lib/trpc/server';
import { MEMBERSHIP_SERVICE } from '@/lib/di/symbols';
import type { IMembershipService } from '../services/membership.service.interface';

export const membershipRouter = router({
  inviteUserToEntity: protectedProcedure
    .mutation(async ({ ctx, input }) => {
      // ❌ 잘못된 방법: 싱글톤 컨테이너 사용
      // const membershipService = container.get<IMembershipService>(MEMBERSHIP_SERVICE);

      // ✅ 올바른 방법: 요청별 컨테이너 사용
      // ctx.container은 해당 요청 전용 컨테이너이므로 사용자별 세션이 보장됩니다.
      const membershipService = ctx.container.get<IMembershipService>(MEMBERSHIP_SERVICE);
      
      return await membershipService.inviteUserToEntity(input);
    }),
});
```

## 3. 바인딩 함수 패턴

각 feature의 바인딩 파일은 컨테이너를 인자로 받는 함수로 작성합니다:

```typescript
// features/auth/bindings/auth.bindings.ts
import { Container } from 'inversify';
import { AUTH_SERVICE } from '@/lib/di/symbols';
import { AuthService } from '../services/auth.service';
import type { IAuthService } from '../services/auth.service.interface';

/**
 * 인증 서비스를 컨테이너에 바인딩
 * @param container - 바인딩할 컨테이너 인스턴스
 */
export function bindAuthServices(container: Container): void {
  container.bind<IAuthService>(AUTH_SERVICE).to(AuthService);
}
```

## 4. 보안 보장

### 4.1. 사용자별 세션 격리

요청별 컨테이너 패턴을 사용하면:
- 각 요청마다 독립적인 Supabase 클라이언트가 생성됩니다.
- 각 클라이언트는 해당 요청의 쿠키를 포함하므로 사용자별 세션이 보장됩니다.
- 사용자 A의 요청과 사용자 B의 요청이 서로의 세션에 접근할 수 없습니다.

### 4.2. 생명주기 관리

```
요청 시작
  ↓
createTRPCContext() 호출
  ↓
createServerSupabaseClient() - 요청별 클라이언트 생성 (쿠키 기반)
  ↓
createContainer(supabase) - 요청별 컨테이너 생성
  ↓
서비스에서 ctx.container.get() - 요청별 컨테이너 사용
  ↓
요청 종료 - 컨테이너와 클라이언트 자동 해제
```

## 5. 주의사항

### 5.1. 절대 하지 말아야 할 것

❌ **싱글톤 컨테이너 사용:**
```typescript
// ❌ 잘못된 방법
const container = new Container();
export { container }; // 싱글톤으로 export

// 라우터에서
const service = container.get<IService>(SERVICE); // 모든 사용자가 같은 인스턴스 공유
```

❌ **컨테이너를 전역 변수로 저장:**
```typescript
// ❌ 잘못된 방법
let globalContainer: Container | null = null;

if (!globalContainer) {
  globalContainer = createContainer(supabase);
}
```

### 5.2. 반드시 해야 할 것

✅ **요청마다 새 컨테이너 생성:**
```typescript
// ✅ 올바른 방법
export async function createTRPCContext() {
  const supabase = await createServerSupabaseClient();
  const container = createContainer(supabase); // 요청마다 새로 생성
  return { supabase, user, container };
}
```

✅ **요청별 컨테이너 사용:**
```typescript
// ✅ 올바른 방법
.mutation(async ({ ctx, input }) => {
  const service = ctx.container.get<IService>(SERVICE); // 요청별 컨테이너 사용
});
```

## 6. 성능 고려사항

### 6.1. 오버헤드

요청마다 새로운 컨테이너를 생성하는 것은 약간의 오버헤드가 있지만:
- 컨테이너 생성 자체는 매우 빠릅니다 (수 마이크로초)
- 보안을 위한 필수 비용입니다
- 사용자 경험에 영향을 주지 않습니다

### 6.2. 최적화

서비스 바인딩은 동기적으로 수행되므로:
- 비동기 import를 사용하지 않습니다
- 순환 참조가 없는 경우 직접 import를 사용합니다

## 7. 테스트

### 7.1. 단위 테스트

테스트 환경에서는 Mock 컨테이너를 생성할 수 있습니다:

```typescript
// 테스트 코드
import { Container } from 'inversify';
import { createContainer } from '@/lib/di/container';
import { SUPABASE_CLIENT } from '@/lib/di/symbols';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase 클라이언트
const mockSupabase = {
  // ... mock implementation
} as unknown as SupabaseClient;

// 테스트용 컨테이너 생성
const testContainer = createContainer(mockSupabase);

// 서비스 테스트
const service = testContainer.get<IMembershipService>(MEMBERSHIP_SERVICE);
```

## 8. 참고

- [Feature-Based 아키텍처 가이드](./251117_feature_based_architecture.md)
- [3-Tier 아키텍처 모델](./00_supabase_architecture_1.5.md)
- [InversifyJS 공식 문서 - Scope](https://inversify.io/)

