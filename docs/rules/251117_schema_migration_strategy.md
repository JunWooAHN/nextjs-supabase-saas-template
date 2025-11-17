# 데이터베이스 스키마 마이그레이션 전략

**작성일**: 2025-11-17  
**기준 문서**: 
- `docs/todo-hypothesis/251117_todo01_database_schema.md`
- `docs/rules/251117_permission_system_improvement.md`
- `docs/rules/5.1.md`

## 문제점 분석

### 1. 권한 시스템 개선안과 스키마 문서의 불일치

**권한 시스템 개선안에서 추가된 내용:**
- `ORG_OWNER: 1n << 5n` (명시적 OWNER 플래그)
- `CENTER_OWNER: 1n << 14n` (명시적 OWNER 플래그)
- Implicit Permissions 개념 (OWNER 권한이 있으면 하위 권한 자동 포함)
- Missing Permissions 에러 처리

**현재 스키마 문서의 문제:**
- 단순히 `permissions: bigint`만 정의
- OWNER 권한의 명시적 처리 부재
- 소프트 삭제 패턴 언급되었지만 스키마에 반영 안 됨

### 2. 스키마 변경 관리의 어려움

- 개발 중 스키마가 계속 변경될 가능성
- 마이그레이션 파일 관리 필요
- 스키마 문서와 실제 DB의 동기화 문제
- 권한 상수와 DB 스키마의 불일치 가능성

## 해결 방안: 마이그레이션 기반 스키마 관리

### 핵심 원칙

1. **단일 진실 공급원 (Single Source of Truth)**
   - 마이그레이션 파일이 유일한 스키마 정의
   - 문서는 마이그레이션 파일을 기반으로 생성

2. **점진적 마이그레이션**
   - 각 변경사항을 독립적인 마이그레이션 파일로 관리
   - 롤백 가능한 구조

3. **스키마 버전 관리**
   - 마이그레이션 파일명에 타임스탬프 포함
   - 순차적 적용 보장

4. **문서 자동 동기화**
   - 마이그레이션 파일에서 스키마 문서 자동 생성 (선택적)

## 마이그레이션 파일 구조

### 파일 명명 규칙

```
supabase/migrations/
├── 00_initial_schema.sql              # 초기 스키마
├── 01_rls_setting_251116.sql          # RLS 정책
├── 02_add_permissions_251117.sql     # 권한 시스템 개선
├── 03_add_soft_delete_251118.sql     # 소프트 삭제 패턴 추가
└── ...
```

**명명 패턴**: `{순번}_{설명}_{날짜}.sql`

### 마이그레이션 파일 템플릿

```sql
-- Migration: {설명}
-- Date: {날짜}
-- Related: {관련 문서/이슈}

-- ============================================
-- UP Migration
-- ============================================

-- 변경 사항 설명
-- 예: OWNER 권한 명시적 추가를 위한 마이그레이션

-- 기존 데이터 마이그레이션 (필요시)
-- 예: 기존 OWNER 권한을 명시적으로 설정
UPDATE memberships
SET permissions = permissions | 32  -- ORG_OWNER = 32
WHERE entity_type = 1
  AND (permissions & 31) = 31;  -- 모든 조직 권한이 있는 경우

UPDATE memberships
SET permissions = permissions | 16384  -- CENTER_OWNER = 16384
WHERE entity_type = 2
  AND (permissions & 15360) = 15360;  -- 모든 센터 권한이 있는 경우

-- ============================================
-- DOWN Migration (롤백용 - 주석 처리)
-- ============================================

-- 필요시 롤백 로직 작성
-- UPDATE memberships
-- SET permissions = permissions & ~32  -- ORG_OWNER 제거
-- WHERE entity_type = 1;
```

## 스키마 문서 업데이트 전략

### 1. 마이그레이션 우선 원칙

**우선순위:**
1. 마이그레이션 파일 작성
2. 마이그레이션 적용 및 테스트
3. 문서 업데이트 (마이그레이션 파일 기반)

### 2. 문서 구조 개선

**`251117_todo01_database_schema.md`를 다음과 같이 개선:**

