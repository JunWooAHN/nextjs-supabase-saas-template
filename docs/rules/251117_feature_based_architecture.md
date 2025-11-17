# Feature-Based 아키텍처 + DI 구조 가이드

## 1. 개요

이 문서는 **Feature-Based 아키텍처**와 **의존성 주입(DI)** 개념을 반영한 폴더 구조를 정의합니다.

**핵심 원칙:**
- 기능별 모듈화: 각 기능(auth, billing, membership 등)을 독립적인 모듈로 구성
- 서비스 계층 분리: 비즈니스 로직을 서비스 계층으로 추상화
- DI 컨테이너: InversifyJS를 사용한 의존성 주입
- 3-Tier 아키텍처 유지: Tier 1/2/3 접근 패턴 준수

## 2. 전체 폴더 구조

```
src/
├── app/                          # Next.js App Router (라우트 정의)
│   ├── (auth)/                   # 인증 관련 라우트 그룹
│   │   ├── login/
│   │   └── signup/
│   ├── (user)/                   # 일반 사용자 라우트 그룹
│   │   └── dashboard/
│   ├── (org-management)/        # 조직 관리 라우트 그룹
│   ├── (center-management)/      # 센터 관리 라우트 그룹
│   ├── (law-agency)/            # 법정 대리인 라우트 그룹
│   ├── (app-manager)/           # 앱 매니저 라우트 그룹
│   ├── (billing)/               # 결제 관련 라우트 그룹
│   │   ├── plans/
│   │   ├── manage/
│   │   └── suspended/
│   ├── api/
│   │   ├── trpc/                # tRPC API 핸들러 (Tier 2)
│   │   │   └── [trpc]/
│   │   │       └── route.ts
│   │   └── webhooks/           # 웹훅 핸들러
│   │       └── payment/
│   │           └── route.ts
│   ├── auth/
│   │   ├── callback/
│   │   └── signout/
│   ├── layout.tsx
│   ├── middleware.ts
│   └── page.tsx
│
├── features/                     # Feature-Based 모듈 (핵심)
│   ├── auth/                    # 인증 기능 모듈
│   │   ├── components/         # 기능별 컴포넌트
│   │   │   ├── sign-in-form.tsx
│   │   │   ├── sign-up-form.tsx
│   │   │   └── oauth-buttons.tsx
│   │   ├── hooks/              # 기능별 훅
│   │   │   └── use-auth.ts
│   │   ├── services/           # 서비스 계층 (DI 적용)
│   │   │   ├── auth.service.ts
│   │   │   └── auth.service.interface.ts
│   │   ├── trpc/               # tRPC 라우터 (Tier 2)
│   │   │   └── auth.router.ts
│   │   ├── actions/            # Server Actions (Tier 3)
│   │   │   └── admin.actions.ts
│   │   ├── types/              # 기능별 타입 정의
│   │   │   └── auth.types.ts
│   │   └── utils/              # 기능별 유틸리티
│   │       └── auth.utils.ts
│   │
│   ├── membership/             # 멤버십 관리 기능 모듈
│   │   ├── components/
│   │   │   ├── member-invite-form.tsx
│   │   │   └── member-list-table.tsx
│   │   ├── hooks/
│   │   │   └── use-membership.ts
│   │   ├── services/
│   │   │   ├── membership.service.ts
│   │   │   └── membership.service.interface.ts
│   │   ├── trpc/
│   │   │   └── membership.router.ts
│   │   ├── types/
│   │   │   └── membership.types.ts
│   │   └── utils/
│   │       └── membership.utils.ts
│   │
│   ├── billing/                # 결제/구독 기능 모듈
│   │   ├── components/
│   │   │   ├── plan-selector.tsx
│   │   │   └── manage-subscription-button.tsx
│   │   ├── hooks/
│   │   │   └── use-billing.ts
│   │   ├── services/
│   │   │   ├── billing.service.ts
│   │   │   ├── billing.service.interface.ts
│   │   │   ├── subscription.service.ts
│   │   │   └── subscription.service.interface.ts
│   │   ├── trpc/
│   │   │   └── billing.router.ts
│   │   ├── types/
│   │   │   └── billing.types.ts
│   │   └── utils/
│   │       └── billing.utils.ts
│   │
│   ├── proof/                 # 위치 증빙 기능 모듈
│   │   ├── components/
│   │   │   ├── create-proof-button.tsx
│   │   │   └── proofs-data-table.tsx
│   │   ├── hooks/
│   │   │   └── use-proof.ts
│   │   ├── services/
│   │   │   ├── proof.service.ts
│   │   │   └── proof.service.interface.ts
│   │   ├── trpc/
│   │   │   └── proof.router.ts
│   │   ├── types/
│   │   │   └── proof.types.ts
│   │   └── utils/
│   │       └── proof.utils.ts
│   │
│   ├── organization/          # 조직 관리 기능 모듈
│   │   ├── components/
│   │   │   ├── org-settings-form.tsx
│   │   │   └── org-switcher.tsx
│   │   ├── hooks/
│   │   │   └── use-organization.ts
│   │   ├── services/
│   │   │   ├── organization.service.ts
│   │   │   └── organization.service.interface.ts
│   │   ├── trpc/
│   │   │   └── organization.router.ts
│   │   ├── types/
│   │   │   └── organization.types.ts
│   │   └── utils/
│   │       └── organization.utils.ts
│   │
│   ├── center/                # 센터 관리 기능 모듈
│   │   ├── components/
│   │   │   ├── center-settings-form.tsx
│   │   │   └── center-switcher.tsx
│   │   ├── hooks/
│   │   │   └── use-center.ts
│   │   ├── services/
│   │   │   ├── center.service.ts
│   │   │   └── center.service.interface.ts
│   │   ├── trpc/
│   │   │   └── center.router.ts
│   │   ├── types/
│   │   │   └── center.types.ts
│   │   └── utils/
│   │       └── center.utils.ts
│   │
│   └── relationship/          # 센터-조직 관계 기능 모듈
│       ├── components/
│       │   └── link-center-org-form.tsx
│       ├── hooks/
│       │   └── use-relationship.ts
│       ├── services/
│       │   ├── relationship.service.ts
│       │   └── relationship.service.interface.ts
│       ├── trpc/
│       │   └── relationship.router.ts
│       ├── types/
│       │   └── relationship.types.ts
│       └── utils/
│           └── relationship.utils.ts
│
├── lib/                        # 공통 라이브러리
│   ├── trpc/                   # tRPC 설정 (Tier 2)
│   │   ├── client.ts          # 클라이언트 컴포넌트용
│   │   ├── server.ts          # 서버 컴포넌트용 + Context
│   │   └── router.ts          # 메인 라우터 (features의 라우터 통합)
│   │
│   ├── supabase/               # Supabase 클라이언트 팩토리
│   │   ├── client.ts          # Tier 1: 브라우저 클라이언트
│   │   ├── server.ts          # Tier 2: 서버 클라이언트 (PUBLISHABLE_KEY)
│   │   └── admin.ts           # Tier 3: 어드민 클라이언트 (SERVICE_ROLE_KEY)
│   │
│   ├── di/                     # DI 컨테이너 설정 (InversifyJS)
│   │   ├── container.ts       # DI 컨테이너 설정
│   │   ├── symbols.ts         # DI 심볼 정의
│   │   └── bindings/          # 바인딩 정의
│   │       ├── auth.bindings.ts
│   │       ├── membership.bindings.ts
│   │       ├── billing.bindings.ts
│   │       └── ...
│   │
│   ├── permissions.ts          # 권한 상수 (Bitwise)
│   ├── constants.ts           # 공통 상수
│   ├── utils.ts               # 공통 유틸리티
│   └── types.ts               # 공통 타입
│
├── components/                 # 공통 UI 컴포넌트
│   ├── ui/                     # shadcn/ui 컴포넌트
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   │
│   └── layout/                 # 레이아웃 컴포넌트
│       ├── header.tsx
│       ├── sidebar.tsx
│       └── main-content.tsx
│
├── hooks/                      # 공통 훅
│   └── use-api-form.ts
│
├── types/                      # 전역 타입 정의
│   └── supabase.ts            # Supabase 자동 생성 타입
│
└── middleware.ts              # Next.js 미들웨어
```

