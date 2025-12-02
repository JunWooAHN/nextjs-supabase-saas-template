# Todo 02: 권한 시스템 (Permission System)

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태

권한 시스템 관련 파일이 **이미 완전히 구현되어 있습니다**. ✅
- `src/lib/constants.ts` - 모든 상수 정의 완료
- `src/lib/permissions.ts` - 권한 시스템 완전 구현 (PermissionsBitField 클래스 포함)

## 작업 목표

비트 연산(Bitwise) 기반 권한 시스템을 구현합니다. BigInt를 사용하여 권한을 비트 플래그로 관리하고, 역할별 권한 프리셋을 제공합니다.

**✅ 완료**: 모든 작업 항목이 이미 구현되어 있습니다. 실제 구현은 Todo보다 더 고급 기능을 포함합니다 (PermissionsBitField 클래스, MissingPermissionError 등).

## 작업 항목

### 2.1. 상수 정의 파일 생성

- [x] `src/lib/constants.ts` 생성 ✅
  - [x] ENTITY_TYPES ✅
    - ORGANIZATION: 1
    - CENTER: 2
  - [x] PROOF_CATEGORIES ✅
    - CHECK_IN: 1 (출근)
    - CHECK_OUT: 2 (퇴근)
    - GENERAL: 3 (일반 위치 증빙)
  - [x] PROOF_METHODS ✅
    - GPS: 1
    - QR: 2
    - INSTANT_QR: 3 (예: 60초 유효 QR)
    - SYSTEM: 4 (예: 자동 퇴근)
  - [x] SUBSCRIPTION_INTERVALS ✅
    - MONTHLY: 1 (월간)
    - YEARLY: 2 (연간)
  - [x] SUBSCRIPTION_STATUS ✅
    - ACTIVE: 1 (활성)
    - PAST_DUE: 2 (연체 - 유예 기간)
    - SUSPENDED: 3 (정지 - 기능 차단)
    - CANCELED: 4 (취소)

### 2.2. 권한 정의 파일 생성

- [x] `src/lib/permissions.ts` 생성 ✅
  - [x] PERMISSIONS 객체 (BigInt bitwise 권한) ✅
    - [x] 조직 권한 (Type: 1) ✅
      - ORG_VIEW: 1n << 0n
      - ORG_EDIT_SETTINGS: 1n << 1n
      - ORG_MANAGE_MEMBERS: 1n << 2n (하위 증빙 조회 권한 겸함)
      - ORG_VIEW_PROJECTS: 1n << 3n
      - ORG_EDIT_PROJECTS: 1n << 4n
      - ORG_OWNER: 1n << 5n (명시적 OWNER 플래그)
    - [x] 센터 권한 (Type: 2) ✅
      - CENTER_VIEW: 1n << 10n
      - CENTER_EDIT_SETTINGS: 1n << 11n
      - CENTER_MANAGE_ORGS: 1n << 12n (하위 증빙 조회 권한 겸함)
      - CENTER_IS_LAW_AGENCY: 1n << 13n
      - CENTER_OWNER: 1n << 14n (명시적 OWNER 플래그)
    - [x] 앱 매니저 ✅
      - IS_APP_MANAGER: 1n << 60n
  - [x] PERMISSIONS_SQL 객체 (SQL에서 사용할 수 있는 Number 값) ✅
  - [x] ROLES 객체 (역할별 권한 프리셋) ✅
    - [x] 조직 역할 (Type 1) ✅
      - ORG_MEMBER: ORG_VIEW | ORG_VIEW_PROJECTS
      - ORG_MANAGER: ORG_MEMBER | ORG_EDIT_SETTINGS | ORG_MANAGE_MEMBERS | ORG_EDIT_PROJECTS
      - ORG_OWNER: 모든 조직 권한 + ORG_OWNER 플래그
    - [x] 센터 역할 (Type 2) ✅
      - CENTER_STAFF: CENTER_VIEW
      - CENTER_MANAGER: CENTER_STAFF | CENTER_EDIT_SETTINGS | CENTER_MANAGE_ORGS
      - CENTER_OWNER: CENTER_MANAGER | CENTER_OWNER 플래그
      - CENTER_LAW_AGENCY: CENTER_STAFF | CENTER_MANAGE_ORGS | CENTER_IS_LAW_AGENCY
    - [x] 앱 매니저 ✅
      - APP_MANAGER: IS_APP_MANAGER
  - [x] PermissionsBitField 클래스 (Discord.js 스타일) ✅
  - [x] MissingPermissionError 클래스 ✅
  - [x] requirePermission 헬퍼 함수 ✅

### 2.3. 권한 유틸리티 함수 생성

- [x] `src/lib/permissions.ts`에 유틸리티 함수 추가 ✅
  - [x] `hasPermission(userPermissions: bigint, requiredPermission: bigint): boolean` ✅
    - 비트 연산으로 권한 체크: `(userPermissions & requiredPermission) !== 0n`
    - ⚠️ @deprecated: PermissionsBitField.has() 사용 권장
  - [x] `hasAnyPermission(userPermissions: bigint, requiredPermissions: bigint[]): boolean` ✅
    - 여러 권한 중 하나라도 있는지 체크
    - ⚠️ @deprecated: PermissionsBitField.hasAny() 사용 권장
  - [x] `hasAllPermissions(userPermissions: bigint, requiredPermissions: bigint[]): boolean` ✅
    - 모든 권한이 있는지 체크
    - ⚠️ @deprecated: PermissionsBitField.has() 사용 권장
  - [x] `addPermission(userPermissions: bigint, permission: bigint): bigint` ✅
    - 권한 추가: `userPermissions | permission`
    - ⚠️ @deprecated: PermissionsBitField.add() 사용 권장
  - [x] `removePermission(userPermissions: bigint, permission: bigint): bigint` ✅
    - 권한 제거: `userPermissions & ~permission`
    - ⚠️ @deprecated: PermissionsBitField.remove() 사용 권장

## 참고사항

### 폴더 구조 (피처 기반 아키텍처)

- ✅ **공통 라이브러리**: `src/lib/constants.ts`와 `src/lib/permissions.ts`는 **모든 피처에서 공통으로 사용**되는 전역 상수이므로 `lib/` 디렉토리에 위치하는 것이 맞습니다.
- ✅ **피처별 상수**: 피처별로 고유한 상수가 필요한 경우 `features/{feature}/types/` 또는 `features/{feature}/utils/`에 위치할 수 있습니다.
- ✅ **권한 시스템**: 권한 시스템은 모든 피처에서 사용되므로 `lib/permissions.ts`에 위치하는 것이 적절합니다.

### 기술적 참고사항

- 모든 권한은 BigInt 타입을 사용합니다 (JavaScript의 Number는 53비트 정밀도 제한)
- 비트 연산은 `&` (AND), `|` (OR), `~` (NOT), `<<` (LEFT SHIFT)를 사용합니다
- 권한 체크는 `(permissions & requiredPermission) !== 0n` 패턴을 사용합니다
- RLS 정책에서도 동일한 비트 연산 패턴을 사용해야 합니다

