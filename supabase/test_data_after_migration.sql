-- Test Data Script for Migration 03_add_permissions_251117.sql
-- Date: 2025-11-17
-- Purpose: Create test data and verify OWNER permission migration

-- ============================================
-- STEP 1: Create Test Organizations and Centers
-- ============================================

-- Create test organizations
INSERT INTO organizations (id, name)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Test Organization 1'),
  ('00000000-0000-0000-0000-000000000002', 'Test Organization 2')
ON CONFLICT (id) DO NOTHING;

-- Create test centers
INSERT INTO centers (id, name)
VALUES 
  ('00000000-0000-0000-0000-000000000010', 'Test Center 1'),
  ('00000000-0000-0000-0000-000000000011', 'Test Center 2')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 2: Get or Create Test User
-- ============================================

-- Get first user from profiles (or use a specific user ID)
-- Replace with actual user_id if needed
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get first user from profiles
  SELECT id INTO test_user_id FROM profiles LIMIT 1;
  
  -- If no user exists, you'll need to create one via auth first
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found in profiles table. Please create a user first via Supabase Auth.';
  END IF;

  -- ============================================
  -- STEP 3: Create Test Memberships (Before Migration)
  -- ============================================

  -- Test Case 1: Organization membership with ALL permissions (should get ORG_OWNER)
  -- Permissions: 1 + 2 + 4 + 8 + 16 = 31 (all org permissions)
  INSERT INTO memberships (user_id, entity_id, entity_type, permissions)
  VALUES 
    (test_user_id, '00000000-0000-0000-0000-000000000001', 1, 31)
  ON CONFLICT (user_id, entity_id) DO UPDATE
    SET permissions = 31;

  -- Test Case 2: Organization membership with partial permissions (should NOT get ORG_OWNER)
  -- Permissions: 1 + 2 = 3 (only VIEW and EDIT_SETTINGS)
  INSERT INTO memberships (user_id, entity_id, entity_type, permissions)
  VALUES 
    (test_user_id, '00000000-0000-0000-0000-000000000002', 1, 3)
  ON CONFLICT (user_id, entity_id) DO UPDATE
    SET permissions = 3;

  -- Test Case 3: Center membership with ALL core permissions (should get CENTER_OWNER)
  -- Permissions: 1024 + 2048 + 4096 = 7168 (all core center permissions)
  INSERT INTO memberships (user_id, entity_id, entity_type, permissions)
  VALUES 
    (test_user_id, '00000000-0000-0000-0000-000000000010', 2, 7168)
  ON CONFLICT (user_id, entity_id) DO UPDATE
    SET permissions = 7168;

  -- Test Case 4: Center membership with partial permissions (should NOT get CENTER_OWNER)
  -- Permissions: 1024 (only VIEW)
  INSERT INTO memberships (user_id, entity_id, entity_type, permissions)
  VALUES 
    (test_user_id, '00000000-0000-0000-0000-000000000011', 2, 1024)
  ON CONFLICT (user_id, entity_id) DO UPDATE
    SET permissions = 1024;

  -- ============================================
  -- STEP 4: Show Current State (Before Migration)
  -- ============================================

  RAISE NOTICE '=== BEFORE MIGRATION ===';
  RAISE NOTICE 'User ID: %', test_user_id;
END $$;

-- ============================================
-- STEP 5: View Current Memberships (Before Migration)
-- ============================================

SELECT 
  'BEFORE MIGRATION' as stage,
  m.entity_type,
  CASE m.entity_type 
    WHEN 1 THEN o.name 
    WHEN 2 THEN c.name 
  END as entity_name,
  m.permissions,
  -- Permission breakdown
  CASE WHEN (m.permissions & 1) <> 0 THEN 'ORG_VIEW ' ELSE '' END ||
  CASE WHEN (m.permissions & 2) <> 0 THEN 'ORG_EDIT_SETTINGS ' ELSE '' END ||
  CASE WHEN (m.permissions & 4) <> 0 THEN 'ORG_MANAGE_MEMBERS ' ELSE '' END ||
  CASE WHEN (m.permissions & 8) <> 0 THEN 'ORG_VIEW_PROJECTS ' ELSE '' END ||
  CASE WHEN (m.permissions & 16) <> 0 THEN 'ORG_EDIT_PROJECTS ' ELSE '' END ||
  CASE WHEN (m.permissions & 32) <> 0 THEN 'ORG_OWNER ' ELSE '' END ||
  CASE WHEN (m.permissions & 1024) <> 0 THEN 'CENTER_VIEW ' ELSE '' END ||
  CASE WHEN (m.permissions & 2048) <> 0 THEN 'CENTER_EDIT_SETTINGS ' ELSE '' END ||
  CASE WHEN (m.permissions & 4096) <> 0 THEN 'CENTER_MANAGE_ORGS ' ELSE '' END ||
  CASE WHEN (m.permissions & 16384) <> 0 THEN 'CENTER_OWNER ' ELSE '' END as permissions_detail,
  (m.permissions & 32) <> 0 as has_org_owner,
  (m.permissions & 16384) <> 0 as has_center_owner
