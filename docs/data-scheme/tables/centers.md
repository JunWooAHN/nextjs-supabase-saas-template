# centers 테이블

**작성일**: 2025-11-18  
**기준 문서**: `docs/rules/5.1.md`, `docs/customer-journey/251118_user_journey_hypothesis.md`

## 개요

센터 테이블. 법정 대리인 역할을 겸할 수 있는 엔티티입니다.

## 테이블 정의

```sql
CREATE TABLE centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  work_start_time TIME DEFAULT '09:00:00',
  work_end_time TIME DEFAULT '18:00:00',
  timezone VARCHAR DEFAULT 'Asia/Seoul',
  force_clockout_at_midnight BOOLEAN DEFAULT false, -- 자정(23:59:59) 강제 퇴근 여부
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 컬럼 설명

- **id**: UUID (Primary Key) - 센터 고유 ID
- **name**: TEXT (NOT NULL) - 센터 이름
- **work_start_time**: TIME (기본값 '09:00:00') - 기본 출근 시간
- **work_end_time**: TIME (기본값 '18:00:00') - 기본 퇴근 시간
- **timezone**: VARCHAR (기본값 'Asia/Seoul') - 센터 타임존
- **force_clockout_at_midnight**: BOOLEAN (기본값 false) - 자정(23:59:59) 강제 퇴근 여부
  - `true`: 자정을 넘기면 자동으로 퇴근 처리 (야근 불가)
  - `false`: 자정을 넘겨도 출근 상태 유지 (야근 가능)
- **created_at**: TIMESTAMP WITH TIME ZONE - 생성 시간
- **updated_at**: TIMESTAMP WITH TIME ZONE - 수정 시간

## 인덱스

```sql
CREATE INDEX idx_centers_name ON centers(name);
```

## RLS 정책

```sql
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;

-- SELECT: 멤버는 자신이 속한 센터만 조회 가능
CREATE POLICY "centers_select" ON centers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.entity_id = centers.id
        AND m.entity_type = 2 -- CENTER
        AND m.status = 'active'
    )
  );

-- INSERT: 앱 매니저만 생성 가능
CREATE POLICY "centers_insert" ON centers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.permissions & 1152921504606846976)::bigint > 0 -- IS_APP_MANAGER
    )
  );

-- UPDATE: OWNER 또는 MANAGER만 수정 가능
CREATE POLICY "centers_update" ON centers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.entity_id = centers.id
        AND m.entity_type = 2 -- CENTER
        AND m.status = 'active'
        AND (
          (m.permissions & 16384)::bigint > 0 -- CENTER_OWNER
          OR (m.permissions & 2048)::bigint > 0 -- CENTER_EDIT_SETTINGS
        )
    )
  );
```

## 관련 상수

- **엔티티 타입**: `lib/constants.ts`의 `ENTITY_TYPES.CENTER = 2`

## 참고사항

- 센터는 법정 대리인 역할을 겸할 수 있음 (`CENTER_IS_LAW_AGENCY` 권한)
- 구독 상태는 `entity_subscriptions` 테이블에서 관리

