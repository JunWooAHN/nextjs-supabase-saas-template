-- Development Seed Data Script
-- Date: 2025-11-18
-- Purpose: Create sample organizations and centers for current user
-- 
-- Usage: 
--   1. Supabase Dashboard SQL Editor에서 실행
--   2. 또는 Supabase CLI: supabase db execute --file supabase/seed_dev_data.sql
--
-- Note: 현재 로그인한 사용자(auth.uid())에게 조직과 센터를 생성하고 멤버십을 추가합니다.

-- ============================================
-- STEP 1: Create Sample Organizations
-- ============================================

-- 샘플 조직 생성
INSERT INTO organizations (id, name)
VALUES 
  (gen_random_uuid(), '테스트 조직 1'),
  (gen_random_uuid(), '테스트 조직 2'),
  (gen_random_uuid(), '개발 조직')
ON CONFLICT DO NOTHING
RETURNING id, name;

-- ============================================
-- STEP 2: Create Sample Centers
-- ============================================

-- 샘플 센터 생성
INSERT INTO centers (id, name)
VALUES 
  (gen_random_uuid(), '서울 센터'),
  (gen_random_uuid(), '부산 센터')
ON CONFLICT DO NOTHING
RETURNING id, name;

-- ============================================
-- STEP 3: Get Current User ID
-- ============================================

DO $$
DECLARE
  current_user_id UUID;
  org1_id UUID;
  org2_id UUID;
  org3_id UUID;
  center1_id UUID;
  center2_id UUID;
BEGIN
  -- SQL Editor에서는 auth.uid()가 NULL이므로 profiles 테이블에서 첫 번째 사용자 가져오기
  -- 또는 특정 이메일로 사용자 찾기
  SELECT id INTO current_user_id 
  FROM profiles 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- 사용자가 없으면 에러
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found in profiles table. Please create a user first via Supabase Auth (sign up).';
  END IF;
  
  RAISE NOTICE 'Using user ID: %', current_user_id;

  -- 생성된 조직 ID 가져오기
  SELECT id INTO org1_id FROM organizations WHERE name = '테스트 조직 1' LIMIT 1;
  SELECT id INTO org2_id FROM organizations WHERE name = '테스트 조직 2' LIMIT 1;
  SELECT id INTO org3_id FROM organizations WHERE name = '개발 조직' LIMIT 1;
  
  -- 생성된 센터 ID 가져오기
  SELECT id INTO center1_id FROM centers WHERE name = '서울 센터' LIMIT 1;
  SELECT id INTO center2_id FROM centers WHERE name = '부산 센터' LIMIT 1;

  -- ============================================
  -- STEP 4: Create Memberships for Current User
  -- ============================================

  -- 조직 멤버십 생성 (ORG_OWNER 권한: 32)
  -- ORG_OWNER = 32 (1n << 5n)
  IF org1_id IS NOT NULL THEN
    INSERT INTO memberships (user_id, entity_id, entity_type, permissions)
    VALUES (current_user_id, org1_id, 1, 32)  -- ORG_OWNER
    ON CONFLICT (user_id, entity_id) DO UPDATE
      SET permissions = 32;
  END IF;

  IF org2_id IS NOT NULL THEN
    INSERT INTO memberships (user_id, entity_id, entity_type, permissions)
    VALUES (current_user_id, org2_id, 1, 32)  -- ORG_OWNER
    ON CONFLICT (user_id, entity_id) DO UPDATE
      SET permissions = 32;
  END IF;

  -- 개발 조직은 일반 멤버 권한 (ORG_VIEW: 1)
  IF org3_id IS NOT NULL THEN
    INSERT INTO memberships (user_id, entity_id, entity_type, permissions)
    VALUES (current_user_id, org3_id, 1, 1)  -- ORG_VIEW only
    ON CONFLICT (user_id, entity_id) DO UPDATE
      SET permissions = 1;
  END IF;

  -- 센터 멤버십 생성 (CENTER_OWNER 권한: 16384)
  -- CENTER_OWNER = 16384 (1n << 14n)
  IF center1_id IS NOT NULL THEN
    INSERT INTO memberships (user_id, entity_id, entity_type, permissions)
    VALUES (current_user_id, center1_id, 2, 16384)  -- CENTER_OWNER
    ON CONFLICT (user_id, entity_id) DO UPDATE
      SET permissions = 16384;
  END IF;

  IF center2_id IS NOT NULL THEN
    INSERT INTO memberships (user_id, entity_id, entity_type, permissions)
    VALUES (current_user_id, center2_id, 2, 16384)  -- CENTER_OWNER
    ON CONFLICT (user_id, entity_id) DO UPDATE
      SET permissions = 16384;
  END IF;

  RAISE NOTICE '✅ Seed data created successfully!';
  RAISE NOTICE '   User ID: %', current_user_id;
  RAISE NOTICE '   Organizations: %', (SELECT COUNT(*) FROM memberships WHERE user_id = current_user_id AND entity_type = 1);
  RAISE NOTICE '   Centers: %', (SELECT COUNT(*) FROM memberships WHERE user_id = current_user_id AND entity_type = 2);
END $$;

-- ============================================
-- STEP 5: Verify Created Data
-- ============================================

-- 현재 사용자의 멤버십 확인
-- 첫 번째 사용자의 멤버십 조회
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
WHERE m.user_id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1)
ORDER BY m.entity_type, entity_name;

-- ============================================
-- CLEANUP (Optional - 주석 해제하여 실행)
-- ============================================

/*
-- 현재 사용자의 모든 멤버십 삭제
DELETE FROM memberships WHERE user_id = auth.uid();

-- 생성된 조직/센터 삭제 (다른 사용자가 사용 중이 아닐 경우)
DELETE FROM organizations WHERE name IN ('테스트 조직 1', '테스트 조직 2', '개발 조직');
DELETE FROM centers WHERE name IN ('서울 센터', '부산 센터');
*/

