# center_org_relationships 테이블

**작성일**: 2025-11-18  
**기준 문서**: `docs/rules/5.1.md`

## 개요

센터-조직 관계 테이블. 센터와 조직 간의 N:M 관계를 관리합니다. 센터가 여러 조직을 관리할 수 있도록 합니다.

## 테이블 정의

```sql
CREATE TABLE center_org_relationships (
  center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (center_id, organization_id)
);
```

## 컬럼 설명

- **center_id**: UUID (NOT NULL) - 센터 ID (`centers.id` 참조)
- **organization_id**: UUID (NOT NULL) - 조직 ID (`organizations.id` 참조)
- **created_at**: TIMESTAMP WITH TIME ZONE - 생성 시간

## 인덱스

```sql
CREATE INDEX idx_center_org_center_id ON center_org_relationships(center_id);
CREATE INDEX idx_center_org_org_id ON center_org_relationships(organization_id);
CREATE INDEX idx_center_org_both ON center_org_relationships(center_id, organization_id);
```

## RLS 정책

```sql
ALTER TABLE center_org_relationships ENABLE ROW LEVEL SECURITY;

-- SELECT: 센터 관리자는 자신의 센터가 관리하는 조직 관계만 조회 가능
CREATE POLICY "center_org_relationships_select" ON center_org_relationships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.entity_id = center_org_relationships.center_id
        AND m.entity_type = 2 -- CENTER
        AND m.status = 'active'
        AND (m.permissions & 4096)::bigint > 0 -- CENTER_MANAGE_ORGS
    )
  );

-- INSERT/UPDATE: 센터 관리자만 가능 (Tier 2: tRPC)
CREATE POLICY "center_org_relationships_modify" ON center_org_relationships
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.entity_id = center_org_relationships.center_id
        AND m.entity_type = 2 -- CENTER
        AND m.status = 'active'
        AND (m.permissions & 4096)::bigint > 0 -- CENTER_MANAGE_ORGS
    )
  );
```

## 관련 상수

- **엔티티 타입**: `lib/constants.ts`의 `ENTITY_TYPES`

## 참고사항

- 센터가 여러 조직을 관리할 수 있음
- 조직도 여러 센터에 의해 관리될 수 있음
- 관계 생성/삭제는 Tier 2 (tRPC)에서 처리

