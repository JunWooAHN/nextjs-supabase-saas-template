# attendance_events 테이블

**작성일**: 2025-11-18  
**기준 문서**: `docs/todo-hypothesis/251118_commuting_app_features.md`, `docs/customer-journey/251118_user_journey_hypothesis.md`

## 개요

출퇴근 이벤트 테이블. 출근, 퇴근, 위치보고 등의 이벤트를 기록합니다. commuting-app에서 가져온 핵심 기능입니다.

## 테이블 정의

```sql
CREATE TABLE attendance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_proof_id UUID REFERENCES location_proofs(id), -- 원본 이벤트 추적 (MSA 패턴)
  user_id UUID NOT NULL REFERENCES profiles(id),
  entity_id UUID NOT NULL, -- organizations.id 또는 centers.id 참조
  entity_type SMALLINT NOT NULL CHECK (entity_type IN (1, 2)), -- 1: ORGANIZATION, 2: CENTER
  event_type SMALLINT NOT NULL CHECK (event_type IN (1, 2, 3)), -- 1: clock_in, 2: clock_out, 3: location_report
  latitude REAL,
  longitude REAL,
  address TEXT,
  location_type SMALLINT CHECK (location_type IN (1, 2, 3)), -- 1: office, 2: remote, 3: other_location
  work_location_id UUID REFERENCES work_locations(id),
  status SMALLINT DEFAULT 1 CHECK (status IN (1, 2, 3)), -- 1: pending, 2: approved, 3: rejected
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  event_time TIMESTAMPTZ NOT NULL,
  notes TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 컬럼 설명

- **id**: UUID (Primary Key) - 출퇴근 이벤트 고유 ID
- **location_proof_id**: UUID - 원본 이벤트 ID (`location_proofs.id` 참조)
  - MSA 패턴: 어떤 `location_proofs`에서 처리되었는지 추적
  - 재처리 가능: 비즈니스 로직 변경 시 원본 데이터로 다시 처리 가능
  - 감사 추적: 원본 데이터와 처리된 데이터 연결
- **user_id**: UUID (NOT NULL) - 사용자 ID (`profiles.id` 참조)
- **entity_id**: UUID (NOT NULL) - 엔티티 ID (`organizations.id` 또는 `centers.id`)
- **entity_type**: SMALLINT (NOT NULL) - 엔티티 타입 (1=ORGANIZATION, 2=CENTER)
- **event_type**: SMALLINT (NOT NULL) - 이벤트 타입
  - 1: clock_in (출근)
  - 2: clock_out (퇴근)
  - 3: location_report (위치보고)
- **latitude**: REAL - 위도
- **longitude**: REAL - 경도
- **address**: TEXT - 주소 (역 지오코딩 결과)
- **location_type**: SMALLINT - 위치 타입
  - 1: office (사무실)
  - 2: remote (원격)
  - 3: other_location (기타 위치)
- **work_location_id**: UUID - 근무지 위치 ID (`work_locations.id` 참조)
- **status**: SMALLINT (기본값 1) - 승인 상태
  - 1: pending (대기중)
  - 2: approved (승인됨)
  - 3: rejected (거부됨)
- **approved_by**: UUID - 승인자 ID (`profiles.id` 참조)
- **approved_at**: TIMESTAMPTZ - 승인 시간
- **rejection_reason**: TEXT - 거부 사유
- **event_time**: TIMESTAMPTZ (NOT NULL) - 이벤트 발생 시간
- **notes**: TEXT - 메모
- **ip_address**: INET - IP 주소
- **user_agent**: TEXT - User Agent
- **created_at**: TIMESTAMP WITH TIME ZONE - 생성 시간
- **updated_at**: TIMESTAMP WITH TIME ZONE - 수정 시간

## 인덱스

```sql
CREATE INDEX idx_attendance_events_user_id ON attendance_events(user_id);
CREATE INDEX idx_attendance_events_entity ON attendance_events(entity_id, entity_type);
CREATE INDEX idx_attendance_events_event_time ON attendance_events(event_time DESC);
CREATE INDEX idx_attendance_events_status ON attendance_events(status);
CREATE INDEX idx_attendance_events_user_date ON attendance_events(user_id, event_time DESC);
CREATE INDEX idx_attendance_events_location_proof_id ON attendance_events(location_proof_id) WHERE location_proof_id IS NOT NULL;
```

## RLS 정책

```sql
ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인 또는 관리자만 조회 가능
CREATE POLICY "attendance_events_select" ON attendance_events
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.entity_id = attendance_events.entity_id
        AND m.entity_type = attendance_events.entity_type
        AND m.status = 'active'
        AND (
          (m.entity_type = 1 AND (m.permissions & 4)::bigint > 0) -- ORG_MANAGE_MEMBERS
          OR (m.entity_type = 2 AND (m.permissions & 4096)::bigint > 0) -- CENTER_MANAGE_ORGS
        )
    )
  );

