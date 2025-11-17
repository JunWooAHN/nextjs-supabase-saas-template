/**
 * 권한 시스템 (Discord.js 스타일)
 * 
 * BigInt 기반 비트 연산을 사용한 권한 시스템
 * 
 * @module permissions
 * @see {@link https://discordjs.guide/legacy/popular-topics/permissions.html Discord.js Permissions Guide}
 */

import { ENTITY_TYPES } from './constants';

// ============================================
// 권한 플래그 정의
// ============================================

/**
 * 권한 플래그 정의
 * 각 권한은 고유한 비트 위치를 가짐
 */
export const PERMISSIONS = {
  // --- 조직(Organization) 권한 (Type: 1) ---
  ORG_VIEW: 1n << 0n,
  ORG_EDIT_SETTINGS: 1n << 1n,
  ORG_MANAGE_MEMBERS: 1n << 2n, // 하위 증빙 조회 권한 겸함
  ORG_VIEW_PROJECTS: 1n << 3n,
  ORG_EDIT_PROJECTS: 1n << 4n,
  ORG_OWNER: 1n << 5n, // 명시적 OWNER 플래그

  // --- 센터(Center) 권한 (Type: 2) ---
  CENTER_VIEW: 1n << 10n,
  CENTER_EDIT_SETTINGS: 1n << 11n,
  CENTER_MANAGE_ORGS: 1n << 12n, // 하위 증빙 조회 권한 겸함
  CENTER_IS_LAW_AGENCY: 1n << 13n,
  CENTER_OWNER: 1n << 14n, // 명시적 OWNER 플래그

  // --- 앱 매니저 ---
  IS_APP_MANAGER: 1n << 60n,
} as const;

/**
 * SQL에서 사용할 수 있는 권한 상수
 * RLS 정책에서 하드코딩 대신 이 상수 사용
 * 
 * ⚠️ 중요: 이 값들은 마이그레이션 파일과 동기화되어야 함
 */
export const PERMISSIONS_SQL = {
  ORG_VIEW: 1,
  ORG_EDIT_SETTINGS: 2,
  ORG_MANAGE_MEMBERS: 4,
  ORG_VIEW_PROJECTS: 8,
  ORG_EDIT_PROJECTS: 16,
  ORG_OWNER: 32,

  CENTER_VIEW: 1024,
  CENTER_EDIT_SETTINGS: 2048,
  CENTER_MANAGE_ORGS: 4096,
  CENTER_IS_LAW_AGENCY: 8192,
  CENTER_OWNER: 16384,

  IS_APP_MANAGER: Number(1n << 60n),
} as const;

/**
 * 마이그레이션 파일에서 사용할 수 있는 SQL 주석
 * 권한 상수와 동기화 보장
 */
export const PERMISSIONS_SQL_COMMENTS = {
  ORG_OWNER: '-- PERMISSIONS_SQL.ORG_OWNER = 32',
  CENTER_OWNER: '-- PERMISSIONS_SQL.CENTER_OWNER = 16384',
  ORG_MANAGE_MEMBERS: '-- PERMISSIONS_SQL.ORG_MANAGE_MEMBERS = 4',
  CENTER_MANAGE_ORGS: '-- PERMISSIONS_SQL.CENTER_MANAGE_ORGS = 4096',
} as const;

// ============================================
// 타입 정의
// ============================================

export type PermissionFlag = keyof typeof PERMISSIONS;

export type PermissionResolvable =
  | bigint
  | number
  | string
  | PermissionsBitField
  | PermissionResolvable[];

// ============================================
// PermissionsBitField 클래스
// ============================================

/**
 * Discord.js 스타일의 권한 비트필드 클래스
 * BigInt 기반 비트 연산을 객체 지향적으로 래핑
 */
export class PermissionsBitField {
  private readonly bitfield: bigint;

  constructor(permissions: PermissionResolvable = 0n) {
    if (permissions instanceof PermissionsBitField) {
      this.bitfield = permissions.bitfield;
    } else if (typeof permissions === 'bigint') {
      this.bitfield = permissions;
    } else if (typeof permissions === 'number') {
      this.bitfield = BigInt(permissions);
    } else if (typeof permissions === 'string') {
      this.bitfield = BigInt(permissions);
    } else if (Array.isArray(permissions)) {
      this.bitfield = permissions.reduce(
        (acc, perm) => acc | this.resolvePermission(perm),
        0n
      );
    } else {
      this.bitfield = 0n;
    }
  }

