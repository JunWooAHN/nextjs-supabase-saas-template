# Feature-Based 아키텍처 + DI 마이그레이션 가이드

## 1. 개요

이 가이드는 기존 코드를 **Feature-Based 아키텍처**와 **DI(Dependency Injection)** 구조로 마이그레이션하는 단계별 가이드입니다.

## 2. 사전 준비

### 2.1. 의존성 설치

```bash
pnpm add inversify reflect-metadata
pnpm add -D @types/inversify
```

### 2.2. TypeScript 설정 확인

`tsconfig.json`에 다음 설정이 추가되어 있는지 확인:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### 2.3. reflect-metadata 임포트

애플리케이션 진입점(`app/layout.tsx` 또는 `app/page.tsx`) 최상단에 추가:

```typescript
import 'reflect-metadata';
```

## 3. 마이그레이션 단계

### 단계 1: DI 컨테이너 설정

1. **DI 심볼 정의** (`src/lib/di/symbols.ts`)
   - ✅ 이미 생성됨

2. **DI 컨테이너 설정** (`src/lib/di/container.ts`)
   - ✅ 이미 생성됨

3. **애플리케이션 진입점에 reflect-metadata 추가**
   ```typescript
   // app/layout.tsx 최상단
   import 'reflect-metadata';
   ```

### 단계 2: Feature 모듈 생성

각 기능별로 다음 구조를 생성합니다:

```
features/{feature-name}/
├── services/
│   ├── {feature}.service.interface.ts
│   └── {feature}.service.ts
├── bindings/
│   └── {feature}.bindings.ts
└── trpc/
    └── {feature}.router.ts
```

**예시: Auth 기능**

1. **서비스 인터페이스 생성** (`features/auth/services/auth.service.interface.ts`)
   - ✅ 이미 생성됨

2. **서비스 구현체 생성** (`features/auth/services/auth.service.ts`)
   - ✅ 이미 생성됨

3. **바인딩 생성** (`features/auth/bindings/auth.bindings.ts`)
   - ✅ 이미 생성됨
   - 바인딩 함수 `bindAuthServices(container)` export

4. **DI 컨테이너에 바인딩 등록**
   ```typescript
   // lib/di/container.ts의 bindServices() 함수에 추가
   import { bindAuthServices } from '@/features/auth/bindings/auth.bindings';
   
   function bindServices(container: Container): void {
     bindAuthServices(container);
     // ... 다른 feature 바인딩
   }
   ```
   
   ⚠️ **중요**: 싱글톤 컨테이너를 사용하지 않습니다. 요청마다 새로운 컨테이너를 생성하는 `createContainer()` 팩토리 함수를 사용합니다.

### 단계 3: 기존 코드 마이그레이션

#### 3.1. 컴포넌트 이동

기존 컴포넌트를 feature 모듈로 이동:

```bash
# 예시: 인증 컴포넌트 이동
mv src/components/auth/* src/features/auth/components/
```

#### 3.2. 비즈니스 로직을 서비스 계층으로 추출

**Before (기존 코드):**
```typescript
// components/member-invite-form.tsx
'use client';

export function MemberInviteForm() {
  const handleInvite = async () => {
    // 직접 Supabase 호출
    const { error } = await supabase
      .from('memberships')
      .insert({ ... });
  };
}
```

**After (서비스 계층 사용):**
```typescript
// features/membership/components/member-invite-form.tsx
'use client';

import { trpc } from '@/lib/trpc/client';

export function MemberInviteForm() {
  const inviteMutation = trpc.membership.inviteUserToEntity.useMutation();
  
  const handleInvite = async () => {
    // tRPC Mutation 사용 (서비스 계층 호출)
    await inviteMutation.mutateAsync({ ... });
  };
}
```

#### 3.3. tRPC 라우터 분리

**Before (기존 코드):**
```typescript
// lib/trpc/router.ts
export const appRouter = router({
  inviteUser: protectedProcedure.mutation(async ({ ctx, input }) => {
    // 직접 Supabase 호출
    const { error } = await ctx.supabase.from('memberships').insert({ ... });
  }),
});
```

**After (서비스 계층 사용):**
```typescript
// features/membership/trpc/membership.router.ts
export const membershipRouter = router({
  inviteUserToEntity: protectedProcedure
    .input(z.object({ ... }))
    .mutation(async ({ ctx, input }) => {
      // 요청별 DI 컨테이너에서 서비스 주입받아 사용
      // ctx.container은 해당 요청 전용 컨테이너이므로 사용자별 세션이 보장됩니다.
      const membershipService = ctx.container.get<IMembershipService>(MEMBERSHIP_SERVICE);
      await membershipService.inviteUserToEntity(input);
    }),
});

// lib/trpc/router.ts
export const appRouter = router({
  membership: membershipRouter,
});
```

### 단계 4: tRPC 라우터 통합

`lib/trpc/router.ts`에서 모든 feature 라우터를 통합:

```typescript
// lib/trpc/router.ts
import { router } from './server';
import { membershipRouter } from '@/features/membership/trpc/membership.router';
import { authRouter } from '@/features/auth/trpc/auth.router';
// ... 다른 라우터들

export const appRouter = router({
  auth: authRouter,
  membership: membershipRouter,
  // ... 다른 라우터들
});

export type AppRouter = typeof appRouter;
```

## 4. 마이그레이션 체크리스트

