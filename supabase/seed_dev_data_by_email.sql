-- Development Seed Data Script (By Email)
-- Date: 2025-11-18
-- Purpose: Create sample organizations and centers for a specific user by email
-- 
-- Usage: 
--   1. 아래의 'YOUR_EMAIL@example.com'을 실제 이메일로 변경
--   2. Supabase Dashboard SQL Editor에서 실행
--
-- Note: 이메일로 사용자를 찾아서 시드 데이터를 생성합니다.

-- ============================================
-- CONFIGURATION: 여기에 이메일 입력
-- ============================================

DO $$
DECLARE
  target_email TEXT := 'YOUR_EMAIL@example.com';  -- ⚠️ 여기에 실제 이메일 입력
  current_user_id UUID;
  org1_id UUID;
  org2_id UUID;
  org3_id UUID;
  center1_id UUID;
  center2_id UUID;
BEGIN
  -- ============================================
  -- STEP 1: Find User by Email
  -- ============================================
  
  SELECT id INTO current_user_id 
  FROM profiles 
  WHERE email = target_email;
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please check the email address or create the user first.', target_email;
  END IF;
  
  RAISE NOTICE 'Found user: % (ID: %)', target_email, current_user_id;

  -- ============================================
  -- STEP 2: Create Sample Organizations
  -- ============================================

  -- 샘플 조직 생성
  INSERT INTO organizations (id, name)
  VALUES 
    (gen_random_uuid(), '테스트 조직 1'),
    (gen_random_uuid(), '테스트 조직 2'),
    (gen_random_uuid(), '개발 조직')
  ON CONFLICT DO NOTHING
  RETURNING id INTO org1_id;
  
  SELECT id INTO org1_id FROM organizations WHERE name = '테스트 조직 1' LIMIT 1;
  SELECT id INTO org2_id FROM organizations WHERE name = '테스트 조직 2' LIMIT 1;
  SELECT id INTO org3_id FROM organizations WHERE name = '개발 조직' LIMIT 1;

  -- ============================================
  -- STEP 3: Create Sample Centers
  -- ============================================

  -- 샘플 센터 생성
  INSERT INTO centers (id, name)
  VALUES 
    (gen_random_uuid(), '서울 센터'),
    (gen_random_uuid(), '부산 센터')
  ON CONFLICT DO NOTHING;
  
  SELECT id INTO center1_id FROM centers WHERE name = '서울 센터' LIMIT 1;
  SELECT id INTO center2_id FROM centers WHERE name = '부산 센터' LIMIT 1;

  -- ============================================
  -- STEP 4: Create Memberships for User
  -- ============================================

  -- 조직 멤버십 생성 (ORG_OWNER 권한: 32)
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
  RAISE NOTICE '   User: %', target_email;
  RAISE NOTICE '   User ID: %', current_user_id;
  RAISE NOTICE '   Organizations: %', (SELECT COUNT(*) FROM memberships WHERE user_id = current_user_id AND entity_type = 1);
  RAISE NOTICE '   Centers: %', (SELECT COUNT(*) FROM memberships WHERE user_id = current_user_id AND entity_type = 2);
END $$;

-- ============================================
-- Verify Created Data
-- ============================================

-- 생성된 멤버십 확인 (이메일로 조회)
SELECT 
  p.email,
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
JOIN profiles p ON m.user_id = p.id
LEFT JOIN organizations o ON m.entity_type = 1 AND m.entity_id = o.id
LEFT JOIN centers c ON m.entity_type = 2 AND m.entity_id = c.id
WHERE p.email = 'YOUR_EMAIL@example.com'  -- ⚠️ 여기에 실제 이메일 입력
ORDER BY m.entity_type, entity_name;