  /**
   * 권한 플래그를 BigInt로 변환
   */
  private resolvePermission(permission: PermissionResolvable): bigint {
    if (typeof permission === 'bigint') return permission;
    if (typeof permission === 'number') return BigInt(permission);
    if (permission instanceof PermissionsBitField) {
      return permission.bitfield;
    }
    if (typeof permission === 'string') {
      // "ORG_VIEW" 같은 문자열을 플래그로 변환
      return PERMISSIONS[permission as keyof typeof PERMISSIONS] || 0n;
    }
    return 0n;
  }

  /**
   * 단일 또는 다중 권한 체크
   * @param permission - 체크할 권한 (단일 또는 배열)
   * @param allowAdmin - IS_APP_MANAGER 권한이 있으면 모든 권한 허용 (기본값: true)
   * @param entityType - 엔티티 타입 (1: ORGANIZATION, 2: CENTER). OWNER 권한 체크에 필요
   */
  has(
    permission: PermissionResolvable | PermissionResolvable[],
    allowAdmin: boolean = true,
    entityType?: number
  ): boolean {
    // 1. Administrator 오버라이드 체크 (최우선)
    if (allowAdmin && this.has(PERMISSIONS.IS_APP_MANAGER, false)) {
      return true;
    }

    const resolved = Array.isArray(permission)
      ? permission.map(p => this.resolvePermission(p))
      : [this.resolvePermission(permission)];

    // 2. OWNER 권한 체크 (해당 엔티티 타입의 모든 권한을 암시적으로 포함)
    if (entityType !== undefined) {
      const ownerPermission =
        entityType === ENTITY_TYPES.ORGANIZATION
          ? PERMISSIONS.ORG_OWNER
          : PERMISSIONS.CENTER_OWNER;
      
      if (this.has(ownerPermission, false)) {
        // OWNER 권한이 있으면 해당 엔티티 타입의 모든 권한 허용
        const isOrgPermission = resolved.some(
          perm =>
            (perm & 0b111111n) !== 0n || // ORG 권한 범위 (0-5)
            perm === PERMISSIONS.ORG_OWNER
        );
        const isCenterPermission = resolved.some(
          perm =>
            (perm & 0b11111111110000000000n) !== 0n || // CENTER 권한 범위 (10-14)
            perm === PERMISSIONS.CENTER_OWNER
        );

        if (
          (entityType === ENTITY_TYPES.ORGANIZATION && isOrgPermission) ||
          (entityType === ENTITY_TYPES.CENTER && isCenterPermission)
        ) {
          return true;
        }
      }
    }

    // 3. 기본 권한 체크 (Implicit Permission 체크 포함)
    return resolved.every(perm => {
      // 명시적으로 권한이 있는지 체크
      if ((this.bitfield & perm) !== 0n) {
        return true;
      }

      // Implicit Permission 체크
      // 예: ORG_VIEW가 없으면 다른 조직 권한도 사용 불가
      if (entityType === ENTITY_TYPES.ORGANIZATION) {
        const isOrgPermission =
          (perm & 0b111111n) !== 0n || perm === PERMISSIONS.ORG_OWNER;
        if (isOrgPermission && !this.has(PERMISSIONS.ORG_VIEW, false)) {
          return false; // ORG_VIEW가 없으면 다른 조직 권한도 사용 불가
        }
      } else if (entityType === ENTITY_TYPES.CENTER) {
        const isCenterPermission =
          (perm & 0b11111111110000000000n) !== 0n ||
          perm === PERMISSIONS.CENTER_OWNER;
        if (isCenterPermission && !this.has(PERMISSIONS.CENTER_VIEW, false)) {
          return false; // CENTER_VIEW가 없으면 다른 센터 권한도 사용 불가
        }
      }

      return false;
    });
  }

  /**
   * 여러 권한 중 하나라도 있는지 체크 (OR 연산)
   * @param permissions - 체크할 권한 배열
   * @param allowAdmin - IS_APP_MANAGER 권한 오버라이드 허용
   * @param entityType - 엔티티 타입 (OWNER 권한 체크에 필요)
   */
  hasAny(
    permissions: PermissionResolvable[],
    allowAdmin: boolean = true,
    entityType?: number
  ): boolean {
    return permissions.some(perm => this.has(perm, allowAdmin, entityType));
  }

  /**
   * 누락된 권한을 반환 (Missing Permissions 에러 처리용)
   * @param requiredPermissions - 필요한 권한 배열
   * @param entityType - 엔티티 타입
   * @returns 누락된 권한 플래그 배열
   */
  missing(requiredPermissions: PermissionResolvable[], entityType?: number): PermissionFlag[] {
    const missing: PermissionFlag[] = [];
    for (const perm of requiredPermissions) {
      const resolved = this.resolvePermission(perm);
      if (!this.has(resolved, false, entityType)) {
        // 플래그 이름 찾기
        for (const [key, value] of Object.entries(PERMISSIONS)) {
          if (value === resolved) {
            missing.push(key as PermissionFlag);
            break;
          }
        }
      }
    }
    return missing;
  }