```markdown
# Todo 01: 데이터베이스 스키마 (Database Schema)

**작성일**: 2025-11-17  
**마지막 업데이트**: 2025-11-17  
**마이그레이션 버전**: 02_add_permissions_251117

## 현재 스키마 버전

- 초기 스키마: `00_initial_schema.sql`
- RLS 설정: `01_rls_setting_251116.sql`
- 권한 시스템 개선: `02_add_permissions_251117.sql` ⬅️ 최신

## 스키마 정의

> **주의**: 이 문서는 참고용입니다. 실제 스키마는 `supabase/migrations/` 디렉토리의 마이그레이션 파일을 참조하세요.

### 핵심 테이블

#### memberships 테이블
- **마이그레이션**: `00_initial_schema.sql`, `02_add_permissions_251117.sql`
- **변경 이력**:
  - 2025-11-17: OWNER 권한 명시적 처리 추가
```

### 3. 스키마 변경 체크리스트

스키마 변경 시 다음을 수행:

- [ ] 마이그레이션 파일 작성
- [ ] 마이그레이션 테스트 (로컬 Supabase)
- [ ] 문서 업데이트 (변경 사항 반영)
- [ ] 권한 상수와 스키마 동기화 확인
- [ ] RLS 정책 업데이트 (필요시)
- [ ] 인덱스 추가/수정 (필요시)

## 권한 시스템과 스키마 동기화

### 문제점

권한 시스템 개선안에서 OWNER 권한이 명시적으로 추가되었지만, 기존 스키마는 이를 반영하지 않음.

### 해결 방안

#### 1. 마이그레이션으로 기존 데이터 업데이트

```sql
-- 02_add_permissions_251117.sql

-- 기존 OWNER 권한을 명시적으로 설정
-- ORG_OWNER: 32 (1n << 5n)
UPDATE memberships
SET permissions = permissions | 32
WHERE entity_type = 1
  AND (
    -- 모든 조직 권한이 있는 경우 (암시적 OWNER)
    (permissions & 31) = 31
    OR
    -- 또는 기존에 특정 패턴이 있는 경우
    (permissions & 4) <> 0  -- ORG_MANAGE_MEMBERS
    AND (permissions & 16) <> 0  -- ORG_EDIT_PROJECTS
  );

-- CENTER_OWNER: 16384 (1n << 14n)
UPDATE memberships
SET permissions = permissions | 16384
WHERE entity_type = 2
  AND (
    -- 모든 센터 권한이 있는 경우
    (permissions & 15360) = 15360
    OR
    -- CENTER_MANAGE_ORGS가 있는 경우
    (permissions & 4096) <> 0  -- CENTER_MANAGE_ORGS
  );
```

#### 2. 권한 상수와 DB 값 동기화

**`lib/permissions.ts`에 SQL 상수 추가:**

```typescript
/**
 * SQL에서 사용할 수 있는 권한 상수
 * RLS 정책에서 하드코딩 대신 이 상수 사용
 * 
 * ⚠️ 중요: 이 값들은 마이그레이션 파일과 동기화되어야 함
 */
export const PERMISSIONS_SQL = {
  ORG_VIEW: 1,
  ORG_EDIT_SETTINGS: 2,
  ORG_MANAGE_MEMBERS: 4,
  ORG_VIEW_PROJECTS: 8,
  ORG_EDIT_PROJECTS: 16,
  ORG_OWNER: 32,  // ⬅️ 명시적 OWNER 추가

  CENTER_VIEW: 1024,
  CENTER_EDIT_SETTINGS: 2048,
  CENTER_MANAGE_ORGS: 4096,
  CENTER_IS_LAW_AGENCY: 8192,
  CENTER_OWNER: 16384,  // ⬅️ 명시적 OWNER 추가

  IS_APP_MANAGER: Number(1n << 60n),
} as const;

/**
 * 마이그레이션 파일에서 사용할 수 있는 SQL 함수
 * 권한 상수와 동기화 보장
 */
export const PERMISSIONS_SQL_COMMENTS = {
  ORG_OWNER: '-- PERMISSIONS_SQL.ORG_OWNER = 32',
  CENTER_OWNER: '-- PERMISSIONS_SQL.CENTER_OWNER = 16384',
} as const;
```

## 소프트 삭제 패턴 추가

### 문제점

스키마 문서에 소프트 삭제 패턴이 언급되었지만 실제 스키마에 반영되지 않음.

### 해결 방안

**마이그레이션 파일 작성:**