FROM memberships m
LEFT JOIN organizations o ON m.entity_type = 1 AND m.entity_id = o.id
LEFT JOIN centers c ON m.entity_type = 2 AND m.entity_id = c.id
ORDER BY m.entity_type, m.entity_id;

-- ============================================
-- STEP 6: Run Migration Manually (if not already applied)
-- ============================================

-- Uncomment to run migration manually:
/*
-- Add ORG_OWNER to memberships with all org permissions
UPDATE memberships
SET permissions = permissions | 32  -- ORG_OWNER
WHERE entity_type = 1  -- ORGANIZATION
  AND (permissions & 31) = 31  -- All organization permissions present
  AND (permissions & 32) = 0;  -- ORG_OWNER not already set

-- Add CENTER_OWNER to memberships with all center permissions
UPDATE memberships
SET permissions = permissions | 16384  -- CENTER_OWNER
WHERE entity_type = 2  -- CENTER
  AND (permissions & 7168) = 7168  -- All core center permissions present
  AND (permissions & 16384) = 0;  -- CENTER_OWNER not already set
*/

-- ============================================
-- STEP 7: View Memberships After Migration
-- ============================================

SELECT 
  'AFTER MIGRATION' as stage,
  m.entity_type,
  CASE m.entity_type 
    WHEN 1 THEN o.name 
    WHEN 2 THEN c.name 
  END as entity_name,
  m.permissions,
  -- Permission breakdown
  CASE WHEN (m.permissions & 1) <> 0 THEN 'ORG_VIEW ' ELSE '' END ||
  CASE WHEN (m.permissions & 2) <> 0 THEN 'ORG_EDIT_SETTINGS ' ELSE '' END ||
  CASE WHEN (m.permissions & 4) <> 0 THEN 'ORG_MANAGE_MEMBERS ' ELSE '' END ||
  CASE WHEN (m.permissions & 8) <> 0 THEN 'ORG_VIEW_PROJECTS ' ELSE '' END ||
  CASE WHEN (m.permissions & 16) <> 0 THEN 'ORG_EDIT_PROJECTS ' ELSE '' END ||
  CASE WHEN (m.permissions & 32) <> 0 THEN 'ORG_OWNER ' ELSE '' END ||
  CASE WHEN (m.permissions & 1024) <> 0 THEN 'CENTER_VIEW ' ELSE '' END ||
  CASE WHEN (m.permissions & 2048) <> 0 THEN 'CENTER_EDIT_SETTINGS ' ELSE '' END ||
  CASE WHEN (m.permissions & 4096) <> 0 THEN 'CENTER_MANAGE_ORGS ' ELSE '' END ||
  CASE WHEN (m.permissions & 16384) <> 0 THEN 'CENTER_OWNER ' ELSE '' END as permissions_detail,
  (m.permissions & 32) <> 0 as has_org_owner,
  (m.permissions & 16384) <> 0 as has_center_owner,
  -- Migration verification
  CASE 
    WHEN m.entity_type = 1 AND (m.permissions & 31) = 31 AND (m.permissions & 32) <> 0 THEN '✅ OWNER added correctly'
    WHEN m.entity_type = 1 AND (m.permissions & 31) = 31 AND (m.permissions & 32) = 0 THEN '❌ OWNER should be added'
    WHEN m.entity_type = 1 AND (m.permissions & 31) <> 31 AND (m.permissions & 32) = 0 THEN '✅ No OWNER (correct)'
    WHEN m.entity_type = 2 AND (m.permissions & 7168) = 7168 AND (m.permissions & 16384) <> 0 THEN '✅ OWNER added correctly'
    WHEN m.entity_type = 2 AND (m.permissions & 7168) = 7168 AND (m.permissions & 16384) = 0 THEN '❌ OWNER should be added'
    WHEN m.entity_type = 2 AND (m.permissions & 7168) <> 7168 AND (m.permissions & 16384) = 0 THEN '✅ No OWNER (correct)'
    ELSE '⚠️ Unknown state'
  END as migration_status
FROM memberships m
LEFT JOIN organizations o ON m.entity_type = 1 AND m.entity_id = o.id
LEFT JOIN centers c ON m.entity_type = 2 AND m.entity_id = c.id
ORDER BY m.entity_type, m.entity_id;

-- ============================================
-- STEP 8: Summary Statistics
-- ============================================

SELECT 
  entity_type,
  COUNT(*) as total_memberships,
  COUNT(*) FILTER (WHERE (permissions & 31) = 31) as orgs_with_all_perms,
  COUNT(*) FILTER (WHERE (permissions & 32) <> 0) as org_owners,
  COUNT(*) FILTER (WHERE (permissions & 7168) = 7168) as centers_with_all_perms,
  COUNT(*) FILTER (WHERE (permissions & 16384) <> 0) as center_owners
FROM memberships
GROUP BY entity_type;

-- ============================================
-- CLEANUP (Optional - 주석 해제하여 실행)
-- ============================================

/*
-- Clean up test data
DELETE FROM memberships 
WHERE entity_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011'
);

DELETE FROM organizations 
WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

DELETE FROM centers 
WHERE id IN (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011'
);
*/