  /**
   * 누락된 권한이 있는지 체크
   */
  hasMissing(
    requiredPermissions: PermissionResolvable[],
    entityType?: number
  ): boolean {
    return this.missing(requiredPermissions, entityType).length > 0;
  }

  /**
   * 권한 추가 (불변성 유지)
   * OWNER 권한 추가 시 하위 권한도 자동 추가 (Implicit Permissions)
   */
  add(...permissions: PermissionResolvable[]): PermissionsBitField {
    let newBitfield = this.bitfield;

    for (const perm of permissions) {
      const resolved = this.resolvePermission(perm);
      newBitfield |= resolved;

      // OWNER 권한 추가 시 하위 권한도 자동 추가 (Implicit Permissions)
      if (resolved === PERMISSIONS.ORG_OWNER) {
        // 조직 OWNER는 모든 조직 권한 포함
        newBitfield |=
          PERMISSIONS.ORG_VIEW |
          PERMISSIONS.ORG_EDIT_SETTINGS |
          PERMISSIONS.ORG_MANAGE_MEMBERS |
          PERMISSIONS.ORG_VIEW_PROJECTS |
          PERMISSIONS.ORG_EDIT_PROJECTS;
      } else if (resolved === PERMISSIONS.CENTER_OWNER) {
        // 센터 OWNER는 모든 센터 권한 포함
        newBitfield |=
          PERMISSIONS.CENTER_VIEW |
          PERMISSIONS.CENTER_EDIT_SETTINGS |
          PERMISSIONS.CENTER_MANAGE_ORGS;
      }
    }

    return new PermissionsBitField(newBitfield);
  }

  /**
   * 권한 제거 (불변성 유지)
   */
  remove(...permissions: PermissionResolvable[]): PermissionsBitField {
    let newBitfield = this.bitfield;

    for (const perm of permissions) {
      const resolved = this.resolvePermission(perm);
      newBitfield &= ~resolved;
    }

    return new PermissionsBitField(newBitfield);
  }

  /**
   * OWNER 권한 제거 (하위 권한도 함께 제거)
   */
  removeOwner(entityType: 1 | 2): PermissionsBitField {
    if (entityType === ENTITY_TYPES.ORGANIZATION) {
      return this.remove(
        PERMISSIONS.ORG_OWNER,
        PERMISSIONS.ORG_VIEW,
        PERMISSIONS.ORG_EDIT_SETTINGS,
        PERMISSIONS.ORG_MANAGE_MEMBERS,
        PERMISSIONS.ORG_VIEW_PROJECTS,
        PERMISSIONS.ORG_EDIT_PROJECTS
      );
    } else {
      return this.remove(
        PERMISSIONS.CENTER_OWNER,
        PERMISSIONS.CENTER_VIEW,
        PERMISSIONS.CENTER_EDIT_SETTINGS,
        PERMISSIONS.CENTER_MANAGE_ORGS
      );
    }
  }

  /**
   * 권한 플래그 배열로 변환 (디버깅용)
   */
  toArray(): PermissionFlag[] {
    const flags: PermissionFlag[] = [];
    for (const [key, value] of Object.entries(PERMISSIONS)) {
      if ((this.bitfield & value) !== 0n) {
        flags.push(key as PermissionFlag);
      }
    }
    return flags;
  }

  /**
   * 권한을 객체로 직렬화 (디버깅용)
   */
  serialize(): Record<PermissionFlag, boolean> {
    const result = {} as Record<PermissionFlag, boolean>;
    for (const key of Object.keys(PERMISSIONS) as PermissionFlag[]) {
      result[key] = this.has(PERMISSIONS[key], false);
    }
    return result;
  }

  /**
   * BigInt 값 반환 (DB 저장용)
   */
  valueOf(): bigint {
    return this.bitfield;
  }

  /**
   * 문자열로 변환 (디버깅용)
   */
  toString(): string {
    return this.bitfield.toString();
  }

  /**
   * JSON 직렬화 지원
   */
  toJSON(): string {
    return this.bitfield.toString();
  }
}

// ============================================
// 역할별 권한 프리셋
// ============================================

/**
 * 역할별 권한 프리셋
 * 자주 사용되는 권한 조합을 미리 정의
 */
