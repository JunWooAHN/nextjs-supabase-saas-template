# 회원가입 500 에러 가설 문서

## 1. 문제 정의

**증상:**
- 회원가입 시도 시 500 Internal Server Error 발생
- 브라우저 콘솔에 "Failed to load resource: the server responded with a status of 500" 에러 표시
- 사용자 계정 생성이 실패함

**영향 범위:**
- 이메일/비밀번호 회원가입 기능 전체
- 신규 사용자 온보딩 프로세스 차단

## 2. 의심 원인 (가설)

### 가설 1: RLS 정책으로 인한 트리거 함수 실패 (가장 유력)

**근거:**
1. **트리거 함수 실행 컨텍스트 문제**
   - `handle_new_user()` 트리거는 `auth.users` 테이블에 INSERT 후 실행됨
   - 트리거 실행 시점에는 아직 사용자 세션이 완전히 설정되지 않음
   - `auth.uid()`가 NULL이거나 제대로 설정되지 않을 수 있음

2. **RLS 정책 제약**
   - 현재 `profiles` 테이블의 INSERT 정책: `id = auth.uid()`
   - 트리거 함수가 `SECURITY DEFINER`로 실행되더라도 RLS는 여전히 적용됨
   - 트리거 실행 시 `auth.uid()`가 NULL이면 정책 통과 실패

3. **시스템 사용자 정책 부재**
   - `.cursorrules`에 명시된 패턴: "Create specific RLS policies for `supabase_auth_admin` role"
   - 현재 마이그레이션에는 `supabase_auth_admin` 역할에 대한 정책이 없음
   - Supabase Auth가 사용자를 생성할 때 사용하는 시스템 역할이 `profiles` 테이블에 INSERT할 권한이 없음

**관련 코드:**
```132:143:supabase/migrations/00_initial_schema.sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```79:80:supabase/migrations/00_initial_schema.sql
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());
```

### 가설 2: 스키마 참조 누락

**근거:**
- `.cursorrules`에 명시: "Always use explicit schema references (`public.profiles` not `profiles`)"
- 현재 트리거 함수에서 `INSERT INTO profiles`로만 참조 (스키마 명시 없음)
- 특정 상황에서 스키마 해석 오류 가능성

**관련 코드:**
```135:135:supabase/migrations/00_initial_schema.sql
  INSERT INTO profiles (id, email, full_name)
```

### 가설 3: 이메일 NULL 처리 문제

**근거:**
- 트리거 함수에서 `NEW.email`을 직접 사용
- 일부 OAuth 제공자나 특수한 경우에 이메일이 NULL일 수 있음
- `profiles.email`이 `NOT NULL` 제약이 있음

**관련 코드:**
```15:15:supabase/migrations/00_initial_schema.sql
  email TEXT NOT NULL,
```

```138:138:supabase/migrations/00_initial_schema.sql
    NEW.email,
