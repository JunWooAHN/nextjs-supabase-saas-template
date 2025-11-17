# Supabase 아키텍처 원칙 재검토 보고서 (v1.3)

**검토 일시**: 2025년 11월 17일  
**기준 문서**: `00_supabase_architecture_1.2.md`  
**검토 기준**: Supabase 공식 문서 및 최신 베스트 프랙티스

---

## 실행 요약

### 검토 결과

**전체 평가**: ✅ **대체로 우수하나 일부 수정 필요**

**주요 발견 사항:**
1. ✅ 대부분의 원칙이 Supabase 공식 문서와 일치
2. ⚠️ Service Role Key 사용 방식 수정 필요
3. ⚠️ RLS 성능 최적화 가이드 추가 필요
4. ⚠️ 인증 처리 방식 명확화 필요

---

## 1. 원칙별 검토

### 원칙 1: Supabase는 데이터베이스, Next.js는 서버 ✅

**현재 문서 내용:**
- Supabase는 데이터 영속성 계층 (Postgres, Auth, Storage)
- Next.js는 애플리케이션 서버 역할
- Edge Functions 금지

**Supabase 문서 검증:**
- ✅ **일치**: Supabase는 BaaS로 데이터베이스, 인증, 스토리지 제공
- ✅ **일치**: Edge Functions는 선택적이며, Next.js에서 처리하는 것이 더 단순함

**결론**: ✅ 변경 불필요

---

### 원칙 2: 데이터 처리는 RLS로 보호된 범위 내에서 허용 ✅

**현재 문서 내용:**
- 서버 컴포넌트에서 데이터 조회
- 클라이언트 직접 쓰기는 자신의 데이터에 한정
- 복잡한 로직은 Server Action 사용
- 소프트 삭제만 허용

**Supabase 문서 검증:**
- ✅ **일치**: RLS는 모든 테이블에 필수
- ✅ **일치**: 클라이언트 직접 쓰기는 RLS로 보호된 범위 내에서 허용
- ✅ **일치**: 복잡한 로직은 서버에서 처리

**결론**: ✅ 변경 불필요

**추가 권장사항:**
- RLS 성능 최적화 가이드 추가 (원칙 2.4에 추가)

---

### 원칙 3: 보안은 계층적으로 ✅

**현재 문서 내용:**
- 데이터베이스 계층: RLS 정책
- 애플리케이션 계층: 서버 액션 검증

**Supabase 문서 검증:**
- ✅ **일치**: Defense in Depth 패턴
- ✅ **일치**: RLS가 1차 방어선, 애플리케이션 로직이 2차 방어선

**결론**: ✅ 변경 불필요

**추가 권장사항:**
- RLS 정책 작성 시 성능 고려사항 추가

---

### 원칙 4: 상태는 서버에, UI 상태는 클라이언트에 ✅

**현재 문서 내용:**
- 데이터의 진실 공급원은 Postgres
- 클라이언트 상태 관리 라이브러리로 서버 데이터 복제 지양
- Realtime은 제한적 사용

**Supabase 문서 검증:**
- ✅ **일치**: 데이터베이스가 Single Source of Truth
- ✅ **일치**: Realtime은 실시간 업데이트가 필요한 경우에만 사용

**결론**: ✅ 변경 불필요

---

### 원칙 5: 코드는 예측 가능하게 ✅

**현재 문서 내용:**
- 의존성 주입 가이드
- 타입 시스템 가이드
- DB 타입 자동 생성

**Supabase 문서 검증:**
- ✅ **일치**: 타입 안정성 중요
- ✅ **일치**: `supabase gen types` 사용 권장

**결론**: ✅ 변경 불필요

---

## 2. 주요 수정 사항

### 2.1 Service Role Key 사용 방식 수정 필요 ⚠️

**현재 문서 (3.2):**
```typescript
// ❌ 문제: @supabase/ssr의 createServerClient로 service_role 사용
export async function createAdminSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!, // ❌ @supabase/ssr는 service_role을 허용하지 않음
    { cookies: { ... } }
  );
}
```

**Supabase 공식 문서:**
> "By default, the auth-helpers/ssr do not permit the use of the `service_role` secret. This restriction is in place to prevent the accidental exposure of your `service_role` secret to the public."