## 3. Feature 모듈 구조 상세

각 feature 모듈은 다음 구조를 따릅니다:

```
features/{feature-name}/
├── components/          # 기능별 UI 컴포넌트
├── hooks/              # 기능별 React 훅
├── services/           # 서비스 계층 (DI 적용)
│   ├── {feature}.service.ts           # 구현체
│   └── {feature}.service.interface.ts # 인터페이스
├── trpc/              # tRPC 라우터 (Tier 2)
│   └── {feature}.router.ts
├── actions/           # Server Actions (Tier 3, 선택적)
│   └── admin.actions.ts
├── types/             # 기능별 타입 정의
│   └── {feature}.types.ts
└── utils/             # 기능별 유틸리티
    └── {feature}.utils.ts
```

## 4. 서비스 계층 (DI 적용)

### 4.1. 서비스 인터페이스 정의

```typescript
// features/auth/services/auth.service.interface.ts
// ⚠️ 주의: injectable 데코레이터는 인터페이스가 아닌 구현체에만 사용합니다.

export interface IAuthService {
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string, metadata?: Record<string, any>): Promise<AuthResult>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
}

// 심볼은 lib/di/symbols.ts에서 중앙 관리합니다.
```

### 4.2. 서비스 구현체

```typescript
// features/auth/services/auth.service.ts
import { injectable, inject } from 'inversify';
import { IAuthService } from './auth.service.interface';
import { SUPABASE_CLIENT } from '@/lib/di/symbols';
import type { SupabaseClient } from '@supabase/supabase-js';

@injectable()
export class AuthService implements IAuthService {
  constructor(
    @inject(SUPABASE_CLIENT) private supabase: SupabaseClient
  ) {}

  async signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return { user: data.user, session: data.session };
  }

  async signUp(email: string, password: string, metadata?: Record<string, any>): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    
    if (error) throw error;
    return { user: data.user, session: data.session };
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error) return null;
    return user;
  }
}
```

