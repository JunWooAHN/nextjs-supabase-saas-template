# Commuting App 기능 분석 및 통합 계획

**작성일**: 2025-11-18  
**참고 리포지토리**: https://github.com/JunWooAHN/commuting-react-supabase-app  
**로컬 참조 경로**: `reference-repos/commuting-react-supabase-app/`  
**분석 방법**: 실제 코드베이스 분석 (Git Clone)  
**기준 문서**: 
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`
- `docs/rules/251117_feature_based_architecture.md`

## 분석 개요

commuting-react-supabase-app의 실제 코드베이스를 분석하여 구현된 핵심 기능을 식별하고, prove-geo-web-app v5.1 아키텍처에 통합할 기능을 정리합니다.

## 실제 구현된 기능 분석

### 1. 출퇴근 이벤트 시스템 (Attendance Events)

**파일 위치**: 
- `app/api/attendance/process/route.ts`
- `lib/services/attendance-service.ts`
- `components/attendance/attendance-clock-button.tsx`

**핵심 기능**:
- 출퇴근 이벤트 생성 (`clock_in`, `clock_out`, `location_report`)
- GPS 위치 기반 출퇴근
- 자동 승인 시스템 (가중치 기반 신뢰도 평가)
- 출퇴근 이력 조회

**데이터베이스 스키마**:
```sql
-- attendance_events 테이블
CREATE TABLE attendance_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  event_type USER-DEFINED NOT NULL, -- 'clock_in', 'clock_out', 'location_report'
  latitude REAL,
  longitude REAL,
  address TEXT,
  location_type USER-DEFINED, -- 'office', 'remote', 'other_location'
  work_location_id UUID REFERENCES work_locations(id),
  status USER-DEFINED DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  event_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  ip_address INET,
  user_agent TEXT
);
```

**우선순위**: 높음  
**복잡도**: 중간  
**Tier**: Tier 1 (이벤트 생성) + Tier 2 (승인 프로세스)

---

### 2. 자동 승인 시스템 (Enhanced Auto Approval)

**파일 위치**: 
- `lib/business-logic/enhanced-auto-approval.ts`
- `app/api/attendance/process/route.ts` (통합)

**핵심 기능**:
- 가중치 기반 신뢰도 평가 엔진
- 다중 규칙 평가 (시간 검증, 위치 검증, 패턴 분석)
- 동적 가중치 조정 (회사별, 사용자별, 시간대별)
- 신뢰도 점수 기반 자동 승인/거부/수동 검토 결정

**주요 규칙**:
1. 시간 검증 (가중치 25%)
2. 위치 검증 (가중치 20%)
3. 패턴 분석 (가중치 20%)
4. 사용자 행동 분석 (가중치 15%)
5. 비즈니스 규칙 (가중치 10%)
6. 디바이스 검증 (가중치 10%)

**우선순위**: 높음  
**복잡도**: 높음  
**Tier**: Tier 2 (tRPC)

---

### 3. 위치 기반 출퇴근 (Location-Based Attendance)

**파일 위치**: 
- `lib/services/gps-address-service.ts`
- `app/api/geocoding/reverse/route.ts`
- `app/api/gps/address/route.ts`

**핵심 기능**:
- GPS 좌표 → 주소 변환 (역 지오코딩)
- 주소 캐싱 시스템 (`address_cache` 테이블)
- 근무지 위치 검증 (`work_locations` 테이블)
- 위치 기반 출퇴근 허용 반경 설정

**데이터베이스 스키마**:
```sql
-- work_locations 테이블
CREATE TABLE work_locations (
  id UUID PRIMARY KEY,
  owner_type USER-DEFINED NOT NULL, -- 'company', 'user'
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES profiles(id),
  name VARCHAR NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  address TEXT NOT NULL,
  allowed_radius_meters INTEGER DEFAULT 100,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- address_cache 테이블
CREATE TABLE address_cache (
  id UUID PRIMARY KEY,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  address_full TEXT NOT NULL,
  address_short TEXT,
  address_district TEXT,
  api_provider VARCHAR NOT NULL,
  confidence_score NUMERIC DEFAULT 1.00,
  hit_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- location_based_attendance_logs 테이블
CREATE TABLE location_based_attendance_logs (
  id UUID PRIMARY KEY,
  attendance_event_id UUID REFERENCES attendance_events(id),
  work_location_id UUID REFERENCES work_locations(id),
  distance_meters DOUBLE PRECISION,
  within_allowed_radius BOOLEAN,
  gps_accuracy_meters INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**우선순위**: 높음  
**복잡도**: 중간  
**Tier**: Tier 1 (GPS 조회) + Tier 2 (위치 검증)

---

### 4. 출퇴근 이력 및 상태 관리

**파일 위치**: 
- `components/attendance/AttendanceHistory.tsx`
- `components/attendance/attendance-status.tsx`
- `lib/services/attendance-service.ts` (getTodayAttendance, getAttendanceHistory)

**핵심 기능**:
- 오늘의 출퇴근 기록 조회
- 출퇴근 이력 조회 (기간별)
- 출퇴근 상태 표시 (근무 중/근무 종료)
- 근무 시간 계산 및 표시
- 출퇴근 이벤트 상태 표시 (승인됨/대기중/거부됨)

**우선순위**: 중간  
**복잡도**: 낮음  
**Tier**: Tier 1 (본인 데이터 조회)

---

### 5. 회사/조직 관리 시스템

**파일 위치**: 
- `app/api/app-admin/companies/route.ts`
- 데이터베이스: `companies` 테이블

**핵심 기능**:
- 회사 생성 및 관리
- 회사별 근무 시간 설정 (`work_start_time`, `work_end_time`)
- 타임존 설정 (`timezone`)
- 빌링 플랜 연동 (`plan_id`, `plan_features`)

**데이터베이스 스키마**:
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  business_registration_number TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  plan_id UUID REFERENCES billing_plans(id),
  plan_features JSONB DEFAULT '{}',
  work_start_time TIME DEFAULT '09:00:00',
  work_end_time TIME DEFAULT '18:00:00',
  timezone VARCHAR DEFAULT 'Asia/Seoul',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  plan_started_at TIMESTAMPTZ,
  plan_expires_at TIMESTAMPTZ,
  latest_billing_log_id UUID REFERENCES billing_logs(id)
);
```

**우선순위**: 중간  
**복잡도**: 낮음  
**Tier**: Tier 2 (tRPC)

---

### 6. 빌링 시스템

**파일 위치**: 
- 데이터베이스: `billing_plans`, `billing_logs` 테이블

**핵심 기능**:
- 구독 플랜 관리
- 결제 로그 기록
- 플랜별 기능 제한 (`plan_features` JSONB)

**데이터베이스 스키마**:
```sql
CREATE TABLE billing_plans (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  max_employees INTEGER NOT NULL,
  features JSONB NOT NULL,
  price_monthly NUMERIC,
  is_trial BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE billing_logs (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID REFERENCES profiles(id),
  status USER-DEFINED NOT NULL DEFAULT 'pending',
  payment_method USER-DEFINED NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  vat_amount NUMERIC DEFAULT 0.00,
  discount_amount NUMERIC DEFAULT 0.00,
  final_amount NUMERIC NOT NULL CHECK (final_amount >= 0),
  requested_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  description TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  billing_period_starts_at DATE NOT NULL,
  billing_period_ends_at DATE NOT NULL,
  pg_provider TEXT,
  pg_transaction_id TEXT UNIQUE,
  receipt_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**우선순위**: 낮음 (이미 우리 프로젝트에 있음)  
**복잡도**: 중간

---

### 7. 알림 시스템 (Notification Event System)

**파일 위치**: 
- `lib/events/notification-event-system.ts`
- `app/api/attendance/process/route.ts` (통합)

**핵심 기능**:
- 이벤트 기반 알림 발행
- 출퇴근 승인/거부 알림
- 우선순위 기반 알림 처리

**우선순위**: 낮음  
**복잡도**: 중간  
**Tier**: Tier 2 (tRPC) + Server Actions

---

### 8. 대시보드 및 통계

**파일 위치**: 
- `components/dashboard/attendance-chart.tsx`
- `app/(protected)/employee/dashboard/page.tsx`
- `app/(protected)/company-admin/dashboard/page.tsx`

**핵심 기능**:
- 출퇴근 통계 차트 (주간)
- 최근 출퇴근 기록
- 역할별 맞춤 대시보드

**우선순위**: 중간  
**복잡도**: 낮음  
**Tier**: Tier 1 (본인 데이터) + Tier 2 (관리자 데이터)

---

## 우리 프로젝트로 가져올 기능 우선순위

### Phase 1: 핵심 출퇴근 기능 (1-2주)

1. **출퇴근 이벤트 시스템** ⭐⭐⭐
   - `attendance_events` 테이블 생성
   - 출퇴근 이벤트 생성 API (Tier 1)
   - 출퇴근 이력 조회 (Tier 1)

2. **위치 기반 출퇴근** ⭐⭐⭐
   - `work_locations` 테이블 생성
   - GPS 좌표 → 주소 변환 (역 지오코딩)
   - 위치 기반 출퇴근 허용 반경 검증

3. **출퇴근 상태 관리** ⭐⭐
   - 오늘의 출퇴근 기록 조회
   - 출퇴근 상태 표시 컴포넌트
   - 근무 시간 계산

### Phase 2: 자동 승인 시스템 (2-3주)

4. **자동 승인 시스템** ⭐⭐⭐
   - 가중치 기반 신뢰도 평가 엔진
   - 다중 규칙 평가 시스템
   - 자동 승인/거부/수동 검토 결정

### Phase 3: 관리 기능 (1-2주)

5. **근무 시간 정책 관리** ⭐⭐
   - 회사별 근무 시간 설정 (`work_start_time`, `work_end_time`)
   - 타임존 설정
   - 근무 시간 정책 UI

6. **대시보드 및 통계** ⭐
   - 출퇴근 통계 차트
   - 역할별 대시보드

### Phase 4: 부가 기능 (선택적)

7. **알림 시스템** ⭐
   - 이벤트 기반 알림 발행
   - 출퇴근 승인/거부 알림

---

## 데이터베이스 마이그레이션 계획

### 마이그레이션 1: 출퇴근 이벤트 시스템

```sql
-- 04_add_attendance_events_251118.sql

-- attendance_events 테이블 생성
CREATE TABLE attendance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  entity_id UUID NOT NULL, -- organizations.id 또는 centers.id
  entity_type SMALLINT NOT NULL CHECK (entity_type IN (1, 2)), -- 1: ORGANIZATION, 2: CENTER
  event_type SMALLINT NOT NULL CHECK (event_type IN (1, 2, 3)), -- 1: clock_in, 2: clock_out, 3: location_report
  latitude REAL,
  longitude REAL,
  address TEXT,
  location_type SMALLINT CHECK (location_type IN (1, 2, 3)), -- 1: office, 2: remote, 3: other_location
  work_location_id UUID, -- work_locations.id 참조 (나중에 생성)
  status SMALLINT DEFAULT 1 CHECK (status IN (1, 2, 3)), -- 1: pending, 2: approved, 3: rejected
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  event_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  ip_address INET,
  user_agent TEXT
);

-- 인덱스 생성
CREATE INDEX idx_attendance_events_user_id ON attendance_events(user_id);
CREATE INDEX idx_attendance_events_entity ON attendance_events(entity_id, entity_type);
CREATE INDEX idx_attendance_events_event_time ON attendance_events(event_time DESC);
CREATE INDEX idx_attendance_events_status ON attendance_events(status);

-- RLS 정책
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

-- INSERT: 본인만 생성 가능
CREATE POLICY "attendance_events_insert" ON attendance_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: 본인 또는 관리자만 수정 가능
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
          (m.entity_type = 1 AND (m.permissions & 4)::bigint > 0)
          OR (m.entity_type = 2 AND (m.permissions & 4096)::bigint > 0)
        )
    )
  );
```

### 마이그레이션 2: 근무지 위치 관리

```sql
-- 05_add_work_locations_251118.sql

-- work_locations 테이블 생성
CREATE TABLE work_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL, -- organizations.id 또는 centers.id
  entity_type SMALLINT NOT NULL CHECK (entity_type IN (1, 2)),
  name VARCHAR NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  address TEXT NOT NULL,
  allowed_radius_meters INTEGER DEFAULT 100,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX idx_work_locations_entity ON work_locations(entity_id, entity_type);
CREATE INDEX idx_work_locations_active ON work_locations(is_active) WHERE is_active = true;

-- RLS 정책
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

-- attendance_events에 work_location_id 외래키 추가
ALTER TABLE attendance_events
  ADD CONSTRAINT attendance_events_work_location_id_fkey
  FOREIGN KEY (work_location_id) REFERENCES work_locations(id);
```

### 마이그레이션 3: 주소 캐시 시스템

```sql
-- 06_add_address_cache_251118.sql

-- address_cache 테이블 생성
CREATE TABLE address_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  address_full TEXT NOT NULL,
  address_short TEXT,
  address_district TEXT,
  api_provider VARCHAR NOT NULL,
  confidence_score NUMERIC DEFAULT 1.00 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  hit_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(latitude, longitude, api_provider)
);

-- 인덱스 생성
CREATE INDEX idx_address_cache_coordinates ON address_cache(latitude, longitude);
CREATE INDEX idx_address_cache_last_used ON address_cache(last_used_at DESC);

-- RLS 정책 (공개 읽기, 시스템 쓰기)
ALTER TABLE address_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "address_cache_select" ON address_cache
  FOR SELECT
  USING (true);

-- INSERT/UPDATE는 서버 사이드에서만 수행 (RLS 정책 없음, service_role 사용)
```

---

## 구현 작업 체크리스트

### 1. 출퇴근 이벤트 시스템

- [ ] `attendance_events` 테이블 마이그레이션 생성
- [ ] `features/attendance/` 피처 모듈 생성
  - [ ] `services/attendance.service.ts` (서비스 레이어)
  - [ ] `trpc/attendance.router.ts` (Tier 2: 승인 프로세스)
  - [ ] `components/attendance-clock-button.tsx` (Tier 1: 출퇴근 버튼)
  - [ ] `components/attendance-history.tsx` (Tier 1: 이력 조회)
  - [ ] `components/attendance-status.tsx` (Tier 1: 상태 표시)
- [ ] `(user)/attendance/page.tsx` 라우트 생성
- [ ] `lib/constants.ts`에 출퇴근 이벤트 타입 상수 추가

### 2. 위치 기반 출퇴근

- [ ] `work_locations` 테이블 마이그레이션 생성
- [ ] `address_cache` 테이블 마이그레이션 생성
- [ ] `features/location/` 피처 모듈 생성
  - [ ] `services/geocoding.service.ts` (역 지오코딩 서비스)
  - [ ] `services/location-validation.service.ts` (위치 검증 서비스)
  - [ ] `trpc/location.router.ts` (Tier 2: 위치 관리)
  - [ ] `components/work-location-form.tsx` (근무지 설정 폼)
- [ ] `app/api/geocoding/reverse/route.ts` API 라우트 생성
- [ ] `(org-management)/[orgId]/work-locations/page.tsx` 라우트 생성

### 3. 자동 승인 시스템

- [ ] `features/approval/` 피처 모듈 생성
  - [ ] `services/auto-approval.service.ts` (자동 승인 서비스)
  - [ ] `services/confidence-engine.ts` (신뢰도 평가 엔진)
  - [ ] `trpc/approval.router.ts` (Tier 2: 승인 프로세스)
- [ ] 가중치 기반 규칙 시스템 구현
- [ ] 다중 규칙 평가 로직 구현
- [ ] 동적 가중치 조정 로직 구현

### 4. 근무 시간 정책 관리

- [ ] `organizations` 테이블에 `work_start_time`, `work_end_time`, `timezone` 컬럼 추가
- [ ] `features/work-policy/` 피처 모듈 생성
  - [ ] `trpc/work-policy.router.ts` (Tier 2)
  - [ ] `components/work-policy-form.tsx` (정책 설정 폼)
- [ ] `(org-management)/[orgId]/work-policy/page.tsx` 라우트 생성

### 5. 대시보드 및 통계

- [ ] `features/statistics/` 피처 모듈 생성
  - [ ] `trpc/statistics.router.ts` (Tier 2: 통계 조회)
  - [ ] `components/attendance-chart.tsx` (차트 컴포넌트)
- [ ] `(user)/dashboard/page.tsx`에 출퇴근 통계 추가
- [ ] `(org-management)/[orgId]/dashboard/page.tsx`에 조직 통계 추가

---

## 아키텍처 준수 사항

### 3-Tier 아키텍처

- **Tier 1**: 출퇴근 이벤트 생성, 본인 이력 조회, 출퇴근 상태 조회
- **Tier 2**: 자동 승인 프로세스, 위치 검증, 근무지 관리, 통계 조회
- **Tier 3**: 알림 배치 처리 (선택적)

### 피처 기반 아키텍처

각 기능은 독립적인 피처 모듈로 구성:
- `features/attendance/` - 출퇴근 이벤트
- `features/location/` - 위치 관리
- `features/approval/` - 자동 승인
- `features/work-policy/` - 근무 시간 정책
- `features/statistics/` - 통계 및 리포트

### 권한 시스템

- 출퇴근 이벤트 생성: 본인만 가능 (Tier 1)
- 출퇴근 이벤트 조회: 본인 또는 `ORG_MANAGE_MEMBERS` / `CENTER_MANAGE_ORGS`
- 근무지 관리: `ORG_MANAGE_MEMBERS` / `CENTER_MANAGE_ORGS`
- 자동 승인: 시스템 자동 처리 (Tier 2)

### RLS 정책

- 모든 테이블에 RLS 활성화
- 사용자는 본인 데이터만 조회 가능
- 관리자는 엔티티 멤버 데이터 조회 가능
- 권한 기반 접근 제어

---

## 참고사항

- 출퇴근 이벤트는 기존 `location_proofs` 테이블과 별도로 관리됩니다
- `location_proofs`는 일반 위치 증빙, `attendance_events`는 출퇴근 전용입니다
- 자동 승인 시스템은 선택적 기능이며, 단계적으로 구현 가능합니다
- 위치 기반 출퇴근은 GPS 정확도에 따라 허용 반경을 조정할 수 있습니다
- 주소 캐싱 시스템은 지오코딩 API 호출 비용을 절감합니다

## 참조 리포지토리

실제 구현 코드는 로컬 참조 리포지토리에서 확인할 수 있습니다:
- **경로**: `reference-repos/commuting-react-supabase-app/`
- **업데이트**: `pnpm reference:update` 또는 `./scripts/manage-reference-repos.sh`
- **자세한 정보**: `reference-repos/README.md` 참조

