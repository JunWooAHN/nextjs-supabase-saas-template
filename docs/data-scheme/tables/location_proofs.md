# location_proofs 테이블

**작성일**: 2025-11-18  
**기준 문서**: `docs/rules/5.1.md`, `docs/customer-journey/251118_user_journey_hypothesis.md`

## 개요

위치 증빙 테이블 (원본 이벤트 로그). 사용자의 위치 증빙 기록을 저장합니다. MSA 관점에서 개인 입장에서 위치, 시간, 이벤트 특성을 보내고 "잊어버리는" (fire-and-forget) 원본 데이터입니다.

## 테이블 정의

```sql
CREATE TABLE location_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  entity_id UUID, -- organizations.id 또는 centers.id 참조 (NULL 가능: 개인 데이터)
  entity_type SMALLINT CHECK (entity_type IN (1, 2)), -- 1: ORGANIZATION, 2: CENTER (NULL 가능)
  proof_category SMALLINT NOT NULL CHECK (proof_category IN (1, 2, 3)), -- 1: 출근, 2: 퇴근, 3: 일반
  proof_method SMALLINT NOT NULL CHECK (proof_method IN (1, 2, 3, 4)), -- 1: GPS, 2: QR, 3: INSTANT_QR, 4: SYSTEM
  location JSONB NOT NULL, -- { "latitude": 37.123, "longitude": 127.123, "accuracy": 15.0 }
  ip_address INET, -- IP 주소 (증빙 자료)
  user_agent TEXT, -- User Agent (기기 정보 포함)
  device_info JSONB, -- 기기 정보 { "model": "iPhone 14 Pro", "os": "iOS 17.0", "browser": "Safari", "screen": { "width": 393, "height": 852 } }
  network_info JSONB, -- 네트워크 정보 { "wifi": { "ssid": "Office_WiFi", "bssid": "aa:bb:cc:dd:ee:ff" }, "cellular": { "carrier": "SKT", "signal": -85 } }
  metadata JSONB DEFAULT '{}', -- 기타 메타데이터 (확장 가능)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 컬럼 설명

- **id**: UUID (Primary Key) - 위치 증빙 고유 ID
- **user_id**: UUID (NOT NULL) - 사용자 ID (`profiles.id` 참조)
- **entity_id**: UUID (NULL 가능) - 엔티티 ID (`organizations.id` 또는 `centers.id`)
  - NULL인 경우: 개인 데이터 (시나리오 7)
- **entity_type**: SMALLINT (NULL 가능) - 엔티티 타입 (1=ORGANIZATION, 2=CENTER)
  - NULL인 경우: 개인 데이터
- **proof_category**: SMALLINT (NOT NULL) - 증빙 범주
  - 1: CHECK_IN (출근)
  - 2: CHECK_OUT (퇴근)
  - 3: GENERAL (일반 위치 증빙)
- **proof_method**: SMALLINT (NOT NULL) - 증빙 방식
  - 1: GPS
  - 2: QR
  - 3: INSTANT_QR (60초 유효 QR)
  - 4: SYSTEM (자동 퇴근 등)
- **location**: JSONB (NOT NULL) - 위치 정보
  - 예: `{ "latitude": 37.123, "longitude": 127.123, "accuracy": 15.0 }`
- **ip_address**: INET - IP 주소 (증빙 자료)
  - 클라이언트의 IP 주소
  - IPv4 또는 IPv6 형식
- **user_agent**: TEXT - User Agent 문자열 (기기 정보 포함)
  - 브라우저/앱 정보
  - 예: `"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"`
- **device_info**: JSONB - 기기 정보
  - 예: `{ "model": "iPhone 14 Pro", "os": "iOS 17.0", "browser": "Safari", "screen": { "width": 393, "height": 852 }, "platform": "mobile" }`
  - 모델, OS, 브라우저, 화면 크기 등
- **network_info**: JSONB - 네트워크 정보
  - 예: `{ "wifi": { "ssid": "Office_WiFi", "bssid": "aa:bb:cc:dd:ee:ff", "rssi": -65 }, "cellular": { "carrier": "SKT", "signal": -85, "type": "5G" } }`
  - WiFi SSID, BSSID, 셀룰러 정보 등
- **metadata**: JSONB (기본값 '{}') - 기타 메타데이터 (확장 가능)
  - 추가 증빙 자료나 확장 정보
  - 예: `{ "battery_level": 85, "timezone": "Asia/Seoul", "language": "ko-KR" }`
- **created_at**: TIMESTAMP WITH TIME ZONE - 생성 시간

## 인덱스

```sql
CREATE INDEX idx_location_proofs_user_id ON location_proofs(user_id);
CREATE INDEX idx_location_proofs_entity ON location_proofs(entity_id, entity_type) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_location_proofs_created_at ON location_proofs(created_at DESC);
CREATE INDEX idx_location_proofs_user_created ON location_proofs(user_id, created_at DESC);
CREATE INDEX idx_location_proofs_category ON location_proofs(proof_category);
CREATE INDEX idx_location_proofs_ip_address ON location_proofs(ip_address) WHERE ip_address IS NOT NULL;
CREATE INDEX idx_location_proofs_device_info ON location_proofs USING GIN(device_info) WHERE device_info IS NOT NULL;
CREATE INDEX idx_location_proofs_network_info ON location_proofs USING GIN(network_info) WHERE network_info IS NOT NULL;
```

## RLS 정책

```sql
ALTER TABLE location_proofs ENABLE ROW LEVEL SECURITY;