### 4.3. DI 컨테이너 설정 (요청별 컨테이너 패턴)

⚠️ **중요: 요청별(Request-Scoped) 컨테이너 패턴**

싱글톤 컨테이너를 사용하면 모든 사용자가 같은 Supabase 클라이언트를 공유하게 되어 보안 문제가 발생할 수 있습니다. 따라서 **요청마다 새로운 컨테이너를 생성**합니다.

```typescript
// lib/di/container.ts
import 'reflect-metadata';
import { Container } from 'inversify';
import { SUPABASE_CLIENT } from './symbols';
import type { SupabaseClient } from '@supabase/supabase-js';
import { bindAuthServices } from '@/features/auth/bindings/auth.bindings';
import { bindMembershipServices } from '@/features/membership/bindings/membership.bindings';

/**
 * 서비스 바인딩 함수
 * 컨테이너에 서비스들을 바인딩합니다.
 */
function bindServices(container: Container): void {
  bindAuthServices(container);
  bindMembershipServices(container);
  // TODO: 다른 feature 바인딩 추가
}

/**
 * 요청별 DI 컨테이너 생성 팩토리 함수
 * 
 * ⚠️ 중요: 이 함수는 요청마다 호출되어야 합니다.
 * tRPC Context에서 호출하여 요청별로 독립적인 컨테이너를 생성합니다.
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
  bindServices(container);

  return container;
}
```

**tRPC Context에서 사용:**

