# 권한 시스템 개선안 (Discord.js 스타일)

**작성일**: 2025-11-17  
**기준 문서**: 
- `docs/rules/5.1.md`
- `docs/todo-hypothesis/251117_todo01_database_schema.md`
- Discord.js Permissions Guide: https://discordjs.guide/legacy/popular-topics/permissions

## 현재 상태 분석

### 현재 시스템의 문제점

1. **단순한 BigInt 비트 연산만 사용**
   - 권한 체크가 코드 곳곳에 흩어져 있음
   - `(permissions & PERMISSIONS.ORG_MANAGE_MEMBERS) !== 0n` 같은 반복적인 패턴
   - 실수하기 쉬운 비트 연산 로직

2. **유틸리티 함수 부재**
   - 권한 체크, 추가, 제거가 일관되지 않음
   - 디버깅이 어려움 (BigInt를 사람이 읽기 어려움)

3. **권한 조작의 복잡성**
   - 권한 추가/제거가 복잡하고 오류 발생 가능성 높음
   - 여러 권한을 한 번에 체크하는 로직이 반복됨

4. **디버깅 어려움**
   - BigInt 값을 사람이 읽기 어려움
   - 어떤 권한이 설정되어 있는지 확인하기 어려움

5. **RLS 정책에서의 하드코딩**
   - RLS 정책에서 `(m.permissions & 4) <> 0` 같은 매직 넘버 사용
   - 권한 상수와 RLS 정책 간 불일치 가능성

## Discord.js 권한 시스템의 강점

### 1. PermissionsBitField 클래스
- 권한을 객체로 관리하여 타입 안전성과 유틸리티 메서드 제공
- `.has()`, `.add()`, `.remove()`, `.toArray()`, `.serialize()` 등 풍부한 API

### 2. 명확한 플래그 정의
- `PermissionsBitField.Flags.ViewChannel` 같은 명확한 네이밍
- 자동완성과 타입 체크 지원

### 3. Administrator 오버라이드
- `.has(permission, allowAdmin)` 옵션으로 관리자 권한 오버라이드 제어

### 4. 권한 조작의 편의성
- `.add()`, `.remove()` 메서드로 직관적인 권한 조작
- 여러 권한을 한 번에 처리 가능

### 5. 디버깅 지원
- `.toArray()`: 권한 플래그 배열로 변환
- `.serialize()`: 권한을 객체로 변환하여 읽기 쉬움

### 6. Implicit Permissions (암시적 권한) - 확장 문서에서 발견
- 일부 권한이 다른 권한을 암시적으로 포함 (예: ViewChannel이 없으면 다른 권한도 사용 불가)
- OWNER 권한이 있으면 해당 엔티티의 모든 권한을 암시적으로 포함

### 7. 권한 계층 구조
- OWNER > MANAGER > MEMBER 같은 명확한 계층
- OWNER 권한이 있으면 하위 권한들을 자동으로 포함

### 8. Missing Permissions 에러 처리
- 권한이 없을 때 명확한 에러 메시지 제공
- 어떤 권한이 필요한지 알려주는 기능

## 개선안: PermissionsBitField 클래스 구현

### 목표

Discord.js의 `PermissionsBitField` 클래스를 참고하여, 현재 프로젝트에 맞는 권한 시스템을 구축합니다.

### 핵심 설계 원칙

1. **타입 안전성**: TypeScript로 완전한 타입 체크
2. **불변성**: 권한 조작 시 새 인스턴스 반환 (함수형 프로그래밍)
3. **디버깅 친화적**: `.toArray()`, `.serialize()` 메서드 제공
4. **RLS 호환성**: SQL에서도 사용 가능한 상수 제공
5. **암시적 권한**: OWNER 권한이 있으면 해당 엔티티의 모든 권한을 암시적으로 포함
6. **권한 계층 구조**: OWNER > MANAGER > MEMBER 계층을 명확히 구분
7. **에러 처리**: Missing Permissions 에러 시 명확한 메시지 제공

## 구현 계획

