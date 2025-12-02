# work_locations 테이블

**작성일**: 2025-11-18  
**기준 문서**: `docs/todo-hypothesis/251118_commuting_app_features.md`, `docs/customer-journey/251118_user_journey_hypothesis.md`

## 개요

근무지 위치 테이블. 조직/센터별 허용 반경을 설정하여 위치 기반 출퇴근 검증에 사용됩니다.

## 테이블 정의

```sql
CREATE TABLE work_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL, -- organizations.id 또는 centers.id 참조
  entity_type SMALLINT NOT NULL CHECK (entity_type IN (1, 2)), -- 1: ORGANIZATION, 2: CENTER
  name VARCHAR NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  address TEXT NOT NULL,
  allowed_radius_meters INTEGER DEFAULT 100,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 컬럼 설명

- **id**: UUID (Primary Key) - 근무지 위치 고유 ID
- **entity_id**: UUID (NOT NULL) - 엔티티 ID (`organizations.id` 또는 `centers.id`)
- **entity_type**: SMALLINT (NOT NULL) - 엔티티 타입 (1=ORGANIZATION, 2=CENTER)
- **name**: VARCHAR (NOT NULL) - 근무지 이름 (예: "본사 1층", "강남 지점")
- **latitude**: REAL (NOT NULL) - 위도
- **longitude**: REAL (NOT NULL) - 경도
- **address**: TEXT (NOT NULL) - 주소
- **allowed_radius_meters**: INTEGER (기본값 100) - 허용 반경 (미터 단위)
- **is_primary**: BOOLEAN (기본값 false) - 기본 근무지 여부
- **is_active**: BOOLEAN (기본값 true) - 활성 상태
- **created_at**: TIMESTAMP WITH TIME ZONE - 생성 시간
- **updated_at**: TIMESTAMP WITH TIME ZONE - 수정 시간

## 인덱스

```sql
CREATE INDEX idx_work_locations_entity ON work_locations(entity_id, entity_type);
CREATE INDEX idx_work_locations_active ON work_locations(is_active) WHERE is_active = true;
CREATE INDEX idx_work_locations_primary ON work_locations(entity_id, entity_type, is_primary) WHERE is_primary = true;
```

## RLS 정책

```sql
ALTER TABLE work_locations ENABLE ROW LEVEL SECURITY;

-- SELECT: 엔티티 멤버는 조회 가능
CREATE POLICY "work_locations_select" ON work_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.entity_id = work_locations.entity_id
        AND m.entity_type = work_locations.entity_type
        AND m.status = 'active'
    )
  );

-- INSERT/UPDATE: MANAGER 이상만 가능
CREATE POLICY "work_locations_modify" ON work_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.entity_id = work_locations.entity_id
        AND m.entity_type = work_locations.entity_type
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

## 참고사항

- 하나의 엔티티는 여러 근무지 위치를 가질 수 있음
- `is_primary`가 true인 위치가 기본 근무지로 사용됨
- 위치 검증 시 허용 반경 내에 있는지 확인
- `attendance_events` 테이블의 `work_location_id`와 연동