```

## 3. 검증 방법

### 방법 1: Supabase 로그 확인
```sql
-- Supabase Dashboard > Logs > Postgres Logs에서 확인
-- 트리거 실행 시 에러 메시지 확인
-- RLS 정책 위반 에러인지 확인
```

### 방법 2: 트리거 함수 직접 테스트
```sql
-- 테스트 사용자 생성
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  crypt('password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- 트리거가 자동 실행되는지 확인
-- profiles 테이블에 레코드가 생성되는지 확인
```

### 방법 3: RLS 정책 확인
```sql
-- 현재 profiles 테이블의 RLS 정책 확인
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 시스템 역할 확인
SELECT rolname FROM pg_roles WHERE rolname LIKE '%auth%' OR rolname LIKE '%supabase%';
```

### 방법 4: 트리거 함수 실행 컨텍스트 확인
```sql
-- 트리거 함수에서 auth.uid() 값 확인 (디버깅용)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 로깅 (실제 환경에서는 제거)
  RAISE NOTICE 'auth.uid() = %', auth.uid();
  RAISE NOTICE 'NEW.id = %', NEW.id;
  
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 4. 제안된 해결책

### 해결책 1: 시스템 사용자 RLS 정책 추가 (권장)

**설명:**
- `supabase_auth_admin` 역할에 대해 `profiles` 테이블 INSERT 권한 부여
- 트리거 함수가 실행될 때 RLS 정책을 통과할 수 있도록 함
- 최소 권한 원칙 준수 (INSERT만 허용)

**구현:**
```sql
-- 시스템 사용자가 프로필을 생성할 수 있도록 정책 추가
CREATE POLICY "System can insert profiles during signup" ON profiles
  FOR INSERT 
  TO supabase_auth_admin
  WITH CHECK (true);
```

### 해결책 2: 트리거 함수에서 명시적 스키마 참조

**설명:**
- `.cursorrules` 패턴 준수
- 명시적 스키마 참조로 혼동 방지

**구현:**
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 해결책 3: 이메일 NULL 처리 강화

**설명:**
- OAuth 사용자나 특수한 경우 대비
- 이메일이 NULL일 경우 fallback 처리

**구현:**
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.email, 'user_' || NEW.id::text || '@placeholder.local'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 5. 우선순위

1. **최우선**: 해결책 1 (시스템 사용자 RLS 정책 추가)
   - 가장 근본적인 원인일 가능성이 높음
   - `.cursorrules`에서도 명시적으로 요구하는 패턴

2. **보조**: 해결책 2 (명시적 스키마 참조)
   - 코드 일관성 및 명확성 향상
   - 잠재적 문제 예방

3. **선택적**: 해결책 3 (이메일 NULL 처리)
   - 현재는 이메일/비밀번호 회원가입만 사용 중이므로 낮은 우선순위
   - OAuth 기능 활성화 시 필요

## 6. 예상 결과

**해결책 1 적용 후:**
- 회원가입 시 트리거 함수가 정상 실행됨
- `profiles` 테이블에 레코드가 자동 생성됨
- 500 에러 해결
- 사용자 세션 정상 생성

**검증 체크리스트:**
- [ ] 회원가입 폼 제출 시 500 에러 없음
- [ ] `auth.users` 테이블에 사용자 생성됨
- [ ] `profiles` 테이블에 자동으로 프로필 생성됨
- [ ] 브라우저 콘솔에 에러 없음
- [ ] Supabase 로그에 에러 없음

## 7. 해결방안 가설

### 해결방안 가설 1: 시스템 사용자 RLS 정책 추가로 트리거 함수 실행 보장

**가설:**
`supabase_auth_admin` 역할에 대한 RLS 정책을 추가하면, 트리거 함수가 실행될 때 `profiles` 테이블에 INSERT할 수 있게 되어 500 에러가 해결될 것이다.

**논리적 근거:**
1. **RLS 정책 동작 원리**
   - PostgreSQL RLS는 모든 역할에 대해 정책을 평가함
   - `SECURITY DEFINER` 함수도 실행 컨텍스트의 역할에 따라 RLS가 적용됨
   - 트리거가 실행될 때는 `supabase_auth_admin` 역할로 실행됨
   - 현재는 일반 사용자(`auth.uid()`)에 대한 정책만 있어서 시스템 역할이 INSERT 실패

2. **Supabase Auth 아키텍처**
   - Supabase Auth는 내부적으로 `supabase_auth_admin` 역할을 사용하여 사용자 생성
   - 이 역할은 `auth.users` 테이블에는 접근 가능하지만, RLS가 활성화된 `public.profiles`에는 정책이 필요
   - `.cursorrules`에서도 이 패턴을 명시적으로 요구함

3. **최소 권한 원칙 준수**
   - `WITH CHECK (true)`를 사용하지만, `TO supabase_auth_admin`로 역할을 제한
   - 일반 사용자는 여전히 `id = auth.uid()` 정책을 통과해야 함
   - 시스템 역할만 INSERT 가능하므로 보안 위험 최소화

**예상 결과:**
- ✅ 트리거 함수가 정상 실행되어 `profiles` 테이블에 레코드 생성
- ✅ 회원가입 프로세스 완료
- ✅ 500 에러 해결
- ⚠️ 잠재적 부작용: 없음 (시스템 역할만 추가 권한 부여)

**검증 방법:**
```sql
-- 1. 정책 추가 전 상태 확인
SELECT policyname, roles, cmd, with_check 
FROM pg_policies 
WHERE tablename = 'profiles' AND cmd = 'INSERT';

-- 2. 정책 추가
CREATE POLICY "System can insert profiles during signup" ON profiles
  FOR INSERT 
  TO supabase_auth_admin
  WITH CHECK (true);

-- 3. 정책 추가 후 확인
SELECT policyname, roles, cmd, with_check 
FROM pg_policies 
WHERE tablename = 'profiles' AND cmd = 'INSERT';

-- 4. 실제 회원가입 테스트
-- 브라우저에서 회원가입 시도 후 profiles 테이블 확인
SELECT * FROM profiles ORDER BY created_at DESC LIMIT 1;
```

**성공 기준:**
- 회원가입 폼 제출 시 500 에러 없음
- `profiles` 테이블에 새 레코드 자동 생성
- Supabase 로그에 RLS 정책 위반 에러 없음

---

### 해결방안 가설 2: 명시적 스키마 참조로 스키마 해석 오류 방지

**가설:**
트리거 함수에서 `profiles` 대신 `public.profiles`로 명시적 스키마 참조를 사용하면, 스키마 해석 오류를 방지하고 코드 일관성을 높일 수 있을 것이다.

**논리적 근거:**
1. **스키마 검색 경로 의존성 제거**
   - PostgreSQL은 `search_path` 설정에 따라 테이블을 찾음
   - 명시적 스키마 참조는 `search_path` 변경에 영향받지 않음
   - 보안상 더 안전함 (스키마 혼동 공격 방지)

2. **코드 일관성**
   - `.cursorrules`에서 명시적 스키마 참조 패턴을 요구
   - 다른 마이그레이션 파일과의 일관성 유지
   - 코드 리뷰 및 유지보수 용이

3. **잠재적 문제 예방**
   - 현재는 문제가 없을 수 있으나, 향후 스키마 변경 시 문제 발생 가능
   - 명시적 참조로 미래 문제 예방

**예상 결과:**
- ✅ 코드 일관성 향상
- ✅ 스키마 해석 오류 방지
- ⚠️ 직접적인 500 에러 해결 여부: 불확실 (현재 문제의 직접적 원인은 아닐 가능성)

**검증 방법:**
```sql
-- 현재 search_path 확인
SHOW search_path;

-- 트리거 함수 수정
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 정의 확인
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
```

**성공 기준:**
- 함수가 정상적으로 생성됨
- 트리거가 정상 실행됨 (해결방안 1과 함께 적용 시)

---

### 해결방안 가설 3: 이메일 NULL 처리로 OAuth 사용자 대비

**가설:**
트리거 함수에서 이메일이 NULL인 경우를 처리하면, OAuth 제공자 중 이메일을 제공하지 않는 경우에도 프로필 생성이 가능할 것이다.

**논리적 근거:**
1. **OAuth 제공자 다양성**
   - 일부 OAuth 제공자는 이메일을 제공하지 않을 수 있음
   - Apple Sign In의 경우 이메일 숨김 옵션 제공
   - `profiles.email`이 `NOT NULL` 제약이 있어서 NULL 값 삽입 시 에러 발생

2. **Fallback 전략**
   - 사용자 ID 기반 플레이스홀더 이메일 생성
   - 실제 이메일이 없어도 프로필 생성 가능
   - 향후 OAuth 기능 활성화 시 대비

3. **데이터 무결성**
   - `NOT NULL` 제약 유지
   - 의미 있는 플레이스홀더 값 제공

**예상 결과:**
- ✅ OAuth 사용자도 프로필 생성 가능
- ✅ 이메일/비밀번호 회원가입에는 영향 없음
- ⚠️ 현재 500 에러 해결 여부: 낮음 (현재는 이메일/비밀번호만 사용 중)

**검증 방법:**
```sql
-- 트리거 함수 수정
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.email, 
      'user_' || NEW.id::text || '@placeholder.local'
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NULL 이메일 시뮬레이션 테스트 (개발 환경에서만)
-- 실제로는 OAuth 제공자에서 이메일이 NULL인 경우 테스트 필요
```

**성공 기준:**
- 이메일이 NULL인 사용자도 프로필 생성 가능
- 플레이스홀더 이메일이 올바르게 생성됨

---

## 8. 해결방안 적용 우선순위 및 조합 전략

### 단계별 적용 전략

**1단계: 해결방안 1 적용 (필수)**
- 가장 근본적인 원인 해결
- 즉시 적용 필요
- 단독으로도 문제 해결 가능성 높음

**2단계: 해결방안 2 적용 (권장)**
- 해결방안 1과 함께 적용
- 코드 일관성 및 미래 문제 예방
- 리스크 낮음

**3단계: 해결방안 3 적용 (선택)**
- OAuth 기능 활성화 시 적용
- 현재는 낮은 우선순위
- 해결방안 1, 2와 함께 적용 가능

### 통합 해결방안 (권장)

모든 해결방안을 통합한 최종 트리거 함수:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.email, 
      'user_' || NEW.id::text || '@placeholder.local'
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 시스템 사용자 RLS 정책 추가
CREATE POLICY "System can insert profiles during signup" ON profiles
  FOR INSERT 
  TO supabase_auth_admin
  WITH CHECK (true);
```

**예상 효과:**
- ✅ 500 에러 해결 (해결방안 1)
- ✅ 코드 일관성 향상 (해결방안 2)
- ✅ OAuth 대비 (해결방안 3)
- ✅ 미래 확장성 확보

---

## 9. 실제 해결 기록

### 해결 일시
**2025년 11월 16일**

### 적용한 해결방안
모든 해결방안을 통합하여 적용:
- ✅ **해결방안 1**: 시스템 사용자 RLS 정책 추가 (`supabase_auth_admin` 역할)
- ✅ **해결방안 2**: 명시적 스키마 참조 (`public.profiles`)
- ✅ **해결방안 3**: 이메일 NULL 처리 강화 (OAuth 대비)

### 마이그레이션 파일
**파일명**: `supabase/migrations/01_rls_setting_251116.sql`

**주요 변경사항:**
1. `handle_new_user()` 함수 개선
   - 명시적 스키마 참조: `INSERT INTO public.profiles`
   - NULL 이메일 처리: `COALESCE(NEW.email, 'user_' || NEW.id::text || '@placeholder.local')`

2. RLS 정책 추가
   ```sql
   CREATE POLICY "System can insert profiles during signup" ON profiles
     FOR INSERT 
     TO supabase_auth_admin
     WITH CHECK (true);
   ```

3. 트리거 확인 로직 추가
   - `DO` 블록으로 트리거 존재 여부 확인 후 조건부 생성
   - 멱등성 보장

### 해결 과정

**1단계: 문제 진단**
- 회원가입 시 500 에러 발생 확인
- Supabase 로그에서 RLS 정책 위반 에러 확인
- 트리거 함수 실행 시 `auth.uid()`가 NULL인 상황 파악

**2단계: 가설 수립**
- RLS 정책 부재가 근본 원인으로 가설 수립
- 시스템 역할(`supabase_auth_admin`)에 대한 정책 필요성 확인

**3단계: 해결방안 구현**
- 마이그레이션 파일 작성
- 멱등성 보장을 위한 안전한 SQL 작성
- Supabase SQL Editor에서 구문 오류 수정 (COMMENT 구문 단일 문자열로 변경)

**4단계: 적용 및 검증**
- 마이그레이션 파일 실행
- 회원가입 기능 테스트

### 검증 결과

**성공 기준 달성 여부:**
- [x] 회원가입 폼 제출 시 500 에러 없음
- [x] `auth.users` 테이블에 사용자 생성됨
- [x] `profiles` 테이블에 자동으로 프로필 생성됨
- [x] 브라우저 콘솔에 에러 없음
- [x] Supabase 로그에 에러 없음

### 최종 확인 사항

**해결된 문제:**
- ✅ 회원가입 500 에러 완전 해결
- ✅ 트리거 함수가 정상적으로 프로필 생성
- ✅ RLS 정책이 올바르게 작동

**개선된 사항:**
- ✅ 코드 일관성 향상 (명시적 스키마 참조)
- ✅ OAuth 사용자 대비 (NULL 이메일 처리)
- ✅ 멱등성 보장 (여러 번 실행 가능)

**향후 주의사항:**
- 새로운 RLS 정책이 추가될 때 시스템 역할에 대한 정책도 함께 고려
- 트리거 함수는 항상 명시적 스키마 참조 사용
- OAuth 기능 활성화 시 이메일 NULL 처리 로직 검증 필요

### 참고 자료
- 마이그레이션 파일: `supabase/migrations/01_rls_setting_251116.sql`
- 가설 문서: `docs/hypothesis/signup-500-error.md`

