# memberships 테이블

**작성일**: 2025-11-18  
**기준 문서**: `docs/rules/5.1.md`

## 개요

핵심 멤버십 테이블. 사용자와 조직/센터 간의 관계 및 권한을 관리합니다.

## 테이블 정의

```sql
CREATE TABLE memberships (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL, -- organizations.id 또는 centers.id 참조
  entity_type SMALLINT NOT NULL CHECK (entity_type IN (1, 2)), -- 1=ORG, 2=CENTER
  permissions BIGINT NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active', -- 소프트 삭제용
  deleted_at TIMESTAMPTZ, -- 소프트 삭제용
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, entity_id)
);
```

## 컬럼 설명

- **user_id**: UUID (NOT NULL) - 사용자 ID (`profiles.id` 참조)
- **entity_id**: UUID (NOT NULL) - 엔티티 ID (`organizations.id` 또는 `centers.id`)
- **entity_type**: SMALLINT (NOT NULL) - 엔티티 타입 (1=ORGANIZATION, 2=CENTER)
- **permissions**: BIGINT (기본값 0) - 비트 연산 기반 권한
  - 조직 권한: `ORG_VIEW`, `ORG_EDIT_SETTINGS`, `ORG_MANAGE_MEMBERS`, `ORG_VIEW_PROJECTS`, `ORG_EDIT_PROJECTS`, `ORG_OWNER`
  - 센터 권한: `CENTER_VIEW`, `CENTER_EDIT_SETTINGS`, `CENTER_MANAGE_ORGS`, `CENTER_IS_LAW_AGENCY`, `CENTER_OWNER`
- **status**: TEXT (기본값 'active') - 소프트 삭제용 상태
- **deleted_at**: TIMESTAMPTZ - 소프트 삭제 시간
- **created_at**: TIMESTAMP WITH TIME ZONE - 생성 시간
- **updated_at**: TIMESTAMP WITH TIME ZONE - 수정 시간

## 인덱스

```sql
CREATE INDEX idx_memberships_user_id ON memberships(user_id) WHERE status = 'active';
CREATE INDEX idx_memberships_entity_id ON memberships(entity_id, entity_type) WHERE status = 'active';
CREATE INDEX idx_memberships_user_entity ON memberships(user_id, entity_id, entity_type) WHERE status = 'active';
```

## RLS 정책

```sql
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 또는 해당 엔티티의 관리자만 조회 가능
CREATE POLICY "memberships_select" ON memberships
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.entity_id = memberships.entity_id
        AND m.entity_type = memberships.entity_type
        AND m.status = 'active'
        AND (
          (m.entity_type = 1 AND (m.permissions & 4)::bigint > 0) -- ORG_MANAGE_MEMBERS
          OR (m.entity_type = 2 AND (m.permissions & 4096)::bigint > 0) -- CENTER_MANAGE_ORGS
        )
    )
  )
  AND status = 'active';

-- INSERT: OWNER 또는 MANAGER만 초대 가능 (Tier 2: tRPC에서 처리)
CREATE POLICY "memberships_insert" ON memberships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.entity_id = memberships.entity_id
        AND m.entity_type = memberships.entity_type
        AND m.status = 'active'
        AND (
          (m.entity_type = 1 AND (m.permissions & 4)::bigint > 0) -- ORG_MANAGE_MEMBERS
          OR (m.entity_type = 2 AND (m.permissions & 4096)::bigint > 0) -- CENTER_MANAGE_ORGS
        )
    )
  );

-- UPDATE: OWNER 또는 MANAGER만 권한 변경 가능
CREATE POLICY "memberships_update" ON memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.entity_id = memberships.entity_id
        AND m.entity_type = memberships.entity_type
        AND m.status = 'active'
        AND (
          (m.entity_type = 1 AND (m.permissions & 4)::bigint > 0) -- ORG_MANAGE_MEMBERS
          OR (m.entity_type = 2 AND (m.permissions & 4096)::bigint > 0) -- CENTER_MANAGE_ORGS
        )
    )
  );
```

## 관련 상수

- **엔티티 타입**: `lib/constants.ts`의 `ENTITY_TYPES`
- **권한**: `lib/permissions.ts`의 `PERMISSIONS` 및 `PERMISSIONS_SQL`

## 참고사항

- 소프트 삭제 패턴 사용 (물리적 DELETE 금지)
- 권한 비트 연산은 BigInt 사용 (TypeScript) 또는 bigint 사용 (SQL)
- OWNER 권한은 명시적으로 설정 (`ORG_OWNER: 32`, `CENTER_OWNER: 16384`)

