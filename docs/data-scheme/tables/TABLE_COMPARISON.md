# location_proofs vs attendance_events 비교 분석

**작성일**: 2025-11-18  
**목적**: 두 테이블의 차이점 분석 및 통합 가능성 검토

## MSA 아키텍처 관점

### 핵심 개념: 이벤트 소싱 패턴 (Event Sourcing Pattern)

두 테이블은 **MSA(Microservices Architecture)** 관점에서 서로 다른 역할을 가집니다:

#### location_proofs (원본 이벤트 로그)
- **역할**: 개인 입장에서 위치, 시간, 이벤트 특성을 보내고 "잊어버림" (fire-and-forget)
- **특징**:
  - 원본 데이터 (immutable log)
  - 비즈니스 로직 없음
  - 사용자가 보낸 원시 데이터
  - 승인/검증 없음
  - 변경 불가능 (immutable)

#### attendance_events (처리된 이벤트)
- **역할**: 조직 입장에서 `location_proofs`를 확인하여 올바른 출근/퇴근/위치보고인지 확인하여 기록
- **특징**:
  - 처리된 데이터 (processed data)
  - 비즈니스 로직 적용 (위치 검증, 시간 검증, 패턴 분석)
  - 승인/거부 상태 관리
  - 조직의 출퇴근 기록
  - `location_proof_id`로 원본 데이터 추적 가능

### 데이터 흐름

```
사용자 → location_proofs (원본 이벤트) → [비즈니스 로직 처리] → attendance_events (처리된 이벤트)
```

1. **사용자**: 위치, 시간, 이벤트 특성을 `location_proofs`에 기록 (fire-and-forget)
2. **시스템**: `location_proofs`를 읽어서 비즈니스 로직 적용
   - 위치 검증 (work_locations와 비교)
   - 시간 검증
   - 패턴 분석
   - 자동 승인/거부 결정
3. **결과**: `attendance_events`에 처리된 결과 기록 (`location_proof_id`로 원본 추적)

## 핵심 차이점

### 1. 목적 및 용도

#### location_proofs (원본 이벤트 로그)
- **목적**: 원본 위치 증빙 이벤트 기록 (immutable log)
- **용도**: 
  - 일반 위치 증빙 (GENERAL)
  - 출퇴근 증빙 (CHECK_IN, CHECK_OUT) - 원본 데이터
  - 개인 데이터 지원 (entity_id NULL 가능)
- **특징**: 
  - 승인 프로세스 없음
  - 즉시 기록 (immutable)
  - Tier 1: 클라이언트 직접 접근
  - 변경 불가능 (fire-and-forget)

#### attendance_events (처리된 이벤트)
- **목적**: 조직 입장에서 처리된 출퇴근 이벤트 관리
- **용도**:
  - 출근 이벤트 (clock_in)
  - 퇴근 이벤트 (clock_out)
  - 위치보고 이벤트 (location_report)
- **특징**:
  - 승인/거부 상태 관리 (pending, approved, rejected)
  - 승인자, 승인 시간, 거부 사유 추적
  - 자동 승인 시스템과 연동
  - 감사 추적 (IP 주소, User Agent)
  - `location_proof_id`로 원본 데이터 추적

### 2. 데이터 구조 비교

| 항목 | location_proofs | attendance_events |
|------|----------------|-------------------|
| **위치 저장** | JSONB (`{latitude, longitude, accuracy}`) | 별도 컬럼 (`latitude`, `longitude`, `address`) |
| **승인 상태** | 없음 | 있음 (`status`, `approved_by`, `approved_at`) |
| **근무지 연동** | 없음 | 있음 (`work_location_id`) |
| **감사 추적** | 없음 | 있음 (`ip_address`, `user_agent`) |
| **이벤트 시간** | `created_at`만 | `event_time` (별도) |
| **개인 데이터** | 지원 (entity_id NULL) | 미지원 (entity_id NOT NULL) |
| **메모/노트** | 없음 | 있음 (`notes`) |
| **원본 추적** | 없음 | 있음 (`location_proof_id`) |

### 3. 비즈니스 로직 차이

#### location_proofs (원본 이벤트)
- **워크플로우**: 사용자 → 즉시 기록 → 완료 (fire-and-forget)
- **검증**: RLS 정책만 (본인 확인)
- **비즈니스 로직**: 없음 (원본 데이터만 저장)
- **사용 사례**:
  - 비로그인 사용자 위치 증빙 (시나리오 1)
  - 개인 위치 인증 (시나리오 7)
  - 원본 출퇴근 기록 (나중에 처리될 수 있음)

