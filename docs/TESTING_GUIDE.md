# 권한 시스템 및 RLS 테스트 가이드

**작성일**: 2025-11-17  
**관련 문서**:
- `docs/rules/251117_permission_system_improvement.md`
- `docs/rules/251117_schema_migration_strategy.md`

## 테스트 방법

### 1. SQL Editor에서 직접 테스트

**Supabase 대시보드 → SQL Editor**

#### 1.1. 기본 테스트 스크립트 실행

```sql
-- supabase/test_rls_and_permissions.sql 파일 내용 실행
```

이 스크립트는 다음을 테스트합니다:
- ✅ RLS 정책이 올바르게 작동하는지
- ✅ 권한 비트 연산이 정확한지
- ✅ OWNER 권한이 암시적 권한을 포함하는지
- ✅ 관리자 권한으로 다른 멤버십 조회 가능한지

#### 1.2. 수동 테스트 쿼리

**현재 사용자 확인:**
```sql
SELECT auth.uid() as current_user_id;
```

**내 멤버십 확인:**
```sql
SELECT * FROM memberships WHERE user_id = auth.uid();
```

**권한 상세 확인:**
```sql
SELECT 
  entity_type,
  permissions,
  (permissions & 32) <> 0 as has_org_owner,
  (permissions & 16384) <> 0 as has_center_owner
FROM memberships
WHERE user_id = auth.uid();
```

### 2. 애플리케이션 코드에서 테스트

#### 2.1. 클라이언트 컴포넌트에서 테스트 (Tier 1)

**파일**: `src/app/(protected)/test-permissions/page.tsx` (생성 필요)

```typescript
'use client';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function TestPermissionsPage() {
  const [memberships, setMemberships] = useState<any[]>([]);
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    async function fetchMemberships() {
      // RLS 정책에 의해 자동으로 필터링됨
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          *,
          organizations:organizations!memberships_entity_id_fkey(name),
          centers:centers!memberships_entity_id_fkey(name)
        `);

      if (error) {
        console.error('Error:', error);
        return;
      }

      setMemberships(data || []);
    }

    fetchMemberships();
  }, []);

  return (
    <div>
      <h1>My Memberships</h1>
      <pre>{JSON.stringify(memberships, null, 2)}</pre>
    </div>
  );
}
```

#### 2.2. 서버 컴포넌트에서 테스트

**파일**: `src/app/(protected)/test-permissions-server/page.tsx`

```typescript
import { createPublicServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function TestPermissionsServerPage() {
  const supabase = await createPublicServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // RLS 정책에 의해 자동으로 필터링됨
  const { data: memberships, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>My Memberships (Server Component)</h1>
      <pre>{JSON.stringify(memberships, null, 2)}</pre>
    </div>
  );
}
```

### 3. 권한 시스템 라이브러리 테스트

**권한 시스템 구현 후 테스트:**

```typescript
// lib/permissions.ts 구현 후
import { PermissionsBitField, PERMISSIONS } from '@/lib/permissions';

// 테스트
const userPermissions = new PermissionsBitField(31); // 모든 조직 권한
console.log(userPermissions.has(PERMISSIONS.ORG_VIEW)); // true
console.log(userPermissions.has(PERMISSIONS.ORG_OWNER)); // false (아직 명시적 OWNER 없음)

// OWNER 추가
const withOwner = userPermissions.add(PERMISSIONS.ORG_OWNER);
console.log(withOwner.has(PERMISSIONS.ORG_VIEW, false, 1)); // true (OWNER는 암시적 권한 포함)
```

### 4. RLS 정책 수동 테스트

#### 4.1. 다른 사용자로 로그인하여 테스트

1. 테스트 계정 2개 생성
2. 각 계정에 다른 멤버십 부여
3. 계정 A로 로그인 → 계정 B의 멤버십은 보이지 않아야 함
4. 계정 A가 관리자인 경우 → 같은 조직의 계정 B 멤버십은 보여야 함

#### 4.2. 권한 없는 작업 시도

```sql
-- 다른 사용자의 멤버십 업데이트 시도 (실패해야 함)
UPDATE memberships
SET permissions = 0
WHERE user_id != auth.uid()
LIMIT 1;
-- 예상: RLS 정책에 의해 차단됨
```

### 5. 통합 테스트 시나리오

#### 시나리오 1: 조직 멤버 → 관리자 승격

1. 멤버십 생성 (permissions = 1) - ORG_VIEW만
2. 관리자 권한 추가 (permissions = 1 | 4) - ORG_MANAGE_MEMBERS 추가
3. 다른 멤버십 조회 가능한지 확인

#### 시나리오 2: OWNER 권한 테스트

1. 모든 권한 부여 (permissions = 31)
2. 마이그레이션 실행 → ORG_OWNER(32) 자동 추가
3. OWNER 권한으로 모든 작업 가능한지 확인

#### 시나리오 3: 센터 → 조직 관계

1. 센터 멤버십 생성 (CENTER_MANAGE_ORGS 권한)
2. 센터-조직 관계 생성
3. 센터 관리자가 조직의 멤버십 조회 가능한지 확인

## 테스트 체크리스트

### RLS 정책 테스트
- [ ] 자신의 멤버십만 조회 가능
- [ ] 자신이 멤버인 조직/센터만 조회 가능
- [ ] 관리자는 같은 엔티티의 다른 멤버십 조회 가능
- [ ] 권한 없는 사용자는 업데이트 불가
- [ ] OWNER 권한이 있으면 모든 권한 사용 가능

### 권한 비트 연산 테스트
- [ ] 권한 상수 값이 올바름
- [ ] 비트 연산이 정확함
- [ ] OWNER 권한이 하위 권한 포함
- [ ] 여러 권한 조합이 올바르게 작동

### 마이그레이션 테스트
- [ ] 기존 OWNER 권한이 명시적으로 설정됨
- [ ] 마이그레이션 재실행 시 안전함 (멱등성)
- [ ] 데이터 손실 없음

## 문제 해결

### RLS 정책이 작동하지 않는 경우

1. RLS가 활성화되어 있는지 확인:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('organizations', 'centers', 'memberships');
```

2. 정책이 생성되어 있는지 확인:
```sql
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('organizations', 'centers', 'memberships');
```

3. 현재 사용자 확인:
```sql
SELECT auth.uid(), auth.email();
```

### 권한이 올바르게 체크되지 않는 경우

1. 권한 값 확인:
```sql
SELECT permissions, 
       (permissions & 32) <> 0 as has_org_owner,
       (permissions & 16384) <> 0 as has_center_owner
FROM memberships
WHERE user_id = auth.uid();
```

2. 비트 연산 확인:
```sql
-- ORG_MANAGE_MEMBERS (4) 체크
SELECT permissions, (permissions & 4) <> 0 as has_manage_members
FROM memberships
WHERE entity_type = 1;
```

## 다음 단계

1. ✅ 마이그레이션 완료
2. ✅ 테스트 데이터 생성
3. ✅ RLS 및 권한 테스트
4. ⏭️ 권한 시스템 라이브러리 구현 (`lib/permissions.ts`)
5. ⏭️ 애플리케이션 코드에서 권한 시스템 사용

