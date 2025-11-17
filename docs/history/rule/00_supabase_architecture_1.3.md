상태

버전

최종 수정일

✅ 제정

v1.4.0

2025-11-17

1. 개요 (Overview)

이 문서는 prove-geo-web-app 프로젝트의 기술적 방향성을 결정하는 최상위 원칙을 정의합니다. 모든 코드는 이 원칙을 기반으로 작성되어야 하며, 여기에 명시된 내용과 다른 접근 방식이 필요할 경우 반드시 팀의 기술 리더와 합의를 거쳐야 합니다.

이 원칙들은 Next.js의 서버 중심 패러다임과 Supabase의 강력한 BaaS(Backend-as-a-Service) 기능을 결합하여, 안정적이고 확장 가능하며 예측 가능한 애플리케이션을 구축하는 것을 목표로 합니다.

2. 핵심 원칙 (Core Principles)

원칙 1: Supabase는 데이터베이스, Next.js는 서버 (Supabase for Database, Next.js for Server)

Supabase의 역할: 우리 아키텍처에서 Supabase는 주로 데이터 영속성 계층(Persistence Layer), 즉 데이터베이스(Postgres), 인증(Authentication), 스토리지(Storage) 서비스의 역할을 수행합니다.

Next.js의 역할: Next.js는 단순히 프론트엔드를 렌더링하는 도구를 넘어, 애플리케이션의 유일한 서버(Application Server) 역할을 담당합니다. 모든 비즈니스 로직, 유효성 검사, 외부 API 연동 등은 Next.js의 서버 환경(서버 컴포넌트, 서버 액션, API 라우트) 내에서 처리됩니다.

🚫 Supabase Edge Functions 금지: 프로젝트의 복잡성을 낮추고 코드의 응집도를 높이기 위해, 별도의 백엔드 로직을 위한 Supabase Edge Functions는 절대 사용하지 않습니다. 모든 로직은 Next.js 서버에서 처리합니다.

1.1. Supabase Storage 사용 원칙

파일 업로드: 클라이언트에서 RLS 정책으로 보호된 스토리지 버킷으로 직접 업로드하는 것을 허용합니다. (예: auth.uid() = owner_id)

파일 다운로드: 민감한 파일은 Next.js 서버 액션을 통해 다운로드 URL을 생성(createSignedUrl)하여 클라이언트에 전달합니다.

파일 삭제: Next.js 서버 액션을 통해서만 처리합니다. (삭제 권한 등에 대한 추가 검증 필요)

원칙 2: 데이터 처리는 RLS로 보호된 범위 내에서 허용 (RLS-Protected Data Handling)

**Supabase 공식 문서 인용:**
> "You can use them directly from the browser (two-tier architecture), or as a complement to your own API server (three-tier architecture)."

2.1. 데이터 조회 (Fetching)

**기본 접근 방식: 클라이언트 사이드 직접 접근 (권장)**

Supabase는 브라우저에서 직접 데이터베이스에 접근하는 것을 지원합니다. RLS가 활성화되어 있으면 클라이언트 컴포넌트에서 직접 데이터를 조회하는 것이 가장 간단하고 Supabase의 권장 방식입니다.

```typescript
// ✅ 권장: 클라이언트 컴포넌트에서 직접 접근
'use client';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function MyComponent() {
  const supabase = createBrowserSupabaseClient();
  const { data } = await supabase.from('profiles').select('*');
}
```

**서버 컴포넌트 사용 (선택적)**

다음과 같은 경우에만 서버 컴포넌트를 사용하는 것을 고려합니다:
- **SEO 최적화**: 초기 렌더링 시 데이터가 필요할 때
- **성능 최적화**: 서버에서 캐싱이 필요한 경우
- **민감한 로직**: 쿼리 로직을 클라이언트에 노출하고 싶지 않을 때

```typescript
// 선택적: 서버 컴포넌트 사용 (SEO, 성능 최적화가 필요한 경우)
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from('profiles').select('*');
  return <div>{/* ... */}</div>;
}
```

**RLS 존중**: 모든 접근 방식(클라이언트/서버)은 PUBLISHABLE_KEY를 사용하며, Row Level Security(RLS) 정책을 존중합니다. 사용자 세션 정보는 쿠키(서버) 또는 로컬 스토리지(클라이언트)를 통해 자동으로 전달됩니다.

2.2. 데이터 변경 (Mutation)

클라이언트 직접 쓰기 허용 범위:

✅ 허용: 사용자가 자신의 데이터(user_id = auth.uid())에 대해 RLS 정책으로 엄격하게 보호된 범위 내에서 INSERT, UPDATE를 수행하는 것을 허용합니다. (예: 자신의 프로필 수정, 자신이 작성한 게시물 수정)

❌ 금지:

다른 사용자의 데이터에 접근/수정하는 작업

여러 테이블에 걸친 복잡한 조인 또는 집계 함수(COUNT, SUM 등)가 필요한 쿼리

여러 테이블에 걸쳐 원자적 작업이 보장되어야 하는 트랜잭션