```sql
-- 03_add_soft_delete_251118.sql

-- 모든 테이블에 소프트 삭제 컬럼 추가
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' NOT NULL,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE centers
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' NOT NULL,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' NOT NULL,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE location_proofs
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' NOT NULL,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_organizations_active_status 
ON organizations(status) 
WHERE status != 'deleted';

CREATE INDEX IF NOT EXISTS idx_centers_active_status 
ON centers(status) 
WHERE status != 'deleted';

CREATE INDEX IF NOT EXISTS idx_memberships_active_status 
ON memberships(status) 
WHERE status != 'deleted';

CREATE INDEX IF NOT EXISTS idx_location_proofs_active_status 
ON location_proofs(status) 
WHERE status != 'deleted';

-- RLS 정책 업데이트 (삭제된 레코드 제외)
-- 기존 정책에 status 조건 추가 필요
```

## 마이그레이션 워크플로우

### 1. 스키마 변경 프로세스

```
1. 요구사항 분석
   ↓
2. 마이그레이션 파일 작성
   ↓
3. 로컬 테스트 (Supabase CLI)
   ↓
4. 문서 업데이트
   ↓
5. 코드 리뷰
   ↓
6. 프로덕션 적용
```

### 2. Supabase CLI 사용

```bash
# 마이그레이션 생성
supabase migration new add_soft_delete

# 로컬에서 마이그레이션 적용
supabase db reset

# 마이그레이션 상태 확인
supabase migration list

# 특정 마이그레이션 롤백 (개발 환경)
supabase db reset --version {version}
```

### 3. 마이그레이션 파일 검증

**각 마이그레이션 파일에 포함할 내용:**

```sql
-- 1. 변경 사항 설명
-- 2. 관련 문서/이슈 참조
-- 3. 기존 데이터 마이그레이션 (필요시)
-- 4. 롤백 로직 (주석 처리)
-- 5. 테스트 쿼리 (선택적)
```

*멱등성 보장*
이제 마이그레이션 파일을 여러 번 실행해도:
테이블이 이미 존재하면 무시
인덱스가 이미 존재하면 무시
정책이 이미 존재하면 재생성 (DROP 후 CREATE)
트리거가 이미 존재하면 재생성 (DROP 후 CREATE)
주의사항: POLICY와 TRIGGER는 DROP 후 CREATE하므로, 정책/트리거 변경 시 마이그레이션을 다시 실행하면 최신 정의로 업데이트됩니다. 이는 의도된 동작입니다.

## 권장 사항

### 1. 스키마 문서 구조 개선

**현재 구조 문제:**
- 스키마 정의가 문서에 하드코딩됨
- 마이그레이션 파일과 동기화 어려움

**개선안:**
- 문서는 마이그레이션 파일을 참조하는 형태로 변경
- 실제 스키마는 마이그레이션 파일이 단일 진실 공급원

### 2. 권한 상수 동기화

**문제:**
- TypeScript 권한 상수와 SQL 상수가 분리되어 있음
- 불일치 가능성

**해결:**
- `PERMISSIONS_SQL` 상수를 마이그레이션 파일 주석에 명시
- 마이그레이션 파일에서 권한 상수 참조


### 3. 자동화 도구 (선택적)

**장기적 개선:**
- 마이그레이션 파일에서 스키마 문서 자동 생성
- 권한 상수와 SQL 값 자동 동기화 검증
- 스키마 변경 시 관련 코드 자동 업데이트

## 즉시 적용 가능한 조치

### 1. 마이그레이션 파일 작성

```bash
# 권한 시스템 개선을 위한 마이그레이션
supabase migration new add_owner_permissions_251117
```

### 2. 스키마 문서 업데이트

- 마이그레이션 파일 참조 추가
- 변경 이력 섹션 추가
- 권한 상수와 동기화 명시

### 3. 체크리스트 문서화

- 스키마 변경 시 체크리스트 작성
- 팀원과 공유

## 결론

1. **마이그레이션 파일이 단일 진실 공급원**: 문서는 참고용
2. **점진적 변경**: 각 변경사항을 독립적인 마이그레이션으로 관리
3. **동기화 보장**: 권한 상수와 SQL 값을 주석으로 연결
4. **롤백 가능**: 각 마이그레이션에 롤백 로직 포함

이 전략을 따르면 스키마 변경을 안전하고 체계적으로 관리할 수 있습니다.

