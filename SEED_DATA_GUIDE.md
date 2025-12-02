# 시드 데이터 생성 가이드

## 문제 상황
- 엔티티 선택기가 표시되지 않음
- 조직/센터 시드 데이터가 없어서 확인이 안됨

## 해결 방법

### 방법 1: Supabase Dashboard SQL Editor 사용 (권장)

1. **Supabase Dashboard 접속**
   - 프로젝트의 Supabase Dashboard로 이동
   - 왼쪽 메뉴에서 "SQL Editor" 클릭

2. **시드 데이터 스크립트 실행**
   - `supabase/seed_dev_data.sql` 파일의 내용을 복사
   - SQL Editor에 붙여넣기
   - **중요**: 먼저 로그인한 상태에서 실행해야 합니다 (auth.uid()가 필요)
   - "Run" 버튼 클릭

3. **결과 확인**
   - 스크립트가 성공적으로 실행되면:
     - 3개의 조직 생성 (테스트 조직 1, 테스트 조직 2, 개발 조직)
     - 2개의 센터 생성 (서울 센터, 부산 센터)
     - 현재 사용자에게 멤버십 추가

### 방법 2: Supabase CLI 사용

```bash
# Supabase CLI로 실행
supabase db execute --file supabase/seed_dev_data.sql
```

**주의**: 이 방법은 `auth.uid()`를 사용하지 않으므로 수정이 필요할 수 있습니다.

### 방법 3: 수동으로 데이터 생성

만약 SQL 스크립트가 작동하지 않는다면, 다음 단계를 수동으로 수행:

1. **현재 사용자 ID 확인**
   ```sql
   SELECT id, email FROM profiles LIMIT 1;
   ```

2. **조직 생성**
   ```sql
   INSERT INTO organizations (id, name)
   VALUES 
     (gen_random_uuid(), '테스트 조직 1'),
     (gen_random_uuid(), '테스트 조직 2')
   RETURNING id, name;
   ```

3. **센터 생성**
   ```sql
   INSERT INTO centers (id, name)
   VALUES 
     (gen_random_uuid(), '서울 센터'),
     (gen_random_uuid(), '부산 센터')
   RETURNING id, name;
   ```

4. **멤버십 추가** (위에서 얻은 ID 사용)
   ```sql
   -- 조직 멤버십 (ORG_OWNER: 32)
   INSERT INTO memberships (user_id, entity_id, entity_type, permissions)
   VALUES 
     ('YOUR_USER_ID', 'ORG_ID_1', 1, 32),
     ('YOUR_USER_ID', 'ORG_ID_2', 1, 32);
   
   -- 센터 멤버십 (CENTER_OWNER: 16384)
   INSERT INTO memberships (user_id, entity_id, entity_type, permissions)
   VALUES 
     ('YOUR_USER_ID', 'CENTER_ID_1', 2, 16384),
     ('YOUR_USER_ID', 'CENTER_ID_2', 2, 16384);
   ```

## 확인 방법

시드 데이터가 제대로 생성되었는지 확인:

```sql
-- 현재 사용자의 멤버십 확인
SELECT 
  CASE m.entity_type 
    WHEN 1 THEN '조직' 
    WHEN 2 THEN '센터' 
  END as entity_type_name,
  CASE m.entity_type 
    WHEN 1 THEN o.name 
    WHEN 2 THEN c.name 
  END as entity_name,
  m.permissions,
  CASE 
    WHEN m.entity_type = 1 AND (m.permissions & 32) <> 0 THEN '소유자'
    WHEN m.entity_type = 1 THEN '멤버'
    WHEN m.entity_type = 2 AND (m.permissions & 16384) <> 0 THEN '소유자'
    WHEN m.entity_type = 2 THEN '멤버'
  END as role
FROM memberships m
LEFT JOIN organizations o ON m.entity_type = 1 AND m.entity_id = o.id
LEFT JOIN centers c ON m.entity_type = 2 AND m.entity_id = c.id
WHERE m.user_id = auth.uid()
ORDER BY m.entity_type, entity_name;
```

## 브라우저에서 확인

시드 데이터 생성 후:

1. **대시보드 페이지** (`http://localhost:3000/dashboard`)
   - 엔티티 선택기가 표시되어야 함
   - 조직/센터 통계 카드에 숫자가 표시되어야 함
   - "조직으로 가기", "센터로 가기" 카드가 표시되어야 함

2. **엔티티 선택기 클릭**
   - 드롭다운에 조직과 센터 목록이 표시되어야 함
   - 선택 시 해당 엔티티 페이지로 이동해야 함

3. **조직/센터 페이지**
   - `/org/{orgId}` 또는 `/center/{centerId}` 페이지가 정상적으로 표시되어야 함

## 문제 해결

### 시드 데이터가 생성되지 않는 경우

1. **RLS 정책 확인**
   - `organizations`, `centers`, `memberships` 테이블의 RLS 정책 확인
   - `supabase_auth_admin` 역할이 INSERT 권한을 가지고 있는지 확인

2. **사용자 인증 확인**
   - SQL Editor에서 `SELECT auth.uid();` 실행하여 사용자 ID 확인
   - NULL이 반환되면 로그인이 필요함

3. **에러 메시지 확인**
   - SQL Editor의 에러 메시지를 확인하고 해결

### 엔티티 선택기가 여전히 표시되지 않는 경우

1. **브라우저 새로고침**
   - 데이터가 생성된 후 브라우저를 새로고침

2. **캐시 확인**
   - 브라우저 개발자 도구에서 네트워크 탭 확인
   - API 응답에서 멤버십 데이터가 포함되어 있는지 확인

3. **콘솔 에러 확인**
   - 브라우저 개발자 도구 콘솔에서 에러 확인

## 정리 (Cleanup)

테스트가 끝나면 시드 데이터를 삭제할 수 있습니다:

```sql
-- 현재 사용자의 모든 멤버십 삭제
DELETE FROM memberships WHERE user_id = auth.uid();

-- 생성된 조직/센터 삭제 (다른 사용자가 사용 중이 아닐 경우)
DELETE FROM organizations WHERE name IN ('테스트 조직 1', '테스트 조직 2', '개발 조직');
DELETE FROM centers WHERE name IN ('서울 센터', '부산 센터');
```