-- INSERT: 본인만 생성 가능 (Tier 1: 클라이언트 직접 접근)
CREATE POLICY "attendance_events_insert" ON attendance_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: 본인 또는 관리자만 수정 가능 (승인/거부)
CREATE POLICY "attendance_events_update" ON attendance_events
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.entity_id = attendance_events.entity_id
        AND m.entity_type = attendance_events.entity_type
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
- **이벤트 타입**: 추후 `lib/constants.ts`에 추가 필요
  - `ATTENDANCE_EVENT_TYPES.CLOCK_IN = 1`
  - `ATTENDANCE_EVENT_TYPES.CLOCK_OUT = 2`
  - `ATTENDANCE_EVENT_TYPES.LOCATION_REPORT = 3`

## 참고사항

- 출퇴근 이벤트는 `location_proofs`와 별도로 관리됩니다
- 자동 승인 시스템과 연동 가능 (가중치 기반 신뢰도 평가)
- 위치 검증은 `work_locations` 테이블과 연동

## MSA 아키텍처 관점

이 테이블은 **MSA(Microservices Architecture)** 관점에서 `location_proofs`의 **처리된 이벤트**입니다:

### 데이터 흐름

```
location_proofs (원본 이벤트 로그)
    ↓ [비즈니스 로직 처리]
attendance_events (처리된 이벤트)
```

1. **사용자**: `location_proofs`에 원본 데이터 기록 (fire-and-forget)
2. **시스템**: `location_proofs`를 읽어서 비즈니스 로직 적용
   - 위치 검증 (work_locations와 비교)
   - 시간 검증
   - 패턴 분석
   - 자동 승인/거부 결정
3. **결과**: `attendance_events`에 처리된 결과 기록 (`location_proof_id`로 원본 추적)

### location_proofs와의 관계

- **location_proofs**: 원본 이벤트 로그 (immutable)
  - 개인 입장에서 위치, 시간, 이벤트 특성을 보내고 "잊어버림"
  - 비즈니스 로직 없음
  - 변경 불가능
  
- **attendance_events**: 처리된 이벤트 (비즈니스 로직 적용)
  - 조직 입장에서 `location_proofs`를 확인하여 올바른 출근/퇴근/위치보고인지 확인하여 기록
  - 승인/거부 상태 관리
  - `location_proof_id`로 원본 데이터 추적

### 장점

- **원본 데이터 보존**: 감사 추적 가능
- **재처리 가능**: 비즈니스 로직 변경 시 `location_proofs`를 다시 처리하여 `attendance_events` 재생성 가능
- **데이터 일관성**: 원본은 변경 불가능 (immutable)
- **MSA 패턴 준수**: 이벤트 기반 아키텍처

자세한 비교는 `docs/data-scheme/tables/TABLE_COMPARISON.md` 참조

## 데이터베이스 함수

### get_current_attendance_status

현재 출근 상태를 확인하는 PostgreSQL 함수입니다. 사용자의 마지막 '거부되지 않은' 행동을 기준으로 상태를 판별하며, 조직/센터의 자정 강제 퇴근 설정을 고려합니다.

**로직**:
1. PENDING(1) 또는 APPROVED(2) 상태의 clock_in/clock_out 이벤트만 고려
2. REJECTED(3) 이벤트는 무시
3. 가장 최근 이벤트가 clock_in이면 출근중, clock_out이면 출근중 아님
4. **자정 강제 퇴근**: `force_clockout_at_midnight = true`인 경우, 자정(23:59:59)을 넘기면 자동으로 출근중 아님으로 처리