### 1. PermissionsBitField 클래스 생성

**파일**: `lib/permissions.ts`

```typescript
/**
 * Discord.js 스타일의 권한 비트필드 클래스
 * BigInt 기반 비트 연산을 객체 지향적으로 래핑
 */
export class PermissionsBitField {
  private readonly bitfield: bigint;

  constructor(permissions: bigint | number | string | PermissionResolvable = 0n) {
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
        entityType === 1 ? PERMISSIONS.ORG_OWNER : PERMISSIONS.CENTER_OWNER;
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
          (entityType === 1 && isOrgPermission) ||
          (entityType === 2 && isCenterPermission)
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
      if (entityType === 1) {
        const isOrgPermission =
          (perm & 0b111111n) !== 0n || perm === PERMISSIONS.ORG_OWNER;
        if (isOrgPermission && !this.has(PERMISSIONS.ORG_VIEW, false)) {
          return false; // ORG_VIEW가 없으면 다른 조직 권한도 사용 불가
        }
      } else if (entityType === 2) {
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
   * @param permissions - 추가할 권한들
   * @param entityType - 엔티티 타입 (OWNER 권한 추가 시 하위 권한도 자동 추가)
   */
  add(
    ...permissions: PermissionResolvable[]
  ): PermissionsBitField {
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
   * @param permissions - 제거할 권한들
   * @param entityType - 엔티티 타입 (OWNER 권한 제거 시 하위 권한도 제거할지 결정)
   */
  remove(
    ...permissions: PermissionResolvable[]
  ): PermissionsBitField {
    let newBitfield = this.bitfield;

    for (const perm of permissions) {
      const resolved = this.resolvePermission(perm);
      newBitfield &= ~resolved;

      // OWNER 권한 제거 시 하위 권한도 제거 (선택적)
      // 주의: 이는 명시적으로 OWNER만 제거하고 싶을 때는 사용하지 않음
      // 필요시 별도 메서드로 분리 가능
    }

    return new PermissionsBitField(newBitfield);
  }

  /**
   * OWNER 권한 제거 (하위 권한도 함께 제거)
   */
  removeOwner(entityType: 1 | 2): PermissionsBitField {
    if (entityType === 1) {
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

// 타입 정의
export type PermissionResolvable =
  | bigint
  | number
  | string
  | PermissionsBitField
  | PermissionResolvable[];

export type PermissionFlag = keyof typeof PERMISSIONS;
```

### 2. 권한 상수 정의 개선

**파일**: `lib/permissions.ts` (동일 파일)

```typescript
/**
 * 권한 플래그 정의
 * 각 권한은 고유한 비트 위치를 가짐
 */
export const PERMISSIONS = {
  // --- 조직(Organization) 권한 (Type: 1) ---
  ORG_VIEW: 1n << 0n,
  ORG_EDIT_SETTINGS: 1n << 1n,
  ORG_MANAGE_MEMBERS: 1n << 2n,
  ORG_VIEW_PROJECTS: 1n << 3n,
  ORG_EDIT_PROJECTS: 1n << 4n,
  ORG_OWNER: 1n << 5n, // 명시적 OWNER 플래그

  // --- 센터(Center) 권한 (Type: 2) ---
  CENTER_VIEW: 1n << 10n,
  CENTER_EDIT_SETTINGS: 1n << 11n,
  CENTER_MANAGE_ORGS: 1n << 12n,
  CENTER_IS_LAW_AGENCY: 1n << 13n,
  CENTER_OWNER: 1n << 14n, // 명시적 OWNER 플래그

  // --- 앱 매니저 ---
  IS_APP_MANAGER: 1n << 60n,
} as const;

/**
 * SQL에서 사용할 수 있는 권한 상수
 * RLS 정책에서 하드코딩 대신 이 상수 사용
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
 * 역할별 권한 프리셋
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
```

### 3. 사용 예시

#### 3.1. 권한 체크