서버 액션 사용을 고려하는 시나리오 (선택적):

다음과 같은 경우에 서버 액션을 사용하는 것을 고려할 수 있습니다:

- **크로스 유저 작업**: 다른 사용자의 데이터에 영향을 미치는 작업 (예: 팀 멤버 초대, 공유 리소스 편집)
- **복잡한 비즈니스 로직**: 여러 단계의 검증이 필요한 작업 (예: 결제 처리, 구독 등급 변경, 복잡한 권한 검증)
- **외부 API 연동**: Supabase 외부 서비스와의 통신이 필요한 작업 (예: 이메일 발송, 웹훅 전송)
- **트랜잭션 작업**: 여러 테이블에 걸쳐 원자성(All-or-Nothing)이 보장되어야 하는 작업 (예: 주문 생성 시 주문 테이블 + 주문 항목 테이블 동시 쓰기)
- **감사 로그**: 보안상 중요한 작업(권한 변경, 중요 데이터 삭제)의 감사 추적(Audit Trail)이 필요한 경우

**참고**: Supabase 공식 문서에서는 서버 액션을 강제하지 않습니다. RLS가 활성화되어 있으면 클라이언트에서 직접 접근하는 것도 안전합니다. 서버 액션은 복잡한 비즈니스 로직이나 추가 검증이 필요한 경우에만 선택적으로 사용합니다.

삭제는 없다, 오직 상태 변경만 있을 뿐 (Soft Deletes Only): 모든 데이터의 '삭제'는 물리적 DELETE가 아닌, status 필드를 'deleted'로 변경하고 deleted_at 타임스탬프를 기록하는 소프트 삭제(Soft Delete) 방식으로만 수행해야 합니다.

2.3. 클라이언트 사이드 직접 접근 패턴 (SPA 스타일) - **기본 권장 방식**

**Supabase는 JWT 기반 인증을 사용하며, 브라우저에서 직접 데이터베이스에 접근하는 것을 기본으로 지원합니다.**

**JWT 인증:**
- Supabase의 Access Token은 JWT(JSON Web Token) 형태입니다.
- JWT에는 사용자 ID(`sub`), 역할(`role`), 이메일(`email`) 등의 정보가 포함됩니다.
- RLS 정책은 이 JWT의 정보를 기반으로 데이터 접근을 제어합니다.

**클라이언트 사이드 직접 접근 (기본 권장):**
```typescript
// ✅ 기본 권장: 브라우저에서 직접 Supabase 클라이언트 사용
'use client';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function MyComponent() {
  const supabase = createBrowserSupabaseClient();
  
  // RLS가 활성화되어 있으면 안전하게 직접 접근 가능
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId); // RLS 정책이 자동으로 적용됨
}
```

**안전한 클라이언트 사이드 접근 조건:**
1. ✅ **RLS 필수**: 모든 테이블에 RLS가 활성화되어 있어야 합니다.
2. ✅ **PUBLISHABLE_KEY 사용**: 클라이언트에서는 반드시 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`만 사용합니다.
3. ✅ **자신의 데이터만**: 사용자는 자신의 데이터(`user_id = auth.uid()`)에만 접근할 수 있어야 합니다.

**주의사항:**
- ⚠️ **SECRET_KEY 절대 노출 금지**: `SUPABASE_SECRET_KEY`는 절대 클라이언트에 노출되어서는 안 됩니다.
- ⚠️ **복잡한 로직은 선택적으로 서버로**: 여러 테이블 조인, 트랜잭션, 외부 API 호출이 필요한 경우에만 Server Action을 고려합니다.

**공식 문서 인용:**
> "Supabase allows convenient and secure data access from the browser, as long as you enable RLS."
> "You can use them directly from the browser (two-tier architecture), or as a complement to your own API server (three-tier architecture)."

2.4. 소프트 삭제 구현 가이드

데이터베이스 스키마: 모든 테이블에 다음 필드를 추가합니다.

```sql
ALTER TABLE your_table
ADD COLUMN status TEXT DEFAULT 'active' NOT NULL,
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 성능 최적화를 위해 활성 레코드에 대한 인덱스 생성
CREATE INDEX idx_your_table_active_status ON your_table(status)
WHERE status != 'deleted';
```

RLS 정책 업데이트: SELECT, UPDATE 정책에 status 조건을 추가하여 삭제된 레코드가 보이지 않고 수정할 수 없도록 합니다.

```sql
CREATE POLICY "Users can view own active records" ON your_table
FOR SELECT USING (
  auth.uid() = user_id
  AND (status IS NULL OR status != 'deleted')
);
```

클라이언트/서버 코드: DELETE 대신 UPDATE를 사용합니다.

```typescript
// ❌ DELETE 사용 금지 (물리적 삭제)
await supabase.from('items').delete().eq('id', itemId);

// ✅ 소프트 삭제 사용 (상태 변경)
await supabase
  .from('items')
  .update({
    status: 'deleted',
    deleted_at: new Date().toISOString()
  })
  .eq('id', itemId)
  .eq('user_id', userId); // RLS로도 보호