**함수 정의**:
```sql
CREATE OR REPLACE FUNCTION get_current_attendance_status(
    p_user_id uuid,
    p_entity_id uuid,
    p_entity_type integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    last_valid_event RECORD;
    entity_force_clockout BOOLEAN;
    current_time TIMESTAMPTZ;
    clock_in_date DATE;
BEGIN
    -- 엔티티의 자정 강제 퇴근 설정 확인
    IF p_entity_type = 1 THEN -- ORGANIZATION
        SELECT force_clockout_at_midnight INTO entity_force_clockout
        FROM organizations
        WHERE id = p_entity_id;
    ELSE -- CENTER
        SELECT force_clockout_at_midnight INTO entity_force_clockout
        FROM centers
        WHERE id = p_entity_id;
    END IF;
    
    -- 현재 시간 (엔티티 타임존 기준)
    current_time := NOW();
    
    -- 1. 가장 최근의 '거부되지 않은' 출/퇴근 이벤트 조회
    SELECT id, event_time, event_type
    INTO last_valid_event
    FROM public.attendance_events
    WHERE user_id = p_user_id
      AND entity_id = p_entity_id
      AND entity_type = p_entity_type
      AND event_type IN (1, 2) -- CLOCK_IN or CLOCK_OUT
      AND status IN (1, 2) -- PENDING or APPROVED
    ORDER BY event_time DESC
    LIMIT 1;
    
    -- 2. 이벤트가 없는 경우 (출근 중 아님)
    IF NOT FOUND THEN
        RETURN json_build_object(
            'isClockedIn', false,
            'clockInTime', null,
            'clockInEventId', null
        );
    END IF;
    
    -- 3. 마지막 이벤트가 '출근'인 경우
    IF last_valid_event.event_type = 1 THEN -- CLOCK_IN
        -- 자정 강제 퇴근 체크
        IF entity_force_clockout = true THEN
            clock_in_date := DATE(last_valid_event.event_time);
            -- 출근한 날의 자정(23:59:59)을 넘겼는지 확인
            IF current_time > (clock_in_date + INTERVAL '1 day' - INTERVAL '1 second') THEN
                -- 자정을 넘겼으므로 출근중 아님
                RETURN json_build_object(
                    'isClockedIn', false,
                    'clockInTime', null,
                    'clockInEventId', null
                );
            END IF;
        END IF;
        
        RETURN json_build_object(
            'isClockedIn', true,
            'clockInTime', last_valid_event.event_time,
            'clockInEventId', last_valid_event.id
        );
    -- 4. 마지막 이벤트가 '퇴근'인 경우 (혹은 그 외)
    ELSE -- event_type = 2 (CLOCK_OUT)
        RETURN json_build_object(
            'isClockedIn', false,
            'clockInTime', null,
            'clockInEventId', null
        );
    END IF;
END;
$$;
```

**사용 예시**:
```sql
-- 사용자의 현재 출근 상태 확인
SELECT get_current_attendance_status(
  'user-uuid',
  'org-uuid',
  1 -- ORGANIZATION
);
```

**반환값**: JSON
```json
{
  "isClockedIn": true,
  "clockInTime": "2025-11-18T09:00:00Z",
  "clockInEventId": "event-uuid"
}
```

**자정 강제 퇴근 동작**:
- `force_clockout_at_midnight = true`인 경우:
  - 출근한 날의 23:59:59를 넘기면 자동으로 `isClockedIn: false` 반환
  - 예: 2025-11-18 09:00에 출근 → 2025-11-19 00:00:01에 조회 시 `isClockedIn: false`
- `force_clockout_at_midnight = false`인 경우:
  - 자정을 넘겨도 출근 상태 유지 (야근 가능)
  - 예: 2025-11-18 09:00에 출근 → 2025-11-19 02:00에 조회 시 `isClockedIn: true`

**인덱스 최적화**:
```sql
-- 함수 쿼리 성능 최적화를 위한 복합 인덱스
CREATE INDEX idx_attendance_events_status_check 
ON attendance_events(user_id, entity_id, entity_type, status, event_type, event_time DESC)
WHERE status IN (1, 2) AND event_type IN (1, 2);
```