#### attendance_events (처리된 이벤트)
- **워크플로우**: `location_proofs` 읽기 → 비즈니스 로직 처리 → 승인/거부 결정 → 기록
- **검증**: 
  - 위치 검증 (work_locations와 연동)
  - 시간 검증
  - 패턴 분석
  - 자동 승인 시스템
- **비즈니스 로직**: 모든 검증 및 승인 프로세스 포함
- **사용 사례**:
  - 조직/센터 출퇴근 관리
  - 승인이 필요한 출퇴근 기록
  - 근무 시간 계산
  - 통계 및 리포트

## 통합 가능성 검토

### 옵션 1: 현재 구조 유지 (권장)

**장점**:
- 각 테이블의 목적이 명확함
- 기존 코드와의 호환성 유지
- 단순한 위치 증빙과 복잡한 출퇴근 관리 분리

**단점**:
- 데이터 중복 가능성 (출퇴근 기록이 두 테이블에 저장될 수 있음)
- 쿼리 복잡도 증가

**권장 사용 패턴**:
- `location_proofs`: 
  - 비로그인 사용자 위치 증빙
  - 개인 위치 인증
  - 간단한 위치 기록
- `attendance_events`:
  - 조직/센터 출퇴근 관리
  - 승인이 필요한 출퇴근
  - 근무 시간 계산

### 옵션 2: location_proofs 확장 (비권장)

**방법**: `location_proofs`에 승인 관련 컬럼 추가

**단점**:
- 기존 테이블 구조 변경 필요
- 개인 데이터와 조직 데이터 혼재
- 복잡도 증가
- 기존 코드 영향도 큼

### 옵션 3: attendance_events로 통합 (비권장)

**방법**: `location_proofs`를 제거하고 `attendance_events`만 사용

**단점**:
- 개인 데이터 지원 어려움 (entity_id NOT NULL)
- 비로그인 사용자 지원 어려움
- 기존 코드 대규모 수정 필요
- 단순한 위치 증빙에 과도한 구조

## 권장 아키텍처 (MSA 관점)

### 이벤트 소싱 패턴

```
location_proofs (원본 이벤트 로그)
    ↓ [비즈니스 로직 처리]
attendance_events (처리된 이벤트)
```

**데이터 흐름**:
1. 사용자가 `location_proofs`에 원본 데이터 기록 (fire-and-forget)
2. 시스템이 `location_proofs`를 읽어서 비즈니스 로직 적용
3. 처리 결과를 `attendance_events`에 기록 (`location_proof_id`로 원본 추적)

**장점**:
- 원본 데이터 보존 (감사 추적)
- 재처리 가능 (비즈니스 로직 변경 시)
- 데이터 일관성 (원본은 변경 불가)
- MSA 패턴 준수 (이벤트 기반 아키텍처)

### 사용 시나리오별 매핑

| 시나리오 | 사용 테이블 | 이유 |
|---------|-----------|------|
| 시나리오 1: 비로그인 위치증빙 | `location_proofs` | 단순 기록, 승인 불필요 |
| 시나리오 2-3: 비로그인 출근 | `attendance_events` | 승인 프로세스 필요 |
| 시나리오 4: 위치보고 | `attendance_events` | 이벤트 타입: location_report |
| 시나리오 5: 로그인 출근 | `attendance_events` | 승인 프로세스 필요 |
| 시나리오 7: 개인 위치 인증 | `location_proofs` | 개인 데이터, 승인 불필요 |

## 결론

**두 테이블을 분리 유지하는 것이 적절합니다.**

**이유**:
1. **목적이 다름**: 단순 위치 증빙 vs 출퇴근 관리
2. **복잡도 차이**: 승인 프로세스 유무
3. **사용 사례 분리**: 개인 데이터 vs 조직 데이터
4. **기존 코드 호환성**: `location_proofs`는 이미 구현됨

**권장 사항**:
- `location_proofs`: 원본 이벤트 로그 (immutable), 개인 데이터, 비로그인 사용자
- `attendance_events`: 처리된 이벤트 (비즈니스 로직 적용), 승인 프로세스, 조직/센터 데이터
- `attendance_events.location_proof_id`로 원본 데이터 추적
- 재처리 가능: 비즈니스 로직 변경 시 `location_proofs`를 다시 처리하여 `attendance_events` 재생성 가능