```typescript
// lib/trpc/server.ts
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createContainer } from '@/lib/di/container';

export async function createTRPCContext() {
  // 1. 요청별 Supabase 클라이언트 생성 (쿠키 기반)
  const supabase = await createServerSupabaseClient();

  // 2. 요청별 DI 컨테이너 생성
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

**tRPC 라우터에서 사용:**

```typescript
// features/membership/trpc/membership.router.ts
.mutation(async ({ ctx, input }) => {
  // 요청별 DI 컨테이너에서 서비스 주입받아 사용
  // ctx.container은 해당 요청 전용 컨테이너이므로 사용자별 세션이 보장됩니다.
  const membershipService = ctx.container.get<IMembershipService>(MEMBERSHIP_SERVICE);
  return await membershipService.inviteUserToEntity(input);
})
```

### 4.4. DI 심볼 정의

```typescript
// lib/di/symbols.ts
export const SUPABASE_CLIENT = Symbol('SupabaseClient');
export const SUPABASE_ADMIN_CLIENT = Symbol('SupabaseAdminClient');
export const AUTH_SERVICE = Symbol('AuthService');
export const MEMBERSHIP_SERVICE = Symbol('MembershipService');
export const BILLING_SERVICE = Symbol('BillingService');
export const PROOF_SERVICE = Symbol('ProofService');
export const ORGANIZATION_SERVICE = Symbol('OrganizationService');
export const CENTER_SERVICE = Symbol('CenterService');
export const RELATIONSHIP_SERVICE = Symbol('RelationshipService');
```

## 5. tRPC 라우터 통합

### 5.1. Feature별 라우터

⚠️ **중요: 요청별 컨테이너 사용**

tRPC 라우터에서는 싱글톤 `container`를 사용하지 않고, `ctx.container`(요청별 컨테이너)를 사용합니다.

```typescript
// features/membership/trpc/membership.router.ts
import { router, protectedProcedure } from '@/lib/trpc/server';
import { z } from 'zod';
import { MEMBERSHIP_SERVICE } from '@/lib/di/symbols';
import type { IMembershipService } from '../services/membership.service.interface';

export const membershipRouter = router({
  inviteUserToEntity: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      entityId: z.string().uuid(),
      entityType: z.number(),
      permissions: z.bigint(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 요청별 컨테이너에서 서비스 주입받아 사용
      // ctx.container은 해당 요청 전용 컨테이너이므로 사용자별 세션이 보장됩니다.
      const membershipService = ctx.container.get<IMembershipService>(MEMBERSHIP_SERVICE);
      return await membershipService.inviteUserToEntity(input);
    }),

  updateUserPermissions: protectedProcedure
    .input(z.object({
      userId: z.string().uuid(),
      entityId: z.string().uuid(),
      permissions: z.bigint(),
    }))
    .mutation(async ({ ctx, input }) => {
      const membershipService = ctx.container.get<IMembershipService>(MEMBERSHIP_SERVICE);
      return await membershipService.updateUserPermissions(input);
    }),
});
```

### 5.2. 메인 라우터 통합

```typescript
// lib/trpc/router.ts
import { router } from './server';
import { authRouter } from '@/features/auth/trpc/auth.router';
import { membershipRouter } from '@/features/membership/trpc/membership.router';
import { billingRouter } from '@/features/billing/trpc/billing.router';
import { proofRouter } from '@/features/proof/trpc/proof.router';
import { organizationRouter } from '@/features/organization/trpc/organization.router';
import { centerRouter } from '@/features/center/trpc/center.router';
import { relationshipRouter } from '@/features/relationship/trpc/relationship.router';

export const appRouter = router({
  auth: authRouter,
  membership: membershipRouter,
  billing: billingRouter,
  proof: proofRouter,
  organization: organizationRouter,
  center: centerRouter,
  relationship: relationshipRouter,
});

export type AppRouter = typeof appRouter;
```

## 6. 3-Tier 아키텍처 적용

### 6.1. Tier 1 (일반 사용자) - 클라이언트 직접 접근

```typescript
// features/proof/components/create-proof-button.tsx
'use client';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function CreateProofButton() {
  const supabase = createBrowserSupabaseClient();
  
  const handleCreate = async () => {
    // Tier 1: 클라이언트 직접 접근 (RLS 보호)
    const { error } = await supabase
      .from('location_proofs')
      .insert({
        user_id: userId,
        entity_id: entityId,
        entity_type: entityType,
        // ...
      });
  };
}
```

### 6.2. Tier 2 (SaaS 관리자) - tRPC

```typescript
// features/membership/components/member-invite-form.tsx
'use client';