```typescript
// 기존 방식 (복잡하고 실수하기 쉬움)
const canManageMembers = (permissions & PERMISSIONS.ORG_MANAGE_MEMBERS) !== 0n;

// 개선된 방식 (직관적이고 타입 안전)
const userPermissions = new PermissionsBitField(membership.permissions);
const canManageMembers = userPermissions.has(PERMISSIONS.ORG_MANAGE_MEMBERS, true, 1);

// 여러 권한 체크 (AND 연산 - 모든 권한이 필요)
const canManage = userPermissions.has([
  PERMISSIONS.ORG_MANAGE_MEMBERS,
  PERMISSIONS.ORG_EDIT_SETTINGS,
], true, 1);

// Administrator 오버라이드
const canView = userPermissions.has(PERMISSIONS.ORG_VIEW, true); // IS_APP_MANAGER면 자동 허용

// OWNER 권한 체크 (암시적 권한 포함)
// ORG_OWNER가 있으면 모든 조직 권한을 자동으로 포함
const isOwner = userPermissions.has(PERMISSIONS.ORG_OWNER, false, 1);
if (isOwner) {
  // OWNER는 모든 조직 권한을 암시적으로 가짐
  console.log('User has all organization permissions');
}

// Missing Permissions 체크 (에러 처리용)
const requiredPerms = [
  PERMISSIONS.ORG_MANAGE_MEMBERS,
  PERMISSIONS.ORG_EDIT_SETTINGS,
];
if (userPermissions.hasMissing(requiredPerms, 1)) {
  const missing = userPermissions.missing(requiredPerms, 1);
  throw new Error(`Missing permissions: ${missing.join(', ')}`);
}
```

#### 3.2. 권한 조작

```typescript
// 권한 추가
const newPermissions = userPermissions.add(
  PERMISSIONS.ORG_EDIT_SETTINGS,
  PERMISSIONS.ORG_MANAGE_MEMBERS
);

// OWNER 권한 추가 (하위 권한도 자동 추가됨)
const ownerPermissions = userPermissions.add(PERMISSIONS.ORG_OWNER);
// 자동으로 ORG_VIEW, ORG_EDIT_SETTINGS, ORG_MANAGE_MEMBERS 등도 추가됨

// 권한 제거
const updatedPermissions = userPermissions.remove(PERMISSIONS.ORG_EDIT_SETTINGS);

// OWNER 권한 제거 (하위 권한도 함께 제거)
const withoutOwner = userPermissions.removeOwner(1); // 1 = ORGANIZATION

// DB 저장
await supabase
  .from('memberships')
  .update({ permissions: newPermissions.valueOf() })
  .eq('id', membershipId);
```

#### 3.3. 디버깅

```typescript
const userPermissions = new PermissionsBitField(membership.permissions);

// 권한 플래그 배열로 변환
console.log(userPermissions.toArray());
// ['ORG_VIEW', 'ORG_VIEW_PROJECTS', 'ORG_MANAGE_MEMBERS']

// 권한을 객체로 직렬화
console.log(userPermissions.serialize());
// {
//   ORG_VIEW: true,
//   ORG_EDIT_SETTINGS: false,
//   ORG_MANAGE_MEMBERS: true,
//   ...
// }
```

#### 3.4. RLS 정책에서 사용

```sql
-- 기존 방식 (하드코딩)
CREATE POLICY "Users can manage members" ON memberships
FOR SELECT USING (
  (permissions & 4) <> 0  -- 매직 넘버!
);

-- 개선된 방식 (상수 사용)
CREATE POLICY "Users can manage members" ON memberships
FOR SELECT USING (
  (permissions & 4) <> 0  -- PERMISSIONS_SQL.ORG_MANAGE_MEMBERS = 4
);

-- 주석으로 명확성 확보
CREATE POLICY "Users can manage members" ON memberships
FOR SELECT USING (
  -- PERMISSIONS_SQL.ORG_MANAGE_MEMBERS = 4
  (permissions & 4) <> 0
);
```

### 4. tRPC에서 사용

