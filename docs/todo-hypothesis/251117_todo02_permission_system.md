# Todo 02: 권한 시스템 (Permission System)

**작성일**: 2025-11-17  
**기준 문서**: 
- `.cursor/rules/basic-architecture.mdc`
- `docs/rules/00_supabase_architecture_1.5.md`
- `docs/rules/5.1.md`

## 현재 상태

권한 시스템 관련 파일이 완전히 누락되어 있습니다.

## 작업 목표

비트 연산(Bitwise) 기반 권한 시스템을 구현합니다. BigInt를 사용하여 권한을 비트 플래그로 관리하고, 역할별 권한 프리셋을 제공합니다.

## 작업 항목

### 2.1. 상수 정의 파일 생성

- [ ] `lib/constants.ts` 생성
  - ENTITY_TYPES
    - ORGANIZATION: 1
    - CENTER: 2
  - PROOF_CATEGORIES
    - CHECK_IN: 1 (출근)
    - CHECK_OUT: 2 (퇴근)
    - GENERAL: 3 (일반 위치 증빙)
  - PROOF_METHODS
    - GPS: 1
    - QR: 2
    - INSTANT_QR: 3 (예: 60초 유효 QR)
    - SYSTEM: 4 (예: 자동 퇴근)
  - SUBSCRIPTION_INTERVALS
    - MONTHLY: 1 (월간)
    - YEARLY: 2 (연간)
  - SUBSCRIPTION_STATUS
    - ACTIVE: 1 (활성)
    - PAST_DUE: 2 (연체 - 유예 기간)
    - SUSPENDED: 3 (정지 - 기능 차단)
    - CANCELED: 4 (취소)

### 2.2. 권한 정의 파일 생성

- [ ] `lib/permissions.ts` 생성
  - PERMISSIONS 객체 (BigInt bitwise 권한)
    - 조직 권한 (Type: 1)
      - ORG_VIEW: 1n << 0n
      - ORG_EDIT_SETTINGS: 1n << 1n
      - ORG_MANAGE_MEMBERS: 1n << 2n (하위 증빙 조회 권한 겸함)
      - ORG_VIEW_PROJECTS: 1n << 3n
      - ORG_EDIT_PROJECTS: 1n << 4n
    - 센터 권한 (Type: 2)
      - CENTER_VIEW: 1n << 10n
      - CENTER_EDIT_SETTINGS: 1n << 11n
      - CENTER_MANAGE_ORGS: 1n << 12n (하위 증빙 조회 권한 겸함)
      - CENTER_IS_LAW_AGENCY: 1n << 13n
    - 앱 매니저
      - IS_APP_MANAGER: 1n << 60n
  - ROLES 객체 (역할별 권한 프리셋)
    - 조직 역할 (Type 1)
      - ORG_MEMBER: ORG_VIEW | ORG_VIEW_PROJECTS
      - ORG_MANAGER: ORG_MEMBER | ORG_EDIT_SETTINGS | ORG_MANAGE_MEMBERS | ORG_EDIT_PROJECTS
      - ORG_OWNER: ORG_MANAGER | (1n << 5n)
    - 센터 역할 (Type 2)
      - CENTER_STAFF: CENTER_VIEW
      - CENTER_MANAGER: CENTER_STAFF | CENTER_EDIT_SETTINGS | CENTER_MANAGE_ORGS
      - CENTER_OWNER: CENTER_MANAGER | (1n << 14n)
      - CENTER_LAW_AGENCY: CENTER_STAFF | CENTER_MANAGE_ORGS | CENTER_IS_LAW_AGENCY
    - 앱 매니저
      - APP_MANAGER: IS_APP_MANAGER

### 2.3. 권한 유틸리티 함수 생성

- [ ] `lib/permissions.ts`에 유틸리티 함수 추가
  - `hasPermission(userPermissions: bigint, requiredPermission: bigint): boolean`
    - 비트 연산으로 권한 체크: `(userPermissions & requiredPermission) !== 0n`
  - `hasAnyPermission(userPermissions: bigint, requiredPermissions: bigint[]): boolean`
    - 여러 권한 중 하나라도 있는지 체크
  - `hasAllPermissions(userPermissions: bigint, requiredPermissions: bigint[]): boolean`
    - 모든 권한이 있는지 체크
  - `addPermission(userPermissions: bigint, permission: bigint): bigint`
    - 권한 추가: `userPermissions | permission`
  - `removePermission(userPermissions: bigint, permission: bigint): bigint`
    - 권한 제거: `userPermissions & ~permission`

## 참고사항

- 모든 권한은 BigInt 타입을 사용합니다 (JavaScript의 Number는 53비트 정밀도 제한)
- 비트 연산은 `&` (AND), `|` (OR), `~` (NOT), `<<` (LEFT SHIFT)를 사용합니다
- 권한 체크는 `(permissions & requiredPermission) !== 0n` 패턴을 사용합니다
- RLS 정책에서도 동일한 비트 연산 패턴을 사용해야 합니다

