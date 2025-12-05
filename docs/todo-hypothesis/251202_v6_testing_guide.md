# v6.0 Context-Driven Architecture 테스트 가이드

**작성일**: 2025-01-30

## 빠른 시작

### 1. Database Hook 설정 (필수)

**Supabase Dashboard에서 설정:**

1. Supabase Dashboard 접속
2. Authentication > Hooks 메뉴로 이동
3. "Add Hook" 클릭
4. Hook 설정:
   - **Hook Type**: Access Token Hook
   - **Hook Function**: `custom_access_token_hook`
   - **Schema**: `public`
5. 저장

**또는 SQL로 직접 실행:**

```sql
-- 마이그레이션 파일 실행
-- supabase/migrations/06_add_custom_access_token_hook_v6.sql
```

### 2. 테스트 데이터 준비

**시드 데이터 스크립트 사용:**

```bash
# 기존 시드 데이터 스크립트 실행
psql -h <host> -U <user> -d <database> -f supabase/seed_dev_data.sql
```

**또는 수동으로 생성:**

```sql
-- 1. 테스트 사용자 생성 (Supabase Auth에서)
-- 2. 조직 생성
INSERT INTO organizations (id, name) VALUES 
  ('org-test-1', '테스트 조직 1');

-- 3. 멤버십 생성 (OWNER 권한)
INSERT INTO memberships (user_id, entity_id, entity_type, permissions) VALUES
  ('<user-id>', 'org-test-1', 1, 31); -- 31 = ORG_OWNER (0x1f)

-- 4. 구독 상태 생성 (ACTIVE)
INSERT INTO entity_subscriptions (entity_id, entity_type, status, plan_id) VALUES
  ('org-test-1', 1, 1, '<plan-id>');
```

### 3. 개발 서버 실행

```bash
pnpm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

## 테스트 시나리오

### 시나리오 1: 기본 동작 확인

**1.1. 로그인**
- 브라우저에서 `http://localhost:3000/login` 접근
- 테스트 사용자로 로그인
- `/dashboard`로 리디렉션되는지 확인

**1.2. JWT 확인**

⚠️ **중요**: v6.0 아키텍처에서는 **Tier 1과 Tier 2 모두 쿠키 기반 인증**을 사용합니다.

**인증 토큰 저장소 정책 (v6.0 확정):**
- **Tier 1 (일반 사용자)**: 쿠키 기반 (`@supabase/ssr`의 `createBrowserClient` 사용)
- **Tier 2 (SaaS Manager)**: 쿠키 기반 (서버 컴포넌트에서 `createServerSupabaseClient` 사용)

**이유:**
- Next.js App Router의 Middleware 보호를 위해 쿠키 필요
- Server Context (getOrgContext 등)가 작동하려면 요청 헤더(Cookie)에 토큰 필요
- Tier 1은 "데이터 접근 패턴(RLS Direct Access)"을 의미하며, 인증 스토리지 위치와는 무관

**참고**: Tier 1의 원래 의도(Local Storage)는 Legacy 문서의 오류였으며, v6.0에서는 쿠키 기반으로 통일되었습니다.

**방법 1: 브라우저 콘솔에서 확인 (권장) - Tier 1**
1. 브라우저 개발자 도구 > Console 탭 열기
2. 다음 코드 실행:
```javascript
// Tier 1: 클라이언트 사이드 확인 (쿠키 기반)
// @supabase/ssr의 createBrowserClient 사용
const { createBrowserClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/ssr@latest/+esm');
const supabase = createBrowserClient(
  'YOUR_SUPABASE_URL',  // 실제 URL로 변경
  'YOUR_PUBLISHABLE_KEY'  // 실제 키로 변경
);

// 사용자 정보 가져오기
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
console.log('Memberships:', user?.app_metadata?.memberships);
```

**또는 간단하게:**
```javascript
// 브라우저 콘솔에서 직접 실행
// 쿠키에서 JWT를 읽어와서 사용자 정보 확인
const supabase = window.supabase || (await import('@/lib/supabase/client')).createBrowserSupabaseClient();
const { data: { user } } = await supabase.auth.getUser();
console.log('Memberships:', user?.app_metadata?.memberships);
```

**방법 2: 디버깅 페이지 생성 (임시) - Tier 2**
`src/app/debug/jwt/page.tsx` 파일 생성:
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DebugJWTPage() {
  // Tier 2: 서버 사이드 확인 (쿠키 기반)
  // Tier 1과 동일하게 쿠키에서 JWT를 읽어옴
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">JWT Debug Info (Server Side)</h1>
      <div className="mb-4 text-sm text-gray-600">
        ⚠️ 이 페이지는 서버 컴포넌트 방식으로 JWT를 확인합니다.
        <br />
        Tier 1과 Tier 2 모두 쿠키 기반 인증을 사용합니다.
      </div>
      <pre className="bg-gray-100 p-4 rounded overflow-auto">
        {JSON.stringify({
          userId: user.id,
          email: user.email,
          app_metadata: user.app_metadata,
          memberships: user.app_metadata?.memberships,
        }, null, 2)}
      </pre>
    </div>
  );
}
```
그 후 `http://localhost:3000/debug/jwt` 접근하여 확인