```

원칙 3: 보안은 계층적으로 (Defense in Depth)

우리 시스템의 보안은 두 개의 핵심 계층으로 구성됩니다.

애플리케이션 계층 (in Next.js) - 1차 방어선:

복잡한 비즈니스 로직: 서버 액션은 입력 데이터 유효성, 역할(Role) 기반 권한, 복잡한 비즈니스 규칙, 트랜잭션 일관성을 철저히 검증합니다. 이 계층에서 사전에 잘못된 요청을 차단하여 데이터베이스 부하를 줄이고 보안을 강화합니다.

데이터베이스 계층 (in Supabase) - 2차/마지막 방어선:

최종 관문: Row Level Security (RLS) 정책이 모든 데이터 접근에 대한 마지막 방어선(Last Line of Defense) 역할을 합니다. RLS 정책은 "이 사용자가 이 행의 소유자인가? (auth.uid() = user_id)"와 같이 데이터의 소유권을 검증합니다. 

**중요**: Supabase는 브라우저에서 직접 데이터베이스 접근을 허용하므로, RLS는 반드시 활성화되어야 합니다. 애플리케이션 계층의 검증을 우회하더라도 RLS가 최종적으로 데이터 접근을 제어합니다. 이는 Defense in Depth의 핵심 원칙입니다.

3.1. RLS 정책 작성 가이드

기본 패턴 (소유권):

```sql
CREATE POLICY "Users can access own data" ON your_table
FOR ALL 
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);
```

**성능 최적화 팁:**
- `auth.uid()`를 `(select auth.uid())`로 감싸면 성능이 크게 향상됩니다 (99% 이상 개선 가능)
- 역할을 명시적으로 지정 (`TO authenticated`)하면 불필요한 정책 실행을 방지합니다

정책 테스트 (Local Supabase CLI):

```sql
-- 테스트 사용자로 역할 및 JWT 설정
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '<test-user-uuid>';

-- 정책 테스트 실행
SELECT * FROM your_table; -- 해당 사용자의 데이터만 보여야 함
```

3.2. RLS 성능 최적화 가이드

RLS 정책의 성능은 애플리케이션의 전반적인 성능에 직접적인 영향을 미칩니다. 다음 최적화 기법을 반드시 적용해야 합니다.

#### 3.2.1. 인덱스 추가

RLS 정책에서 사용하는 컬럼에 인덱스를 추가합니다:

```sql
-- RLS 정책
CREATE POLICY "Users can view own data" ON profiles
  FOR SELECT 
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- 성능 최적화: 인덱스 추가 (필수)
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
```

**벤치마크**: 인덱스 없이 171ms → 인덱스 추가 후 <0.1ms (99.94% 개선)

#### 3.2.2. 함수를 select로 감싸기

`auth.uid()` 같은 함수를 `select`로 감싸면 Postgres 옵티마이저가 결과를 캐싱하여 성능이 크게 향상됩니다:

```sql
-- ❌ 느린 방법 (매 행마다 함수 호출)
CREATE POLICY "Users can view own data" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

-- ✅ 빠른 방법 (함수 결과 캐싱)
CREATE POLICY "Users can view own data" ON profiles
  FOR SELECT 
  TO authenticated
  USING ((select auth.uid()) = user_id);
```

**벤치마크**: 179ms → 9ms (94.97% 개선)

#### 3.2.3. 쿼리에 필터 추가

RLS 정책이 있어도 쿼리에 필터를 추가하면 Postgres가 더 나은 쿼리 계획을 수립할 수 있습니다:

```typescript
// ❌ 느린 방법 (RLS만 의존)
const { data } = await supabase.from('profiles').select();

// ✅ 빠른 방법 (RLS + 명시적 필터)
const { data } = await supabase
  .from('profiles')
  .select()
  .eq('user_id', userId); // RLS와 중복되더라도 추가
```

**벤치마크**: 171ms → 9ms (94.74% 개선)

#### 3.2.4. Security Definer 함수 사용

복잡한 JOIN이 필요한 경우 Security Definer 함수를 사용하여 RLS 오버헤드를 최소화합니다:

```sql
-- 복잡한 권한 체크를 함수로 추상화
CREATE FUNCTION private.user_has_permission(
  p_user_id UUID,
  p_entity_id UUID,
  p_required_permission BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 복잡한 JOIN 로직 (RLS 우회)
  RETURN EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = p_user_id
      AND m.entity_id = p_entity_id
      AND (m.permissions & p_required_permission) <> 0
  );
END;
$$;

-- 정책에서 사용
CREATE POLICY "Users can access entity" ON my_table
  FOR SELECT 
  TO authenticated
  USING ((select private.user_has_permission(auth.uid(), entity_id, 4)));