**수정 방안:**
```typescript
// ✅ 올바른 방법: @supabase/supabase-js의 createClient 사용
import { createClient } from '@supabase/supabase-js';

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

**권장 수정:**
- `lib/supabase/admin.ts` 파일 수정
- 문서의 3.2 섹션 업데이트

---

### 2.2 RLS 성능 최적화 가이드 추가 필요 ⚠️

**현재 문서:**
- RLS 정책 작성 가이드는 있으나 성능 최적화 가이드 부재

**Supabase 공식 문서 권장사항:**
1. **인덱스 추가**: RLS 정책에서 사용하는 컬럼에 인덱스
2. **함수를 `select`로 감싸기**: `auth.uid()` → `(select auth.uid())`
3. **쿼리에 필터 추가**: RLS 정책과 중복되더라도 필터 추가
4. **Security Definer 함수 사용**: 복잡한 JOIN 최소화
5. **JOIN 최소화**: 정책에서 JOIN 사용 시 성능 저하
6. **역할 지정**: `TO authenticated` 등으로 역할 명시

**추가 권장 내용:**

```markdown
### 3.3. RLS 성능 최적화 가이드

#### 인덱스 추가
RLS 정책에서 사용하는 컬럼에 인덱스를 추가합니다:

```sql
-- RLS 정책
CREATE POLICY "Users can view own data" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

-- 성능 최적화: 인덱스 추가
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
```

#### 함수를 select로 감싸기
`auth.uid()` 같은 함수를 `select`로 감싸면 성능이 크게 향상됩니다:

```sql
-- ❌ 느린 방법
CREATE POLICY "..." ON profiles
  FOR SELECT USING (auth.uid() = user_id);

-- ✅ 빠른 방법
CREATE POLICY "..." ON profiles
  FOR SELECT USING ((select auth.uid()) = user_id);
```

#### 쿼리에 필터 추가
RLS 정책이 있어도 쿼리에 필터를 추가하면 성능이 향상됩니다:

```typescript
// ❌ 느린 방법
const { data } = await supabase.from('profiles').select();

// ✅ 빠른 방법
const { data } = await supabase
  .from('profiles')
  .select()
  .eq('user_id', userId); // RLS와 중복되더라도 추가
```

#### Security Definer 함수 사용
복잡한 JOIN이 필요한 경우 Security Definer 함수를 사용합니다:

```sql
CREATE FUNCTION private.user_has_permission(p_user_id UUID, p_entity_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 복잡한 JOIN 로직
  RETURN EXISTS (...);
END;
$$;

-- 정책에서 사용
CREATE POLICY "..." ON my_table
  FOR SELECT USING ((select private.user_has_permission(auth.uid(), entity_id)));
```

#### 역할 지정
정책에 역할을 명시하면 불필요한 정책 실행을 방지합니다:

```sql
-- ❌ 모든 역할에 대해 정책 실행
CREATE POLICY "..." ON profiles
  FOR SELECT USING (auth.uid() = user_id);

-- ✅ authenticated 역할에만 실행
CREATE POLICY "..." ON profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);
```
```

---

### 2.3 인증 처리 방식 명확화 필요 ⚠️

**현재 문서:**
- 인증 처리 방식에 대한 명확한 가이드 부재

**Supabase 공식 문서:**
- 클라이언트 사이드 인증 권장
- `@supabase/ssr` 패키지 사용 권장

**추가 권장 내용:**

```markdown
### 3.4. 인증 처리 가이드

#### 클라이언트 사이드 인증 (권장)
Supabase는 클라이언트 사이드 인증을 권장합니다:

```typescript
// ✅ 권장: 클라이언트 컴포넌트에서 인증 처리
'use client';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function SignUpForm() {
  const supabase = createBrowserSupabaseClient();
  
  const handleSubmit = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    // 에러 처리
  };
}
```

#### 서버 사이드 세션 확인
서버 컴포넌트에서는 세션만 확인합니다:

```typescript
// ✅ 서버 컴포넌트: 세션 확인
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return <div>Welcome {user.email}</div>;
}
```

#### 하이브리드 접근 (복잡한 비즈니스 로직)
인증은 클라이언트에서, 추가 비즈니스 로직은 Server Action에서:

```typescript
// 클라이언트: Supabase 인증
const { data } = await supabase.auth.signUp({ email, password });

// Server Action: 추가 초기화
if (data.user) {
  await initializeUserAccount(data.user.id);
}
```
```

---

## 3. Supabase 클라이언트 사용 원칙 수정

### 3.1 서버 클라이언트 ✅

**현재 문서:** 변경 불필요

### 3.2 Admin 클라이언트 ⚠️ **수정 필요**

**현재 문서 (3.2):**
```typescript
// ❌ 문제: @supabase/ssr 사용
export async function createAdminSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { cookies: { ... } }
  );
}
```

**수정 방안:**
```typescript
// ✅ 올바른 방법: @supabase/supabase-js 사용
import { createClient } from '@supabase/supabase-js';

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

**문서 수정:**
- 3.2 섹션 전체 수정
- `lib/supabase/admin.ts` 파일 수정 필요

### 3.3 브라우저 클라이언트 ✅

**현재 문서:** 변경 불필요

---

## 4. 추가 권장 사항

### 4.1 RLS 정책 작성 시 성능 고려사항

**추가할 내용:**
- 인덱스 추가 가이드
- 함수 최적화 방법
- JOIN 최소화 전략
- Security Definer 함수 사용

### 4.2 인증 처리 패턴 명확화

**추가할 내용:**
- 클라이언트 사이드 인증 권장 이유
- 서버 사이드 세션 확인 방법
- 하이브리드 접근 방식

### 4.3 Service Role Key 사용 시 주의사항

**추가할 내용:**
- `@supabase/ssr`는 service_role을 허용하지 않음
- `@supabase/supabase-js`의 `createClient` 사용 필요
- 서버 환경에서만 사용

---

## 5. 수정 우선순위

### 우선순위 1: Service Role Key 사용 방식 수정 (필수)

**영향:**
- `lib/supabase/admin.ts` 파일 수정 필요
- 문서 3.2 섹션 수정 필요

**작업:**
1. `lib/supabase/admin.ts`를 `@supabase/supabase-js` 사용으로 변경
2. 문서 3.2 섹션 업데이트

### 우선순위 2: RLS 성능 최적화 가이드 추가 (권장)

**영향:**
- 문서에 새로운 섹션 추가
- 개발자 가이드 보완

**작업:**
1. 원칙 3에 RLS 성능 최적화 가이드 추가
2. 예시 코드 및 벤치마크 포함

### 우선순위 3: 인증 처리 패턴 명확화 (권장)

**영향:**
- 문서에 새로운 섹션 추가
- 개발자 가이드 보완

**작업:**
1. 원칙 3에 인증 처리 가이드 추가
2. 클라이언트/서버 패턴 예시 포함

---

## 6. 최종 권장사항

### 즉시 수정 필요

1. ✅ **Service Role Key 사용 방식 수정**
   - `lib/supabase/admin.ts` 파일 수정
   - 문서 3.2 섹션 업데이트

### 점진적 개선

2. ⚠️ **RLS 성능 최적화 가이드 추가**
   - 원칙 3에 새로운 섹션 추가
   - 성능 벤치마크 포함

3. ⚠️ **인증 처리 패턴 명확화**
   - 원칙 3에 새로운 섹션 추가
   - 클라이언트/서버 패턴 예시

---

## 7. 결론

### 전체 평가

**현재 문서 (v1.2.0):**
- ✅ 대부분의 원칙이 Supabase 공식 문서와 일치
- ✅ 아키텍처 방향성 명확
- ⚠️ 일부 구현 세부사항 수정 필요

### 권장 버전 업데이트

**v1.2.0 → v1.3.0 변경사항:**
1. Service Role Key 사용 방식 수정
2. RLS 성능 최적화 가이드 추가
3. 인증 처리 패턴 명확화

### 다음 단계

1. ✅ `lib/supabase/admin.ts` 파일 수정
2. ✅ 문서 3.2 섹션 업데이트
3. ⚠️ RLS 성능 최적화 가이드 추가 (선택적)
4. ⚠️ 인증 처리 패턴 명확화 (선택적)

---

**검토 완료일**: 2025년 11월 17일  
**다음 검토 시점**: Supabase 공식 문서 업데이트 시 또는 주요 아키텍처 변경 시