import { trpc } from '@/lib/trpc/client';

export function MemberInviteForm() {
  const inviteMutation = trpc.membership.inviteUserToEntity.useMutation();
  
  const handleInvite = async (data: InviteData) => {
    // Tier 2: tRPC Mutation (서비스 계층 사용)
    await inviteMutation.mutateAsync(data);
  };
}
```

### 6.3. Tier 3 (앱 매니저) - Server Actions

```typescript
// features/auth/actions/admin.actions.ts
'use server';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkAppManagerPermission } from '@/lib/auth/permissions';

export async function getAllUsersForAppManager() {
  // 앱 매니저 권한 검증
  await checkAppManagerPermission();
  
  // Tier 3: SERVICE_ROLE_KEY 사용 (RLS 우회)
  const adminClient = createAdminSupabaseClient();
  const { data } = await adminClient
    .from('profiles')
    .select('*');
  
  return data;
}
```

## 7. 마이그레이션 가이드

### 7.1. 기존 코드 이동

1. **컴포넌트 이동:**
   - `src/components/auth/*` → `src/features/auth/components/*`
   - `src/components/settings/*` → `src/features/user/components/*`

2. **서비스 계층 생성:**
   - 기존 비즈니스 로직을 서비스 계층으로 추출
   - 인터페이스와 구현체 분리

3. **tRPC 라우터 분리:**
   - `lib/trpc/router.ts`의 라우터를 feature별로 분리
   - 각 feature의 `trpc/` 폴더로 이동

### 7.2. DI 적용 단계

1. **단계 1: InversifyJS 설치**
   ```bash
   pnpm add inversify reflect-metadata
   pnpm add -D @types/inversify
   ```

2. **단계 2: DI 컨테이너 설정**
   - `lib/di/container.ts` 생성
   - `lib/di/symbols.ts` 생성

3. **단계 3: 서비스 계층 리팩토링**
   - 기존 로직을 서비스로 추출
   - 인터페이스 정의
   - DI 컨테이너에 바인딩

4. **단계 4: tRPC 라우터에서 서비스 사용**
   - tRPC 프로시저에서 서비스를 DI로 주입받아 사용

## 8. 장점

### 8.1. Feature-Based 아키텍처
- ✅ **기능별 응집도 향상**: 관련 코드가 한 곳에 모여있어 유지보수 용이
- ✅ **독립적 개발**: 각 feature를 독립적으로 개발/테스트 가능
- ✅ **명확한 책임 분리**: 각 feature의 역할이 명확함

### 8.2. DI 적용
- ✅ **테스트 용이성**: Mock 객체 주입으로 단위 테스트 쉬움
- ✅ **결합도 감소**: 인터페이스 기반 의존성으로 유연한 설계
- ✅ **재사용성**: 서비스 계층을 여러 곳에서 재사용 가능

### 8.3. 3-Tier 아키텍처 유지
- ✅ **명확한 접근 패턴**: Tier별 접근 방식이 명확히 구분됨
- ✅ **보안 격리**: SERVICE_ROLE_KEY는 Tier 3에서만 사용
- ✅ **UX 최적화**: Tier 1은 클라이언트 직접 접근으로 빠른 UX

## 9. 주의사항

1. **DI는 선택적 사용**: 간단한 로직은 DI 없이 직접 호출 가능
2. **서비스 계층은 복잡한 로직에만**: 단순 CRUD는 직접 접근 가능
3. **Feature 간 의존성 최소화**: Feature 간 직접 import 지양, 공통 라이브러리 사용
4. **타입 안전성 유지**: 모든 서비스 인터페이스는 타입 안전하게 정의

## 10. 참고

- [InversifyJS 공식 문서](https://inversify.io/)
- [Feature-Based 아키텍처 패턴](https://khalilstemmler.com/articles/domain-driven-design/introduction-to-domain-driven-design/)
- [3-Tier 아키텍처 모델](./00_supabase_architecture_1.5.md)