```

**주의사항**: Security Definer 함수는 `public` 스키마가 아닌 `private` 같은 비노출 스키마에 생성해야 합니다.

**벤치마크**: 178,000ms → 12ms (99.993% 개선)

#### 3.2.5. JOIN 최소화

정책에서 JOIN을 사용할 때는 방향을 주의해야 합니다:

```sql
-- ❌ 느린 방법 (소스 테이블과 JOIN)
CREATE POLICY "..." ON test_table
  FOR SELECT USING (
    (select auth.uid()) in (
      select user_id
      from team_user
      where team_user.team_id = test_table.team_id -- JOIN
    )
  );

-- ✅ 빠른 방법 (필터를 먼저 적용)
CREATE POLICY "..." ON test_table
  FOR SELECT USING (
    team_id in (
      select team_id
      from team_user
      where user_id = (select auth.uid()) -- JOIN 없음
    )
  );
```

**벤치마크**: 9,000ms → 20ms (99.78% 개선)

#### 3.2.6. 역할 지정

정책에 역할을 명시하면 불필요한 정책 실행을 방지합니다:

```sql
-- ❌ 모든 역할에 대해 정책 실행
CREATE POLICY "Users can view own data" ON profiles
  FOR SELECT USING ((select auth.uid()) = user_id);

-- ✅ authenticated 역할에만 실행
CREATE POLICY "Users can view own data" ON profiles
  FOR SELECT 
  TO authenticated
  USING ((select auth.uid()) = user_id);
```

**벤치마크**: 170ms → <0.1ms (99.78% 개선, anon 사용자 접근 시)

3.3. 서버 액션 보안 체크리스트

모든 서버 액션은 다음을 확인해야 합니다:

[ ] 사용자 인증 확인: getCurrentUser() 등을 호출하여 인증된 사용자인지 확인

[ ] 입력 데이터 유효성 검사: Zod 스키마 등을 사용하여 입력값(payload) 검증

[ ] 권한 검증: 이 사용자가 이 작업을 수행할 역할(role)이나 권한이 있는지 확인

[ ] 데이터 소유권 이중 확인: RLS가 있더라도, 로직 내에서 한 번 더 소유권 확인

[ ] 에러 처리: try-catch를 사용하고, 클라이언트에 민감한 에러 정보를 노출하지 않음

3.4. 인증 처리 가이드

Supabase는 클라이언트 사이드 인증을 권장합니다. 이는 세션 관리의 자동화, OAuth 호환성, 실시간 업데이트 등의 이점을 제공합니다.

#### 3.4.1. 클라이언트 사이드 인증 (권장)

인증 자체는 클라이언트 컴포넌트에서 처리하는 것을 권장합니다:

```typescript
// ✅ 권장: 클라이언트 컴포넌트에서 인증 처리
'use client';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function SignUpForm() {
  const supabase = createBrowserSupabaseClient();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    // 회원가입 성공 후 추가 초기화 (Server Action)
    if (data.user) {
      await initializeUserAccount(data.user.id);
    }

    toast.success('Check your email for the confirmation link!');
  };
}
```

**장점:**
- Supabase가 쿠키를 자동으로 관리
- OAuth 플로우와 일관성 유지
- `onAuthStateChange`로 실시간 세션 업데이트 가능
- 즉각적인 에러 피드백

#### 3.4.2. 서버 사이드 세션 확인

서버 컴포넌트에서는 세션만 확인합니다:

```typescript
// ✅ 서버 컴포넌트: 세션 확인
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Page() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return <div>Welcome {user.email}</div>;
}
```

#### 3.4.3. 하이브리드 접근 (복잡한 비즈니스 로직)

인증은 클라이언트에서, 추가 비즈니스 로직은 Server Action에서 처리합니다:

```typescript
// 클라이언트: Supabase 인증
const { data } = await supabase.auth.signUp({ email, password });

// Server Action: 추가 초기화
'use server';
export async function initializeUserAccount(userId: string) {
  const supabase = await createServerSupabaseClient();
  
  // 회원가입 후 초기화 작업
  // 예: 기본 조직 생성, 권한 설정 등
  const { data: org } = await supabase
    .from('organizations')
    .insert({ name: 'My Organization' })
    .select()
    .single();

  if (org) {
    await supabase.from('memberships').insert({
      user_id: userId,
      entity_id: org.id,
      entity_type: 1,
      permissions: 31, // ORG_OWNER
    });
  }
}
```

**이 접근 방식의 장점:**
- Supabase 권장 방식 준수
- 복잡한 비즈니스 로직을 서버에서 안전하게 처리
- OAuth와 일관성 유지

원칙 4: 상태는 서버에, UI 상태는 클라이언트에 (Server for State, UI State for Client)

데이터의 진실 공급원(SSoT): 데이터의 유일하고 진실된 공급원은 Postgres 데이터베이스 입니다.

상태 중복 최소화: 서버의 데이터를 클라이언트 상태 관리 라이브러리(Zustand 등)에 그대로 복제하여 사용하는 것을 지양합니다. 서버 데이터는 필요시 revalidatePath 등을 통해 다시 조회하는 것을 원칙으로 합니다.

4.1. 클라이언트 상태 관리 예시 (Zustand 등)

✅ 적절한 사용 (UI 상태):

```typescript
interface UIState {
  isModalOpen: boolean;
  selectedTab: string;
  formDraft: Partial<FormData>; // 비영속적인 폼 초안
  currentUser: User | null; // 로그인한 사용자 정보 (캐시 목적)
}
```

❌ 부적절한 사용 (서버 데이터 복제):

```typescript
interface BadState {
  allProfiles: Profile[]; // 서버에서 가져온 데이터 목록
  teamItems: Item[];      // 서버에서 가져온 데이터 목록
}
```

4.2. 실시간 업데이트

Supabase Realtime은 UI에 즉각적인 피드백이 필요한 경우(예: 채팅, 알림)에 한해 제한적으로 사용합니다.

상태 복제가 아닌, Realtime 이벤트를 받아 revalidatePath()를 트리거하거나 UI에 알림을 표시하는 용도로 사용합니다.

4.2.1. 실시간 업데이트 예시

```typescript
// 클라이언트 컴포넌트
'use client';

import { useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function RealtimeProfileUpdater({ userId }: { userId: string }) {
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const channel = supabase
      .channel(`profile-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('Profile updated!', payload.new);
          // UI에 알림을 표시하거나,
          // 서버 액션을 호출하여 관련 경로의 캐시를 무효화합니다.
          // 예: await triggerRevalidation('/dashboard');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  return null;
}
```

4.3. 서버 데이터 캐싱 전략

Next.js 캐싱: 서버 컴포넌트의 fetch 또는 Supabase 클라이언트 조회를 Next.js가 자동으로 캐싱합니다. 데이터 변경 후 revalidatePath 또는 revalidateTag로 캐시를 무효화합니다.

React cache(): cache() 유틸리티를 사용하여 동일한 렌더링 주기 내에서 중복 데이터 요청을 방지합니다.

원칙 5: 코드는 예측 가능하게 (Predictable Code)

5.1. 의존성 주입(DI) 사용 가이드

사용 시점: 서비스 계층(예: UserService, CompanyService)이나 외부 의존성(Supabase 클라이언트, 외부 API)이 있는 복잡한 비즈니스 로직을 구현할 때 InversifyJS 등을 사용합니다.

목적: 코드의 결합도를 낮추고, 테스트(Mocking) 용이성을 극대화합니다.

예외: 프로젝트 초기 단계나 간단한 로직은 DI 없이 직접 호출하는 것을 허용합니다.

5.2. 타입 시스템 가이드

DB 타입 자동 생성: supabase gen types CLI 명령을 사용하여 데이터베이스 스키마로부터 TypeScript 타입을 자동 생성하고, 이를 프로젝트 전반에서 활용합니다.

```bash
supabase gen types typescript --project-id <project-id> > types/supabase.ts
```

타입 사용 원칙:

모든 DB 쿼리 결과는 types/supabase.ts의 타입을 사용합니다.

any 타입 사용을 절대 금지합니다. (unknown 사용 후 타입 가드)

5.2.1. 타입 사용 예시

```typescript
// ✅ 올바른 타입 사용
import type { Database } from '@/types/supabase';

// DB에서 직접 타입 추론
type Profile = Database['public']['tables']['profiles']['Row'];
type NewProfile = Database['public']['tables']['profiles']['Insert'];

export async function getUserProfile(id: string): Promise<Profile | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  
  return data;
}

// ✅ 타입 가드 예시
function isProfile(data: unknown): data is Profile {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data // 주요 필드 확인
  );
}
```

원칙 6: tRPC를 통한 타입 안전한 API 통신 (Type-Safe API with tRPC)

**tRPC는 선택적 도구입니다.** Supabase의 클라이언트 사이드 직접 접근이 기본 권장 방식이지만, 복잡한 비즈니스 로직이나 타입 안전성이 중요한 API 엔드포인트가 필요한 경우 tRPC를 사용할 수 있습니다.

6.1. tRPC의 역할과 장점

**tRPC란:**
- TypeScript 기반의 타입 안전한 API 통신 라이브러리
- 서버와 클라이언트 간의 타입을 공유하여 컴파일 타임에 타입 체크
- 자동 완성과 타입 추론을 통한 개발자 경험 향상

**tRPC 사용 시나리오:**
- ✅ **복잡한 비즈니스 로직**: 여러 단계의 검증과 변환이 필요한 경우
- ✅ **타입 안전성 강화**: API 응답과 요청의 타입을 엄격하게 관리하고 싶을 때
- ✅ **재사용 가능한 API**: 여러 클라이언트(웹, 모바일 등)에서 동일한 API를 사용할 때
- ✅ **에러 처리 표준화**: 일관된 에러 처리와 응답 형식이 필요할 때

**tRPC를 사용하지 않는 경우:**
- ❌ **단순한 CRUD**: RLS로 보호된 자신의 데이터에 대한 기본 CRUD 작업
- ❌ **직접 접근 가능**: Supabase 클라이언트로 충분히 처리 가능한 경우

6.2. tRPC와 Supabase 통합

**아키텍처 패턴:**
```
클라이언트 컴포넌트
  ↓ (tRPC 호출)
tRPC Router (Next.js 서버)
  ↓ (Supabase 클라이언트)
Supabase (Postgres + RLS)
```

**tRPC는 Supabase를 대체하지 않습니다:**
- tRPC는 API 레이어 역할만 수행
- 데이터베이스 접근은 여전히 Supabase 클라이언트를 통해 수행
- RLS 정책은 그대로 적용됨

6.3. tRPC 설정 가이드

**필수 패키지 설치:**
```bash
pnpm add @trpc/server @trpc/client @trpc/react-query @trpc/next @tanstack/react-query
```

**프로젝트 구조:**
```
src/
├── lib/
│   └── trpc/
│       ├── server.ts          # tRPC 서버 설정
│       ├── client.ts          # tRPC 클라이언트 설정
│       └── router.ts          # tRPC 라우터 정의
└── app/
    └── api/
        └── trpc/
            └── [trpc]/
                └── route.ts   # tRPC API 핸들러
```

**tRPC 서버 설정 (lib/trpc/server.ts):**
```typescript
import { initTRPC, TRPCError } from '@trpc/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Context 생성 함수
export async function createTRPCContext() {
  const cookieStore = await cookies();
  const supabase = await createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  return {
    supabase,
    user,
  };
}

// tRPC 초기화
const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof z.ZodError
          ? error.cause.flatten()
          : null,
      },
    };
  },
});

// Base router와 procedure export
export const router = t.router;
export const publicProcedure = t.procedure;

// 인증이 필요한 procedure
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // 타입이 user로 좁혀짐
    },
  });
});
```

**tRPC 라우터 예시 (lib/trpc/router.ts):**
```typescript
import { router, publicProcedure, protectedProcedure } from './server';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const appRouter = router({
  // 공개 프로시저 예시
  getPublicProfile: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', input.id)
        .single();
      
      if (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Profile not found',
        });
      }
      
      return data;
    }),
  
  // 보호된 프로시저 예시
  updateProfile: protectedProcedure
    .input(
      z.object({
        fullName: z.string().min(1).max(100),
        avatarUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // RLS가 자동으로 적용됨 (user_id = auth.uid())
      const { data, error } = await ctx.supabase
        .from('profiles')
        .update({
          full_name: input.fullName,
          avatar_url: input.avatarUrl,
        })
        .eq('user_id', ctx.user.id)
        .select()
        .single();
      
      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update profile',
        });
      }
      
      return data;
    }),
  
  // 복잡한 비즈니스 로직 예시
  createOrder: protectedProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            productId: z.string().uuid(),
            quantity: z.number().int().positive(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 트랜잭션 로직 (여러 테이블 업데이트)
      const { data: order, error: orderError } = await ctx.supabase
        .from('orders')
        .insert({
          user_id: ctx.user.id,
          status: 'pending',
        })
        .select()
        .single();
      
      if (orderError || !order) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create order',
        });
      }
      
      // 주문 항목 추가
      const orderItems = input.items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
      }));
      
      const { error: itemsError } = await ctx.supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) {
        // 롤백 (주문 삭제)
        await ctx.supabase.from('orders').delete().eq('id', order.id);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create order items',
        });
      }
      
      return order;
    }),
});

export type AppRouter = typeof appRouter;
```

**tRPC API 핸들러 (app/api/trpc/[trpc]/route.ts):**
```typescript
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/trpc/router';
import { createTRPCContext } from '@/lib/trpc/server';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };
```

**tRPC 클라이언트 설정 (lib/trpc/client.ts):**
```typescript
'use client';

import { useState } from 'react';
import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppRouter } from './router';

export const trpc = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

**클라이언트에서 사용 예시:**
```typescript
'use client';

import { trpc } from '@/lib/trpc/client';

export function ProfileForm() {
  const utils = trpc.useUtils();
  
  // Query 예시
  const { data: profile } = trpc.getPublicProfile.useQuery({
    id: 'user-id',
  });
  
  // Mutation 예시
  const updateProfile = trpc.updateProfile.useMutation({
    onSuccess: () => {
      utils.getPublicProfile.invalidate();
      toast.success('Profile updated!');
    },
  });
  
  const handleSubmit = (data: FormData) => {
    updateProfile.mutate({
      fullName: data.get('fullName') as string,
      avatarUrl: data.get('avatarUrl') as string,
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  );
}
```

6.4. tRPC 사용 원칙

**언제 tRPC를 사용하는가:**
- ✅ 복잡한 비즈니스 로직이 필요한 API 엔드포인트
- ✅ 여러 테이블에 걸친 트랜잭션 작업
- ✅ 타입 안전성이 중요한 API
- ✅ 재사용 가능한 API 엔드포인트

**언제 Supabase 클라이언트를 직접 사용하는가:**
- ✅ 단순한 CRUD 작업 (자신의 데이터)
- ✅ RLS로 충분히 보호되는 작업
- ✅ 실시간 구독 (Realtime)
- ✅ 파일 업로드/다운로드 (Storage)

**하이브리드 접근:**
- 클라이언트에서 직접 접근: 단순한 CRUD, 실시간 기능
- tRPC: 복잡한 비즈니스 로직, 트랜잭션, 타입 안전성이 중요한 경우

6.5. tRPC와 RLS 통합

**중요**: tRPC를 사용하더라도 RLS 정책은 그대로 적용됩니다.

```typescript
// tRPC 프로시저에서도 RLS가 자동으로 적용됨
updateProfile: protectedProcedure
  .mutation(async ({ ctx, input }) => {
    // RLS 정책: user_id = auth.uid()가 자동으로 적용됨
    const { data } = await ctx.supabase
      .from('profiles')
      .update(input)
      .eq('user_id', ctx.user.id); // 명시적으로 추가하는 것이 좋음
    
    return data;
  });
```

**보안 체크리스트:**
- [ ] tRPC 프로시저에서도 RLS 정책이 적용되는지 확인
- [ ] 인증이 필요한 프로시저는 `protectedProcedure` 사용
- [ ] 입력값은 Zod 스키마로 검증
- [ ] 에러 메시지에 민감한 정보 노출하지 않기

3. Supabase 클라이언트 사용 원칙

3.1. 서버 클라이언트 (lib/supabase/server.ts)

용도: 서버 컴포넌트, 서버 액션, API 라우트

키: PUBLISHABLE_KEY 사용 (RLS 정책 존중)

특징: 사용자 세션 정보는 쿠키를 통해 자동으로 전달됨

구현 예시:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서 호출된 경우 무시
          }
        },
      },
    }
  );
}
```

3.2. Admin 클라이언트 (서비스 롤 키) 사용 원칙

🚫 Admin 클라이언트 사용 금지 (원칙):

SERVICE_ROLE_KEY는 RLS를 포함한 모든 보안 장치를 우회하므로, 애플리케이션 로직에서 절대 사용해서는 안 됩니다.

**Supabase 공식 문서 인용:**
> "By default, the auth-helpers/ssr do not permit the use of the `service_role` `secret`. This restriction is in place to prevent the accidental exposure of your `service_role` `secret` to the public. Since the auth-helpers/ssr function on both the server and client side, it becomes challenging to separate the key specifically for client-side usage."

**제한 이유:**
`@supabase/ssr` (auth-helpers/ssr)는 서버와 클라이언트 양쪽에서 동작하므로, service_role 키를 클라이언트 측에서 분리하기 어렵습니다. 이로 인해 실수로 공개될 위험이 있어 기본적으로 사용이 제한됩니다.

✅ 서비스 롤 키가 필요한 경우 (극히 예외적):

시나리오: RLS 정책을 우회해야 하는 극히 제한적인 서버 액션 (예: 어드민 계정, 시스템 전체 설정 변경, 특정 사용자의 데이터 마이게이션, 웹훅 처리)

**중요**: `@supabase/ssr`의 `createServerClient`는 service_role 키를 허용하지 않습니다. Supabase 공식 문서에 따르면, service_role 키를 사용하려면 `@supabase/supabase-js`의 `createClient`를 직접 사용해야 합니다.

**구현 방법:**

**방법 1: 일회성 생성 (권장)**
별도 클라이언트 함수를 만들지 않고, 해당 서버 액션 내에서 일회성으로 생성하여 사용합니다.

```typescript
'use server';

import { createClient } from '@supabase/supabase-js';

export async function highlySensitiveAdminAction() {
  // ⚠️ 주의: @supabase/ssr가 아닌 @supabase/supabase-js 사용
  // @supabase/ssr는 service_role 키를 허용하지 않음
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!, // Secret Key 사용
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  // ... RLS를 우회하는 관리자 작업 수행 ...
  // 예: 웹훅에서 결제 상태 업데이트, 시스템 마이그레이션 등
}
```

**방법 2: 별도 함수 생성 (선택적)**
공식 문서에 따르면 별도 클라이언트를 생성하는 것도 가능하지만, 보안을 위해 일회성 사용을 권장합니다. 함수로 만들 경우 반드시 서버 전용으로만 사용해야 합니다.

```typescript
// lib/supabase/admin.ts (서버 전용)
import { createClient } from '@supabase/supabase-js';

/**
 * ⚠️ WARNING: This function bypasses RLS.
 * Use only in exceptional cases: webhooks, migrations, admin operations.
 * Never expose this function to client-side code.
 */
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
```

**서버 환경 필수 설정:**
공식 문서에 따르면 서버 환경에서 다음 속성을 반드시 비활성화해야 합니다:
- `persistSession: false` - 세션을 저장하지 않음
- `autoRefreshToken: false` - 토큰 자동 갱신 비활성화
- `detectSessionInUrl: false` - URL에서 세션 감지 비활성화

⚠️ 경고: 이 패턴은 RLS를 우회하므로 극히 예외적인 경우에만 사용해야 합니다. 사용 전 반드시 팀의 기술 리더와 합의하고, 사용 이유를 명확히 문서화해야 합니다.

**사용 가능한 시나리오:**
- 웹훅 처리 (결제, 외부 서비스)
- 시스템 마이그레이션
- 관리자 대시보드 (추가 인증 필요)
- 배치 작업

**사용 금지 시나리오:**
- 일반적인 비즈니스 로직
- 사용자 요청 처리
- RLS로 처리 가능한 작업

**공식 문서 참조:**
- [Performing administration tasks on the server side with the service_role secret](https://supabase.com/docs/guides/troubleshooting/performing-administration-tasks-on-the-server-side-with-the-servicerole-secret)
- [GitHub Discussion (원문)](https://github.com/orgs/supabase/discussions/15860)

3.3. 브라우저 클라이언트 (lib/supabase/client.ts)

용도: 클라이언트 컴포넌트에서 RLS로 보호된 자신의 데이터에 대한 직접 접근

키: PUBLISHABLE_KEY 사용 (RLS 정책 존중)

구현 예시:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
```

사용 범위:

✅ 적절한 사용:

```typescript
// 자신의 프로필 업데이트 (RLS로 보호됨)
const supabase = createBrowserSupabaseClient();
await supabase
  .from('profiles')
  .update({ full_name: 'New Name' })
  .eq('id', userId);
```

❌ 부적절한 사용:

```typescript
// 다른 사용자 데이터 접근 시도 (RLS가 막지만, 로직 자체가 잘못됨)
await supabase
  .from('profiles')
  .update({ full_name: 'Hacked' })
  .eq('id', otherUserId); // 서버 액션을 사용해야 함
```

4. 데이터베이스 네이밍 컨벤션

테이블명: snake_case, 복수형 사용 (예: profiles, companies, team_members)

컬럼명: snake_case 사용

외래키: {참조하는테이블_단수형}_id (예: user_id, company_id)

타임스탬프: created_at, updated_at, deleted_at (모두 timestamptz 타입)

상태: status (예: 'active', 'deleted', 'pending')

인덱스명: idx_{table}_{column} (예: idx_profiles_email)

제약조건명: fk_{table}_{column} (예: fk_profiles_user_id)

5. 코드 리뷰 체크리스트

코드를 리뷰할 때 다음 아키텍처 원칙이 준수되었는지 확인합니다.

[ ] Supabase Edge Functions를 사용하지 않았는가?

[ ] RLS 정책이 모든 신규 테이블에 활성화되었는가?

[ ] RLS 정책에 성능 최적화가 적용되었는가? (인덱스, select 래핑, 역할 지정)

[ ] 클라이언트 직접 접근은 RLS가 활성화되어 있고 자신의 데이터(auth.uid() = user_id)에 한정되는가?

[ ] 복잡한 로직, 트랜잭션, 외부 API 연동이 필요한 경우에만 서버 액션을 사용하는가? (선택적)

[ ] 물리적 DELETE 대신 소프트 삭제(status = 'deleted') 패턴을 사용했는가?

[ ] any 타입을 사용하지 않고 DB 타입을 정확히 지정했는가?

[ ] 서버 데이터를 Zustand 같은 클라이언트 상태에 직접 복제하지 않았는가?

[ ] SERVICE_ROLE_KEY를 부적절하게 사용하지 않았는가? (필요 시 @supabase/supabase-js 사용)

[ ] 인증은 클라이언트에서 처리하고, 복잡한 비즈니스 로직이 필요한 경우에만 Server Action 또는 tRPC를 사용하는가?

[ ] tRPC를 사용하는 경우, RLS 정책이 제대로 적용되는지 확인했는가?

[ ] tRPC 프로시저에서 입력값은 Zod 스키마로 검증하는가?

6. 결론

이 원칙들은 프로젝트의 기술적 방향성을 결정하는 핵심입니다. 모든 개발자는 이 원칙을 숙지하고, 코드 작성 시 이를 준수해야 합니다. 원칙을 위반해야 하는 특별한 경우가 있다면, 반드시 팀의 기술 리더와 논의한 후 진행해야 합니다.

**v1.4.0 주요 변경사항:**
- tRPC 통합 가이드 추가 (타입 안전한 API 통신)
- 클라이언트 사이드 직접 접근을 기본 권장 방식으로 명시
- 서버 액션을 선택적 도구로 변경 (필수 → 선택적)
- Supabase 공식 문서 인용 추가

**v1.3.0 주요 변경사항:**
- Service Role Key 사용 방식 수정 (@supabase/supabase-js 사용)
- RLS 성능 최적화 가이드 추가 (인덱스, 함수 최적화, JOIN 최소화 등)
- 인증 처리 패턴 명확화 (클라이언트 인증 권장, 하이브리드 접근)
- 성능 벤치마크 데이터 추가

