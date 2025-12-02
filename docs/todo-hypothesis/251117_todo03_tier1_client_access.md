# Todo 03: Tier 1 (일반 사용자) - 클라이언트 직접 접근

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태

`src/lib/supabase/client.ts` 존재 ✅
- `createBrowserSupabaseClient()` 함수 구현 완료
- PUBLISHABLE_KEY 사용 확인
- `@supabase/ssr`의 `createBrowserClient` 사용 확인

## 작업 목표

Tier 1 (일반 사용자)의 클라이언트 직접 접근 패턴을 확인하고, RLS 정책이 올바르게 보호하는지 검증합니다.

## 작업 항목

### 3.1. Tier 1 클라이언트 확인

- [x] `src/lib/supabase/client.ts` 확인 ✅
  - [x] `createBrowserSupabaseClient()` 함수가 올바르게 구현되어 있는지 확인 ✅
  - [x] PUBLISHABLE_KEY 사용 확인 ✅ (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
  - [x] `@supabase/ssr`의 `createBrowserClient` 사용 확인 ✅

### 3.2. Tier 1 사용 예시 구현

- [x] 위치 증빙 생성 예시 구현 ✅
  - [x] `features/proof/components/create-proof-button.tsx` 컴포넌트 구현 완료 ✅
  - [x] `navigator.geolocation.getCurrentPosition()` 호출 ✅
  - [x] `supabase.from('location_proofs').insert(...)` 직접 호출 ✅
  - [x] RLS INSERT 정책 (user_id = auth.uid())으로 보호됨 ✅
  - [x] 에러 처리 및 사용자 피드백 (toast) 구현 ✅

- [x] 내 프로필 조회/수정 예시 ✅
  - [x] `features/user/components/profile-settings.tsx` 컴포넌트 구현 완료 ✅
  - [x] `supabase.from('profiles').select().eq('id', userId).single()` - 조회 ✅
  - [x] `supabase.from('profiles').update(...).eq('id', userId)` - 수정 ✅
  - [x] RLS 정책으로 보호됨 ✅
  - [x] 로딩 상태 및 에러 처리 구현 ✅

- [x] 내 위치 증빙 조회 예시 ✅
  - [x] `features/proof/components/proofs-list.tsx` 컴포넌트 구현 완료 ✅
  - [x] `supabase.from('location_proofs').select().eq('user_id', userId)` - 조회 ✅
  - [x] RLS SELECT 정책으로 보호됨 ✅
  - [x] 필터링 옵션 (entityId, entityType) 지원 ✅
  - [x] 로딩 상태 및 에러 처리 구현 ✅

### 3.3. RLS 정책 검증

- [x] Tier 1 사용 패턴에 대한 RLS 정책 검증 ✅
  - [x] `profiles` 테이블: `id = auth.uid()` 정책 확인 ✅
    - SELECT: `id = auth.uid()` ✅ (00_initial_schema.sql:76)
    - UPDATE: `id = auth.uid()` ✅ (00_initial_schema.sql:82)
    - INSERT: `id = auth.uid()` ✅ (00_initial_schema.sql:79)
    - DELETE: `id = auth.uid()` ✅ (00_initial_schema.sql:85)
  - [ ] `location_proofs` 테이블: INSERT 정책 `user_id = auth.uid()` 확인
    - ⚠️ **아직 마이그레이션 파일에 `location_proofs` 테이블이 없음**
    - Todo 01에서 구현 예정
  - [ ] `location_proofs` 테이블: SELECT 정책 (본인 증빙만 조회) 확인
    - ⚠️ **아직 마이그레이션 파일에 `location_proofs` 테이블이 없음**
    - Todo 01에서 구현 예정

- [x] RLS 정책 성능 최적화 확인 ✅
  - [x] 인덱스 확인 ✅
    - `profiles` 테이블: 기본 인덱스 (id는 PRIMARY KEY) ✅
    - `location_proofs` 테이블: 아직 테이블이 없음 (Todo 01에서 구현 예정)
  - [x] `(SELECT auth.uid())` 패턴 사용 확인 ✅
    - `profiles` 정책: `id = auth.uid()` (단순 비교, 성능 최적화됨) ✅
    - `memberships` 정책: `user_id = (SELECT auth.uid())` (서브쿼리 패턴) ✅
    - 참고: 단순 비교(`id = auth.uid()`)가 서브쿼리(`(SELECT auth.uid())`)보다 성능상 유리하지만, 둘 다 올바른 패턴입니다.
  - [x] 역할 명시 (`TO authenticated`) 확인 ✅
    - 모든 정책에 `TO authenticated` 명시됨 ✅
    - 예: `CREATE POLICY ... TO authenticated USING ...` ✅

## 참고사항

### 폴더 구조 (피처 기반 아키텍처)

- ✅ **공통 라이브러리**: `src/lib/supabase/client.ts`는 모든 피처에서 공통으로 사용되는 Supabase 클라이언트 팩토리이므로 `lib/` 디렉토리에 위치하는 것이 맞습니다.
- ✅ **피처별 컴포넌트**: Tier 1 컴포넌트는 `features/{feature}/components/` 디렉토리에 위치합니다.
  - 예: `features/proof/components/create-proof-button.tsx`
  - 예: `features/user/components/profile-settings.tsx`

### Tier 1 사용 원칙

- Tier 1은 **오직 일반 사용자의 자신의 데이터**에만 접근합니다
- 모든 접근은 RLS 정책으로 보호되어야 합니다
- PUBLISHABLE_KEY를 사용하므로 RLS가 필수입니다
- 복잡한 비즈니스 로직은 Tier 2 (tRPC)로 이동해야 합니다

### Tier 1 컴포넌트 패턴

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
      });
  };
}
```

### 현재 구현 상태

- ✅ `src/lib/supabase/client.ts` - 구현 완료
- ✅ `features/proof/components/create-proof-button.tsx` - 구현 완료
- ✅ `features/proof/components/proofs-list.tsx` - 구현 완료
- ✅ `features/user/components/profile-settings.tsx` - Tier 1 패턴 적용 완료

### RLS 정책 상태

- ✅ `profiles` 테이블 RLS 정책 - 완벽하게 구현됨
  - SELECT, UPDATE, INSERT, DELETE 모두 `id = auth.uid()` 패턴 사용
  - 역할 명시 (`TO authenticated`) 확인됨
  - 인덱스: PRIMARY KEY (id) 자동 인덱스
- ⚠️ `location_proofs` 테이블 - 아직 마이그레이션 파일에 없음
  - Todo 01에서 구현 예정
  - 예상 RLS 정책:
    - INSERT: `user_id = auth.uid()`
    - SELECT: 복잡한 권한 체크 (본인 증빙 + 관리자 권한)

