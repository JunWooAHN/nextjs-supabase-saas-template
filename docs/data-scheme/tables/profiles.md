# profiles 테이블

**작성일**: 2025-11-18  
**기준 문서**: `docs/rules/5.1.md`

## 개요

사용자 프로필 테이블. Supabase Auth의 `auth.users`와 1:1 관계를 가집니다.

## 테이블 정의

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  permissions BIGINT NOT NULL DEFAULT 0, -- IS_APP_MANAGER 비트 체크용
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 컬럼 설명

- **id**: UUID (Primary Key, `auth.users.id`와 동일)
- **email**: TEXT (UNIQUE) - 사용자 이메일
- **full_name**: TEXT - 사용자 전체 이름
- **permissions**: BIGINT (기본값 0) - 앱 매니저 권한 비트 체크용
  - `IS_APP_MANAGER`: `1n << 60n` (lib/permissions.ts 참조)
- **created_at**: TIMESTAMP WITH TIME ZONE - 생성 시간
- **updated_at**: TIMESTAMP WITH TIME ZONE - 수정 시간

## 인덱스

```sql
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_permissions ON profiles(permissions) WHERE permissions > 0;
```

## RLS 정책

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 또는 앱 매니저만 조회 가능
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.permissions & 1152921504606846976)::bigint > 0 -- IS_APP_MANAGER
    )
  );

-- UPDATE: 본인만 수정 가능 (이메일, 이름 등)
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE
  USING (id = auth.uid());
```

## 관련 상수

- **권한**: `lib/permissions.ts`의 `PERMISSIONS.IS_APP_MANAGER`

## 참고사항

- `auth.users` 테이블과 자동 동기화되어야 함 (트리거 또는 함수 사용)
- 이메일은 `auth.users.email`과 동기화 필요