### 4.1. DI 설정
- [ ] `inversify`, `reflect-metadata` 설치 완료
- [ ] `tsconfig.json`에 `experimentalDecorators`, `emitDecoratorMetadata` 추가
- [ ] 애플리케이션 진입점에 `reflect-metadata` 임포트 추가
- [ ] `lib/di/symbols.ts` 생성 완료
- [ ] `lib/di/container.ts` 생성 완료

### 4.2. Feature 모듈 생성
- [ ] `features/auth/` 모듈 생성 및 마이그레이션
- [ ] `features/membership/` 모듈 생성 및 마이그레이션
- [ ] `features/billing/` 모듈 생성 및 마이그레이션
- [ ] `features/proof/` 모듈 생성 및 마이그레이션
- [ ] `features/organization/` 모듈 생성 및 마이그레이션
- [ ] `features/center/` 모듈 생성 및 마이그레이션
- [ ] `features/relationship/` 모듈 생성 및 마이그레이션

### 4.3. 서비스 계층
- [ ] 각 feature의 서비스 인터페이스 정의
- [ ] 각 feature의 서비스 구현체 생성
- [ ] 각 feature의 바인딩 파일 생성
- [ ] DI 컨테이너에 바인딩 등록

### 4.4. tRPC 라우터
- [ ] 각 feature의 tRPC 라우터 생성
- [ ] 서비스 계층을 DI로 주입받아 사용
- [ ] 메인 라우터에 통합

### 4.5. 컴포넌트 마이그레이션
- [ ] 기존 컴포넌트를 feature 모듈로 이동
- [ ] 컴포넌트에서 tRPC 사용 (Tier 2) 또는 클라이언트 직접 접근 (Tier 1)

## 5. 주의사항

### 5.1. 점진적 마이그레이션
- 한 번에 모든 코드를 마이그레이션하지 말고, feature별로 단계적으로 진행
- 각 feature 마이그레이션 후 테스트를 반드시 수행

### 5.2. DI 사용 범위
- **복잡한 비즈니스 로직**에만 DI 적용
- 간단한 CRUD는 직접 접근 가능 (Tier 1)
- 프로젝트 초기 단계는 DI 없이 시작 가능

### 5.3. Feature 간 의존성
- Feature 간 직접 import 지양
- 공통 기능은 `lib/`에 배치
- 필요시 공통 서비스를 DI로 주입

### 5.4. 3-Tier 아키텍처 유지
- **Tier 1 (일반 사용자)**: 클라이언트 직접 접근
- **Tier 2 (SaaS 관리자)**: tRPC + 서비스 계층
- **Tier 3 (앱 매니저)**: Server Actions + SERVICE_ROLE_KEY

## 6. 예시: Membership Feature 완전 마이그레이션

### 6.1. 서비스 계층 생성
```typescript
// features/membership/services/membership.service.interface.ts
export interface IMembershipService {
  inviteUserToEntity(input: InviteUserToEntityInput): Promise<void>;
  // ...
}

// features/membership/services/membership.service.ts
@injectable()
export class MembershipService implements IMembershipService {
  constructor(
    @inject(SUPABASE_CLIENT) private supabase: SupabaseClient
  ) {}
  
  async inviteUserToEntity(input: InviteUserToEntityInput): Promise<void> {
    // 비즈니스 로직 구현
  }
}
```

### 6.2. 바인딩 등록
```typescript
// features/membership/bindings/membership.bindings.ts
import { Container } from 'inversify';
import { MEMBERSHIP_SERVICE } from '@/lib/di/symbols';
import { MembershipService } from '../services/membership.service';
import type { IMembershipService } from '../services/membership.service.interface';

/**
 * 멤버십 서비스를 컨테이너에 바인딩
 * @param container - 바인딩할 컨테이너 인스턴스
 */
export function bindMembershipServices(container: Container): void {
  container.bind<IMembershipService>(MEMBERSHIP_SERVICE).to(MembershipService);
}
```

그리고 `lib/di/container.ts`의 `bindServices()` 함수에 추가:
```typescript
import { bindMembershipServices } from '@/features/membership/bindings/membership.bindings';

function bindServices(container: Container): void {
  bindMembershipServices(container);
  // ... 다른 feature 바인딩
}
```

⚠️ **중요**: 싱글톤 컨테이너를 사용하지 않습니다. 요청마다 새로운 컨테이너를 생성하는 `createContainer()` 팩토리 함수를 사용합니다.

### 6.3. tRPC 라우터 생성
```typescript
// features/membership/trpc/membership.router.ts
export const membershipRouter = router({
  inviteUserToEntity: protectedProcedure
    .input(z.object({ ... }))
    .mutation(async ({ ctx, input }) => {
      // 요청별 DI 컨테이너에서 서비스 주입받아 사용
      // ctx.container은 해당 요청 전용 컨테이너이므로 사용자별 세션이 보장됩니다.
      const service = ctx.container.get<IMembershipService>(MEMBERSHIP_SERVICE);
      await service.inviteUserToEntity(input);
    }),
});
```

### 6.4. 컴포넌트에서 사용
```typescript
// features/membership/components/member-invite-form.tsx
'use client';

import { trpc } from '@/lib/trpc/client';

export function MemberInviteForm() {
  const inviteMutation = trpc.membership.inviteUserToEntity.useMutation();
  
  const handleInvite = async (data: InviteData) => {
    await inviteMutation.mutateAsync(data);
  };
  
  return (/* ... */);
}
```

## 7. 참고 문서

- [Feature-Based 아키텍처 가이드](./251117_feature_based_architecture.md)
- [3-Tier 아키텍처 모델](./00_supabase_architecture_1.5.md)
- [InversifyJS 공식 문서](https://inversify.io/)

