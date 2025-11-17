# Todo 11: 타입 시스템 (Type System)

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태

Supabase 타입 자동 생성이 설정되어 있지 않습니다.

## 작업 목표

Supabase 데이터베이스 스키마로부터 TypeScript 타입을 자동 생성하고, 프로젝트 전반에서 타입 안전성을 보장합니다.

## 작업 항목

### 11.1. Supabase 타입 자동 생성 설정

- [ ] Supabase CLI 설치 확인
  - `supabase` CLI가 설치되어 있는지 확인
  - 설치되어 있지 않으면 설치: `npm install -g supabase`

- [ ] 타입 생성 스크립트 추가
  - `package.json`에 스크립트 추가
    - `"types:generate": "supabase gen types typescript --project-id <project-id> > types/supabase.ts"`
    - 또는 로컬 Supabase 사용: `supabase gen types typescript --local > types/supabase.ts`
  - 환경 변수로 프로젝트 ID 관리 (선택적)

- [ ] 타입 파일 생성
  - `types/supabase.ts` 생성 (또는 `lib/types/supabase.ts`)
  - 초기 타입 생성 실행
  - Git에 커밋 (자동 생성 파일이지만 버전 관리)

### 11.2. 타입 사용 가이드

- [ ] 데이터베이스 타입 사용
  - 모든 DB 쿼리 결과에 타입 적용
  - 예시:
    ```typescript
    import type { Database } from '@/types/supabase';
    type Profile = Database['public']['tables']['profiles']['Row'];
    type NewProfile = Database['public']['tables']['profiles']['Insert'];
    ```

- [ ] tRPC 타입 자동 추론 확인
  - tRPC는 Zod 스키마로부터 타입을 자동 추론합니다
  - 입력/출력 타입이 자동으로 생성되는지 확인

- [ ] 타입 가드 함수 생성 (선택적)
  - `lib/types/guards.ts` 생성
  - 런타임 타입 검증 함수
  - 예시: `isProfile(data: unknown): data is Profile`

### 11.3. 타입 안전성 검증

- [ ] 모든 DB 쿼리에 타입 적용 확인
  - `profiles` 테이블 쿼리
  - `memberships` 테이블 쿼리
  - `location_proofs` 테이블 쿼리
  - 기타 모든 테이블 쿼리

- [ ] `any` 타입 사용 금지 확인
  - 프로젝트 전체에서 `any` 타입 검색
  - 필요한 경우 `unknown` 사용 후 타입 가드

- [ ] 타입 에러 확인
  - TypeScript 컴파일 에러 확인
  - 모든 타입 에러 수정

### 11.4. 타입 업데이트 프로세스

- [ ] 타입 업데이트 문서화
  - 데이터베이스 스키마 변경 시 타입 재생성 필요
  - `pnpm types:generate` 실행
  - 타입 변경사항 확인 및 커밋

## 참고사항

- Supabase 타입은 데이터베이스 스키마 변경 시마다 재생성해야 합니다
- 타입 파일은 자동 생성되지만 버전 관리에 포함하는 것을 권장합니다
- 모든 DB 쿼리는 타입을 명시적으로 지정해야 합니다
- `any` 타입 사용을 절대 금지합니다
- tRPC는 Zod 스키마로부터 타입을 자동 추론하므로 추가 타입 정의가 필요 없습니다

