# qr_codes 테이블

**작성일**: 2025-11-18  
**기준 문서**: `docs/customer-journey/251118_user_journey_hypothesis.md`

## 개요

QR 코드 정보 테이블. 조직/센터별 QR 코드 생성 및 관리에 사용됩니다. 고객 여정의 핵심 기능입니다.

## 테이블 정의

```sql
CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL, -- organizations.id 또는 centers.id 참조
  entity_type SMALLINT NOT NULL CHECK (entity_type IN (1, 2)), -- 1: ORGANIZATION, 2: CENTER
  action_type SMALLINT NOT NULL CHECK (action_type IN (1, 2, 3)), -- 1: proof, 2: checkin, 3: checkout
  code_hash TEXT NOT NULL UNIQUE, -- QR 코드 해시 (보안)
  expires_at TIMESTAMPTZ, -- 만료 시간 (NULL이면 영구)
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 컬럼 설명

- **id**: UUID (Primary Key) - QR 코드 고유 ID
- **entity_id**: UUID (NOT NULL) - 엔티티 ID (`organizations.id` 또는 `centers.id`)
- **entity_type**: SMALLINT (NOT NULL) - 엔티티 타입 (1=ORGANIZATION, 2=CENTER)
- **action_type**: SMALLINT (NOT NULL) - 액션 타입
  - 1: proof (위치 증빙)
  - 2: checkin (출근)
  - 3: checkout (퇴근)
- **code_hash**: TEXT (NOT NULL, UNIQUE) - QR 코드 해시 (보안을 위해 원본 URL 대신 해시 저장)
- **expires_at**: TIMESTAMPTZ - 만료 시간 (NULL이면 영구 유효)
- **is_active**: BOOLEAN (기본값 true) - 활성 상태
- **created_by**: UUID - 생성자 ID (`profiles.id` 참조)
- **created_at**: TIMESTAMP WITH TIME ZONE - 생성 시간
- **updated_at**: TIMESTAMP WITH TIME ZONE - 수정 시간

## 인덱스

```sql
CREATE INDEX idx_qr_codes_entity ON qr_codes(entity_id, entity_type);
CREATE INDEX idx_qr_codes_hash ON qr_codes(code_hash);
CREATE INDEX idx_qr_codes_active ON qr_codes(is_active) WHERE is_active = true;
CREATE INDEX idx_qr_codes_expires ON qr_codes(expires_at) WHERE expires_at IS NOT NULL;
```

## RLS 정책

```sql
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- SELECT: 엔티티 멤버는 조회 가능, 또는 QR 코드 해시로 조회 가능 (공개 읽기)
CREATE POLICY "qr_codes_select" ON qr_codes
  FOR SELECT
  USING (
    -- QR 코드 해시로 조회하는 경우 (공개 읽기)
    code_hash IS NOT NULL
    OR
    -- 엔티티 멤버인 경우
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.entity_id = qr_codes.entity_id
        AND m.entity_type = qr_codes.entity_type
        AND m.status = 'active'
    )
  )
  AND is_active = true;

-- INSERT/UPDATE: MANAGER 이상만 가능
CREATE POLICY "qr_codes_modify" ON qr_codes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
        AND m.entity_id = qr_codes.entity_id
        AND m.entity_type = qr_codes.entity_type
        AND m.status = 'active'
        AND (
          (m.entity_type = 1 AND (m.permissions & 4)::bigint > 0) -- ORG_MANAGE_MEMBERS
          OR (m.entity_type = 2 AND (m.permissions & 4096)::bigint > 0) -- CENTER_MANAGE_ORGS
        )
    )
  );
```

## QR 코드 URL 형식

```
https://prove-geo.app/qr/{entityType}/{entityId}?action={actionType}&hash={codeHash}
```

예시:
- 센터 위치 증빙: `https://prove-geo.app/qr/center/{centerId}?action=proof&hash={hash}`
- 조직 출근: `https://prove-geo.app/qr/org/{orgId}?action=checkin&hash={hash}`

## 관련 상수

- **엔티티 타입**: `lib/constants.ts`의 `ENTITY_TYPES`
- **액션 타입**: 추후 `lib/constants.ts`에 추가 필요
  - `QR_ACTION_TYPES.PROOF = 1`
  - `QR_ACTION_TYPES.CHECKIN = 2`
  - `QR_ACTION_TYPES.CHECKOUT = 3`

## 참고사항

- QR 코드 해시는 보안을 위해 원본 URL 대신 저장
- 만료 시간이 있는 QR 코드는 `INSTANT_QR` (60초 유효) 등에 사용 가능
- QR 코드 스캔 시 구독 상태 확인 필요 (시나리오 5, 6)