-- SELECT: 복잡한 권한 체크
-- 1. 본인이 생성한 증빙
-- 2. 증빙이 조직(type=1) 소속이고 내가 그 조직의 관리자인 경우
-- 3. 증빙이 센터(type=2) 소속이고 내가 그 센터의 관리자인 경우
-- 4. 증빙이 조직(type=1) 소속이고 내가 그 조직을 관리하는 센터의 관리자인 경우
CREATE POLICY "location_proofs_select" ON location_proofs
  FOR SELECT
  USING (
    -- 1. 본인이 생성한 증빙
    user_id = auth.uid()
    OR (
      -- 2. 증빙이 조직(type=1) 소속이고 내가 그 조직의 관리자인 경우
      (
        entity_type = 1 AND -- ORGANIZATION
        EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.user_id = auth.uid()
            AND m.entity_id = location_proofs.entity_id
            AND m.entity_type = 1
            AND m.status = 'active'
            AND (m.permissions & 4)::bigint > 0 -- ORG_MANAGE_MEMBERS
        )
      )
    )
    OR (
      -- 3. 증빙이 센터(type=2) 소속이고 내가 그 센터의 관리자인 경우
      (
        entity_type = 2 AND -- CENTER
        EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.user_id = auth.uid()
            AND m.entity_id = location_proofs.entity_id
            AND m.entity_type = 2
            AND m.status = 'active'
            AND (m.permissions & 4096)::bigint > 0 -- CENTER_MANAGE_ORGS
        )
      )
    )
    OR (
      -- 4. 증빙이 조직(type=1) 소속이고 내가 그 조직을 관리하는 센터의 관리자인 경우
      (
        entity_type = 1 AND -- ORGANIZATION
        EXISTS (
          SELECT 1
          FROM memberships m
          JOIN center_org_relationships cor ON cor.center_id = m.entity_id
          WHERE m.user_id = auth.uid()
            AND m.entity_type = 2 -- CENTER
            AND cor.organization_id = location_proofs.entity_id
            AND m.status = 'active'
            AND (m.permissions & 4096)::bigint > 0 -- CENTER_MANAGE_ORGS
        )
      )
    )
  );

-- INSERT: 본인만 생성 가능 (Tier 1: 클라이언트 직접 접근)
CREATE POLICY "location_proofs_insert" ON location_proofs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

## 관련 상수

- **엔티티 타입**: `lib/constants.ts`의 `ENTITY_TYPES`
- **증빙 범주**: `lib/constants.ts`의 `PROOF_CATEGORIES`
- **증빙 방식**: `lib/constants.ts`의 `PROOF_METHODS`

## 참고사항

- 개인 데이터: `entity_id`와 `entity_type`이 NULL인 경우 개인 데이터로 처리
- Tier 1: 클라이언트에서 직접 접근하여 생성 가능
- 위치 정보는 JSONB로 저장하여 유연성 확보
- 변경 불가능 (immutable): 원본 이벤트 로그이므로 수정/삭제 불가
- 증빙 자료: IP 주소, 기기 정보, 네트워크 정보 등 모든 원시 데이터를 저장하여 감사 추적 가능
- JSONB 인덱스: `device_info`와 `network_info`는 GIN 인덱스를 사용하여 JSONB 쿼리 성능 향상

## MSA 아키텍처 관점

이 테이블은 **MSA(Microservices Architecture)** 관점에서 **원본 이벤트 로그**입니다:

### 역할

- **개인 입장**: 위치, 시간, 이벤트 특성을 보내고 "잊어버림" (fire-and-forget)
- **원본 데이터**: 비즈니스 로직 없이 순수하게 사용자가 보낸 원시 데이터만 저장
- **Immutable**: 변경 불가능한 이벤트 로그

### attendance_events와의 관계

- **location_proofs**: 원본 이벤트 로그 (이 테이블)
  - 개인 입장에서 위치, 시간, 이벤트 특성을 보내고 "잊어버림"
  - 비즈니스 로직 없음
  - 변경 불가능
  
- **attendance_events**: 처리된 이벤트
  - 조직 입장에서 `location_proofs`를 확인하여 올바른 출근/퇴근/위치보고인지 확인하여 기록
  - 비즈니스 로직 적용 (위치 검증, 시간 검증, 패턴 분석)
  - 승인/거부 상태 관리
  - `location_proof_id`로 원본 데이터 추적

### 데이터 흐름

```
사용자 → location_proofs (원본 이벤트) → [비즈니스 로직 처리] → attendance_events (처리된 이벤트)
```

자세한 비교는 `docs/data-scheme/tables/TABLE_COMPARISON.md` 참조