**방법 3: 쿠키에서 확인 (고급)**
⚠️ **v6.0 아키텍처: Tier 1과 Tier 2 모두 쿠키 기반 인증 사용**

1. 브라우저 개발자 도구 > Application > Cookies
2. `sb-<project-ref>-auth-token` 쿠키 확인
3. JWT 디코딩 도구 사용 (예: jwt.io)하여 `app_metadata.memberships` 확인

**참고**: 
- Tier 1과 Tier 2 모두 `@supabase/ssr`을 사용하므로 쿠키 기반
- Next.js App Router의 Middleware와 Server Component와의 호환성을 위해 쿠키 방식 사용
- Local Storage는 v6.0 아키텍처에서 사용하지 않음

**확인 사항:**
```json
{
  "app_metadata": {
    "memberships": {
      "org-test-1": [1, "1f"]  // [Status, Permissions(Hex)]
    }
  }
}
```

### 시나리오 2: Context 객체 동작 확인

**2.1. 조직 관리 페이지 접근**
- `http://localhost:3000/manage/org/org-test-1/dashboard` 접근
- 페이지가 정상 렌더링되는지 확인
- 브라우저 콘솔에서 에러 확인

**2.2. 권한 체크 확인**
- `http://localhost:3000/manage/org/org-test-1/settings` 접근 (OWNER 전용)
- 정상 접근되는지 확인
- OWNER 권한이 없는 사용자로 테스트 시 리디렉션되는지 확인

**2.3. 구독 상태 체크 확인**
- 구독 상태를 비활성으로 변경
- `http://localhost:3000/manage/org/org-test-1/dashboard` 접근
- `/manage/org/org-test-1/billing`으로 리디렉션되는지 확인

### 시나리오 3: react.cache 동작 확인

**확인 방법:**
1. Layout과 Page에 로그 추가:
```typescript
// layout.tsx
const ctx = await getOrgContext(orgId);
console.log('Layout Context:', ctx.orgId);

// page.tsx
const ctx = await getOrgContext(orgId);
console.log('Page Context:', ctx.orgId);
```

2. 브라우저 콘솔 확인:
- 두 로그가 동일한 Context 인스턴스를 참조하는지 확인
- JWT 파싱이 1회만 실행되는지 확인 (Network 탭)

## 디버깅

### 문제 1: JWT에 memberships가 없음

**원인:**
- Database Hook이 등록되지 않음
- Hook 함수에 오류가 있음

**해결:**
1. Supabase Dashboard에서 Hook 확인
2. Hook 함수 실행 로그 확인
3. 마이그레이션 파일 재실행

### 문제 2: Context 생성 실패

**원인:**
- JWT에 memberships 정보가 없음
- 잘못된 orgId/centerId

**해결:**
1. JWT 확인 (브라우저 개발자 도구)
2. memberships에 해당 엔티티 ID가 있는지 확인
3. 에러 메시지 확인

### 문제 3: 권한 체크 실패

**원인:**
- 권한 비트가 올바르게 설정되지 않음
- Hex String 파싱 오류

**해결:**
1. `PermissionsBitField.fromHex()` 동작 확인
2. 권한 비트 값 확인
3. `ctx.permissions.has()` 동작 확인

### 문제 4: 리디렉션 루프

**원인:**
- 빌링 페이지도 `(protected)` Layout 사용
- 무한 리디렉션 발생

**해결:**
1. 빌링 페이지는 `(protected)` Layout 사용하지 않도록 확인
2. `requireBilling()` 호출 위치 확인

## 테스트 체크리스트

- [ ] Database Hook 등록 완료
- [ ] 테스트 데이터 준비 완료
- [ ] 개발 서버 실행 완료
- [ ] 로그인 테스트 완료
- [ ] JWT에 memberships 정보 확인 완료
- [ ] Context 객체 생성 확인 완료
- [ ] 권한 체크 동작 확인 완료
- [ ] 구독 상태 체크 동작 확인 완료
- [ ] react.cache 동작 확인 완료
- [ ] 리디렉션 동작 확인 완료

## 다음 단계

테스트가 완료되면:
1. 발견된 문제 해결
2. 코드 개선
3. 문서 업데이트
4. 프로덕션 배포 준비