```typescript
// lib/trpc/routers/membership.ts
import { PermissionsBitField, PERMISSIONS } from '@/lib/permissions';

updateUserPermissions: protectedProcedure
  .input(
    z.object({
      membershipId: z.string().uuid(),
      permissions: z.array(z.string()), // ['ORG_VIEW', 'ORG_MANAGE_MEMBERS']
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 현재 멤버십 조회
    const { data: membership } = await ctx.supabase
      .from('memberships')
      .select('*')
      .eq('id', input.membershipId)
      .single();

    if (!membership) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    // 권한 검증: 현재 사용자가 이 엔티티를 관리할 권한이 있는지
    const currentUserMembership = await getCurrentUserMembership(
      ctx.supabase,
      membership.entity_id,
      membership.entity_type
    );

    const currentPermissions = new PermissionsBitField(
      currentUserMembership.permissions
    );

    const requiredPermission =
      membership.entity_type === 1
        ? PERMISSIONS.ORG_MANAGE_MEMBERS
        : PERMISSIONS.CENTER_MANAGE_ORGS;

    if (!currentPermissions.has(requiredPermission)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    // 새 권한 생성
    const newPermissions = new PermissionsBitField(
      input.permissions.map(p => PERMISSIONS[p as keyof typeof PERMISSIONS])
    );

    // 권한 업데이트
    await ctx.supabase
      .from('memberships')
      .update({ permissions: newPermissions.valueOf() })
      .eq('id', input.membershipId);

    return { success: true };
  });
```

### 5. 유틸리티 함수 추가

```typescript
/**
 * 멤버십에서 권한 체크 헬퍼 함수
 */
export async function checkMembershipPermission(
  supabase: SupabaseClient,
  userId: string,
  entityId: string,
  entityType: number,
  requiredPermission: bigint
): Promise<boolean> {
  const { data: membership } = await supabase
    .from('memberships')
    .select('permissions')
    .eq('user_id', userId)
    .eq('entity_id', entityId)
    .eq('entity_type', entityType)
    .single();

  if (!membership) return false;

  const permissions = new PermissionsBitField(membership.permissions);
  return permissions.has(requiredPermission);
}

/**
 * 사용자의 모든 멤버십 권한 조회
 */
export async function getUserMemberships(
  supabase: SupabaseClient,
  userId: string
): Promise<Array<{ entityId: string; entityType: number; permissions: PermissionsBitField }>> {
  const { data: memberships } = await supabase
    .from('memberships')
    .select('entity_id, entity_type, permissions')
    .eq('user_id', userId);

  return (memberships || []).map(m => ({
    entityId: m.entity_id,
    entityType: m.entity_type,
    permissions: new PermissionsBitField(m.permissions),
  }));
}
```

## 마이그레이션 계획

### 1단계: 클래스 구현
- [ ] `lib/permissions.ts` 파일 생성
- [ ] `PermissionsBitField` 클래스 구현
- [ ] 권한 상수 및 ROLES 정의
- [ ] 유닛 테스트 작성

### 2단계: 기존 코드 마이그레이션
- [ ] tRPC 라우터에서 권한 체크 로직 마이그레이션
- [ ] 컴포넌트에서 권한 체크 로직 마이그레이션
- [ ] RLS 정책 주석 추가 (PERMISSIONS_SQL 상수 참조)

### 3단계: 문서화 및 가이드
- [ ] 권한 시스템 사용 가이드 작성
- [ ] 예시 코드 추가
- [ ] 디버깅 가이드 작성

## 예상 효과

1. **코드 가독성 향상**: `permissions.has(ORG_MANAGE_MEMBERS)` vs `(permissions & 4n) !== 0n`
2. **타입 안전성**: TypeScript로 권한 플래그 자동완성 및 타입 체크
3. **디버깅 용이성**: `.toArray()`, `.serialize()` 메서드로 권한 상태 확인
4. **유지보수성**: 권한 로직이 한 곳에 집중되어 수정이 용이
5. **일관성**: 모든 권한 체크가 동일한 패턴 사용

