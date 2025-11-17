# Todo 03: Tier 1 (일반 사용자) - 클라이언트 직접 접근

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태

`lib/supabase/client.ts` 존재 ✅

## 작업 목표

Tier 1 (일반 사용자)의 클라이언트 직접 접근 패턴을 확인하고, RLS 정책이 올바르게 보호하는지 검증합니다.

## 작업 항목

### 3.1. Tier 1 클라이언트 확인

- [ ] `lib/supabase/client.ts` 확인
  - `createBrowserSupabaseClient()` 함수가 올바르게 구현되어 있는지 확인
  - PUBLISHABLE_KEY 사용 확인
  - `@supabase/ssr`의 `createBrowserClient` 사용 확인

### 3.2. Tier 1 사용 예시 구현

- [ ] 위치 증빙 생성 예시 구현
  - `CreateProofButton` 컴포넌트에서 사용할 패턴
  - `navigator.geolocation.getCurrentPosition()` 호출
  - `supabase.from('location_proofs').insert(...)` 직접 호출
  - RLS INSERT 정책 (user_id = auth.uid())으로 보호됨

- [ ] 내 프로필 조회/수정 예시
  - `supabase.from('profiles').select().eq('id', userId).single()` - 조회
  - `supabase.from('profiles').update(...).eq('id', userId)` - 수정
  - RLS 정책으로 보호됨

- [ ] 내 위치 증빙 조회 예시
  - `supabase.from('location_proofs').select().eq('user_id', userId)` - 조회
  - RLS SELECT 정책으로 보호됨

### 3.3. RLS 정책 검증

- [ ] Tier 1 사용 패턴에 대한 RLS 정책 검증
  - `profiles` 테이블: `id = auth.uid()` 정책 확인
  - `location_proofs` 테이블: INSERT 정책 `user_id = auth.uid()` 확인
  - `location_proofs` 테이블: SELECT 정책 (본인 증빙만 조회) 확인

- [ ] RLS 정책 성능 최적화 확인
  - 인덱스가 올바르게 생성되어 있는지 확인
  - `(select auth.uid())` 패턴 사용 확인
  - 역할 명시 (`TO authenticated`) 확인

## 참고사항

- Tier 1은 **오직 일반 사용자의 자신의 데이터**에만 접근합니다
- 모든 접근은 RLS 정책으로 보호되어야 합니다
- PUBLISHABLE_KEY를 사용하므로 RLS가 필수입니다
- 복잡한 비즈니스 로직은 Tier 2 (tRPC)로 이동해야 합니다

