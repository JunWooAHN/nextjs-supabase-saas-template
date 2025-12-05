# Hook 디버깅 가이드

이 문서는 `custom_access_token_hook` 함수의 실행 여부를 확인하고 문제를 진단하는 방법을 안내합니다.

## 1. 마이그레이션 실행

먼저 디버깅 로깅이 추가된 Hook 함수를 적용합니다:

```bash
# Supabase CLI 사용 시
supabase migration up

# 또는 Supabase Dashboard의 SQL Editor에서
# supabase/migrations/07_add_hook_debugging.sql 파일 내용 실행
```

## 2. Supabase Dashboard에서 로그 확인

### 2.1. Postgres Logs 확인

1. Supabase Dashboard 접속
2. **Logs** > **Postgres Logs** 메뉴로 이동
3. 로그 레벨을 **NOTICE**로 설정 (또는 모든 레벨 확인)
4. 로그인 시도
5. 다음 로그 메시지 확인:
   - `=== [Hook Debug] custom_access_token_hook 실행 시작 ===`
   - 각 단계별 로그 메시지
   - `=== [Hook Debug] custom_access_token_hook 실행 완료 (성공) ===`

### 2.2. 에러 발생 시

에러가 발생하면 다음 로그가 표시됩니다:
- `=== [Hook Debug] Hook 에러 발생 ===`
- 에러 메시지, 상세 정보, SQLSTATE 등

## 3. Hook 함수 직접 테스트

Hook 함수를 직접 호출하여 테스트할 수 있습니다:

### 3.1. 테스트용 Event JSON 생성

```sql
-- 테스트용 이벤트 생성 (실제 user_id 사용)
SELECT public.custom_access_token_hook(
  jsonb_build_object(
    'user_id', '90de7eea-c265-48bd-bacb-7d5bb6e809a4'::uuid,  -- 실제 user_id로 변경
    'claims', jsonb_build_object(
      'app_metadata', jsonb_build_object()
    )
  )
);
```

### 3.2. 결과 확인

함수가 정상적으로 실행되면:
- `app_metadata.memberships` 필드가 포함됨
- `app_metadata.app_permissions` 필드가 포함됨
- 각 필드에 올바른 값이 설정됨

### 3.3. 현재 사용자로 테스트

```sql
-- 현재 로그인한 사용자의 user_id로 테스트
SELECT public.custom_access_token_hook(
  jsonb_build_object(
    'user_id', auth.uid(),  -- 현재 인증된 사용자 ID
    'claims', jsonb_build_object(
      'app_metadata', jsonb_build_object()
    )
  )
);
```

## 4. JWT 디버깅 페이지 사용

브라우저에서 `/debug/jwt` 페이지에 접속하여:

1. **App Permissions 비교** 섹션 확인
   - JWT의 `app_permissions` 값
   - DB의 `profiles.permissions` 값
   - 두 값이 일치하는지 확인

2. **Memberships** 섹션 확인
   - 멤버십 정보가 올바르게 포함되어 있는지 확인

3. 브라우저 콘솔 확인
   - 클라이언트 사이드 로그도 확인 가능

## 5. 문제 진단 체크리스트

### Hook이 실행되지 않는 경우

- [ ] Supabase Dashboard > Authentication > Hooks에서 Hook이 등록되어 있는지 확인
- [ ] Hook Type이 **Access Token Hook**인지 확인
- [ ] 함수명이 정확히 `custom_access_token_hook`인지 확인
- [ ] 스키마가 `public`인지 확인
- [ ] 로그인 시도 후 Postgres Logs에서 Hook 실행 로그 확인

### Hook이 실행되지만 에러가 발생하는 경우

- [ ] Postgres Logs에서 에러 메시지 확인
- [ ] 함수 소유자가 테이블에 접근할 수 있는지 확인:
  ```sql
  SELECT p.proname, r.rolname as owner
  FROM pg_proc p
  JOIN pg_roles r ON p.proowner = r.oid
  WHERE p.proname = 'custom_access_token_hook';
  ```
- [ ] `profiles` 테이블에 해당 사용자의 레코드가 있는지 확인:
  ```sql
  SELECT id, permissions FROM profiles WHERE id = 'user-id-here';
  ```
- [ ] `memberships` 테이블에 해당 사용자의 레코드가 있는지 확인:
  ```sql
  SELECT * FROM memberships WHERE user_id = 'user-id-here';
  ```

### Hook이 실행되지만 app_metadata가 설정되지 않는 경우

- [ ] 함수 반환값 확인 (직접 테스트 SQL 실행)
- [ ] `jsonb_set` 로직이 올바른지 확인
- [ ] event 구조가 예상과 일치하는지 확인

## 6. 일반적인 문제 해결

### 문제: Hook이 전혀 실행되지 않음

**해결 방법**:
1. Supabase Dashboard에서 Hook 재등록
2. 함수명과 스키마 확인
3. Supabase 프로젝트 재시작 (로컬 개발 환경인 경우)

### 문제: "permission denied" 에러

**해결 방법**:
1. 함수 소유자 확인:
   ```sql
   ALTER FUNCTION public.custom_access_token_hook OWNER TO postgres;
   ```
2. 또는 함수를 `SECURITY DEFINER`로 실행되도록 확인 (이미 설정되어 있음)

### 문제: "relation does not exist" 에러

**해결 방법**:
1. 테이블이 `public` 스키마에 있는지 확인
2. 스키마 경로를 명시적으로 지정 (이미 `public.` 접두사 사용 중)

## 7. 다음 단계

문제를 진단한 후:
1. 문제 원인에 따라 적절한 수정 적용
2. 수정 후 다시 테스트
3. 로그인 및 권한 변경 시나리오로 최종 검증