## 참고사항

- BigInt는 PostgreSQL의 `bigint` 타입과 호환됨
- RLS 정책에서는 여전히 비트 연산을 사용해야 하므로 `PERMISSIONS_SQL` 상수 제공
- 불변성 원칙으로 인해 `.add()`, `.remove()`는 새 인스턴스 반환
- Administrator 오버라이드는 선택적으로 사용 가능 (`allowAdmin` 파라미터)

## Discord.js 확장 문서에서 추가된 개념

### 1. Implicit Permissions (암시적 권한)

Discord.js의 확장 문서에서 중요한 개념은 **암시적 권한**입니다. 예를 들어:
- `ViewChannel` 권한이 없으면 다른 채널 권한도 사용할 수 없음
- OWNER 권한이 있으면 해당 엔티티의 모든 권한을 암시적으로 포함

**현재 프로젝트 적용:**
- `ORG_VIEW` 권한이 없으면 다른 조직 권한도 사용 불가
- `CENTER_VIEW` 권한이 없으면 다른 센터 권한도 사용 불가
- `ORG_OWNER` 권한이 있으면 모든 조직 권한을 암시적으로 포함
- `CENTER_OWNER` 권한이 있으면 모든 센터 권한을 암시적으로 포함

### 2. 권한 계층 구조

**계층 구조:**
- OWNER > MANAGER > MEMBER
- OWNER 권한이 있으면 하위 권한들을 자동으로 포함

### 3. Missing Permissions 에러 처리

권한이 없을 때 명확한 에러 메시지를 제공하여 디버깅을 용이하게 합니다:

```typescript
// 누락된 권한 확인
const missing = permissions.missing([PERMISSIONS.ORG_MANAGE_MEMBERS], 1);
if (missing.length > 0) {
  throw new Error(`Missing permissions: ${missing.join(', ')}`);
}
```

### 4. 권한 체크의 제약사항

Discord.js 문서에서 언급한 제약사항들을 참고:

- **권한 부여 제약**: 권한을 부여하려면 자신도 그 권한이 있어야 함
- **OWNER 우선순위**: OWNER 권한이 있으면 다른 권한 체크를 우회
- **엔티티 타입별 권한**: 조직 권한과 센터 권한은 분리되어 있음

### 5. 권한 조작 시 주의사항

- OWNER 권한 추가 시 하위 권한도 자동 추가 (`.add()` 메서드)
- OWNER 권한 제거 시 하위 권한도 함께 제거하려면 `.removeOwner()` 사용
- 일반 `.remove()`는 명시적으로 지정한 권한만 제거

## 추가 개선 사항

### 에러 클래스 추가

```typescript
/**
 * 권한 부족 에러
 */
export class MissingPermissionError extends Error {
  constructor(
    public readonly missingPermissions: PermissionFlag[],
    public readonly entityType?: number
  ) {
    super(
      `Missing permissions: ${missingPermissions.join(', ')}${
        entityType ? ` (Entity Type: ${entityType})` : ''
      }`
    );
    this.name = 'MissingPermissionError';
  }
}

// 사용 예시
if (userPermissions.hasMissing(requiredPerms, 1)) {
  const missing = userPermissions.missing(requiredPerms, 1);
  throw new MissingPermissionError(missing, 1);
}
```

### 권한 검증 헬퍼 함수

```typescript
/**
 * 권한 검증 및 에러 처리 헬퍼
 */
export function requirePermission(
  permissions: PermissionsBitField,
  requiredPermission: PermissionResolvable | PermissionResolvable[],
  entityType?: number,
  allowAdmin: boolean = true
): void {
  const required = Array.isArray(requiredPermission)
    ? requiredPermission
    : [requiredPermission];

  if (permissions.hasMissing(required, entityType)) {
    const missing = permissions.missing(required, entityType);
    throw new MissingPermissionError(missing, entityType);
  }
}

// 사용 예시
requirePermission(userPermissions, PERMISSIONS.ORG_MANAGE_MEMBERS, 1);
```