export const ROLES = {
  // 조직 역할 (Type 1)
  ORG_MEMBER: new PermissionsBitField([
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ORG_VIEW_PROJECTS,
  ]),
  ORG_MANAGER: new PermissionsBitField([
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ORG_VIEW_PROJECTS,
    PERMISSIONS.ORG_EDIT_SETTINGS,
    PERMISSIONS.ORG_MANAGE_MEMBERS,
    PERMISSIONS.ORG_EDIT_PROJECTS,
  ]),
  ORG_OWNER: new PermissionsBitField([
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ORG_VIEW_PROJECTS,
    PERMISSIONS.ORG_EDIT_SETTINGS,
    PERMISSIONS.ORG_MANAGE_MEMBERS,
    PERMISSIONS.ORG_EDIT_PROJECTS,
    PERMISSIONS.ORG_OWNER,
  ]),

  // 센터 역할 (Type 2)
  CENTER_STAFF: new PermissionsBitField([PERMISSIONS.CENTER_VIEW]),
  CENTER_MANAGER: new PermissionsBitField([
    PERMISSIONS.CENTER_VIEW,
    PERMISSIONS.CENTER_EDIT_SETTINGS,
    PERMISSIONS.CENTER_MANAGE_ORGS,
  ]),
  CENTER_OWNER: new PermissionsBitField([
    PERMISSIONS.CENTER_VIEW,
    PERMISSIONS.CENTER_EDIT_SETTINGS,
    PERMISSIONS.CENTER_MANAGE_ORGS,
    PERMISSIONS.CENTER_OWNER,
  ]),
  CENTER_LAW_AGENCY: new PermissionsBitField([
    PERMISSIONS.CENTER_VIEW,
    PERMISSIONS.CENTER_MANAGE_ORGS,
    PERMISSIONS.CENTER_IS_LAW_AGENCY,
  ]),

  // 앱 매니저
  APP_MANAGER: new PermissionsBitField([PERMISSIONS.IS_APP_MANAGER]),
} as const;

// ============================================
// 에러 클래스
// ============================================

/**
 * 권한 부족 에러
 */
export class MissingPermissionError extends Error {
  constructor(
    public readonly missingPermissions: PermissionFlag[],
    public readonly entityType?: number
  ) {
    const entityTypeStr = entityType
      ? entityType === ENTITY_TYPES.ORGANIZATION
        ? 'ORGANIZATION'
        : 'CENTER'
      : '';
    
    super(
      `Missing permissions: ${missingPermissions.join(', ')}${
        entityTypeStr ? ` (Entity Type: ${entityTypeStr})` : ''
      }`
    );
    this.name = 'MissingPermissionError';
  }
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 권한 검증 및 에러 처리 헬퍼
 * 
 * @param permissions - 사용자 권한
 * @param requiredPermission - 필요한 권한 (단일 또는 배열)
 * @param entityType - 엔티티 타입 (OWNER 권한 체크에 필요)
 * @param allowAdmin - IS_APP_MANAGER 권한 오버라이드 허용
 * @throws {MissingPermissionError} 권한이 없을 경우
 */
export function requirePermission(
  permissions: PermissionsBitField | bigint | number,
  requiredPermission: PermissionResolvable | PermissionResolvable[],
  entityType?: number,
  allowAdmin: boolean = true
): void {
  const permBitField =
    permissions instanceof PermissionsBitField
      ? permissions
      : new PermissionsBitField(permissions);

  const required = Array.isArray(requiredPermission)
    ? requiredPermission
    : [requiredPermission];

  if (permBitField.hasMissing(required, entityType)) {
    const missing = permBitField.missing(required, entityType);
    throw new MissingPermissionError(missing, entityType);
  }
}

/**
 * 간단한 권한 체크 헬퍼 (에러 없이 boolean 반환)
 * 
 * @deprecated PermissionsBitField.has() 사용 권장
 */
export function hasPermission(
  userPermissions: bigint,
  requiredPermission: bigint
): boolean {
  return (userPermissions & requiredPermission) !== 0n;
}

/**
 * 여러 권한 중 하나라도 있는지 체크
 * 
 * @deprecated PermissionsBitField.hasAny() 사용 권장
 */
export function hasAnyPermission(
  userPermissions: bigint,
  requiredPermissions: bigint[]
): boolean {
  return requiredPermissions.some(perm => (userPermissions & perm) !== 0n);
}

/**
 * 모든 권한이 있는지 체크
 * 
 * @deprecated PermissionsBitField.has() 사용 권장
 */
export function hasAllPermissions(
  userPermissions: bigint,
  requiredPermissions: bigint[]
): boolean {
  return requiredPermissions.every(perm => (userPermissions & perm) !== 0n);
}

/**
 * 권한 추가
 * 
 * @deprecated PermissionsBitField.add() 사용 권장
 */
export function addPermission(
  userPermissions: bigint,
  permission: bigint
): bigint {
  return userPermissions | permission;
}

/**
 * 권한 제거
 * 
 * @deprecated PermissionsBitField.remove() 사용 권장
 */
export function removePermission(
  userPermissions: bigint,
  permission: bigint
): bigint {
  return userPermissions & ~permission;
}

