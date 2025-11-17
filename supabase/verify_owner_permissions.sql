-- OWNER 권한 확인 및 수동 추가 스크립트
-- Date: 2025-11-17
-- Purpose: 마이그레이션이 제대로 적용되었는지 확인하고, 필요시 수동으로 OWNER 권한 추가

-- ============================================
-- STEP 1: 현재 상태 확인
-- ============================================

SELECT 
  'Current State' as stage,
  m.entity_type,
  CASE m.entity_type 
    WHEN 1 THEN o.name 
    WHEN 2 THEN c.name 
  END as entity_name,
  m.permissions,
  -- 권한 분석
  (m.permissions & 31) as org_perms_value,
  (m.permissions & 31) = 31 as has_all_org_perms,
  (m.permissions & 32) <> 0 as has_org_owner,
  (m.permissions & 7168) as center_perms_value,
  (m.permissions & 7168) = 7168 as has_all_center_perms,
  (m.permissions & 16384) <> 0 as has_center_owner
FROM memberships m
LEFT JOIN organizations o ON m.entity_type = 1 AND m.entity_id = o.id
LEFT JOIN centers c ON m.entity_type = 2 AND m.entity_id = c.id
WHERE m.user_id = auth.uid()
ORDER BY m.entity_type, m.entity_id;

-- ============================================
-- STEP 2: 마이그레이션 수동 실행 (필요시)
-- ============================================

-- 조직 OWNER 권한 추가
UPDATE memberships
SET permissions = permissions | 32  -- ORG_OWNER
WHERE entity_type = 1  -- ORGANIZATION
  AND (permissions & 31) = 31  -- All organization permissions present
  AND (permissions & 32) = 0   -- ORG_OWNER not already set
  AND user_id = auth.uid();  -- 현재 사용자만

-- 센터 OWNER 권한 추가
UPDATE memberships
SET permissions = permissions | 16384  -- CENTER_OWNER
WHERE entity_type = 2  -- CENTER
  AND (permissions & 7168) = 7168  -- All core center permissions present
  AND (permissions & 16384) = 0    -- CENTER_OWNER not already set
  AND user_id = auth.uid();  -- 현재 사용자만

-- ============================================
-- STEP 3: 업데이트 후 확인
-- ============================================

SELECT 
  'After Update' as stage,
  m.entity_type,
  CASE m.entity_type 
    WHEN 1 THEN o.name 
    WHEN 2 THEN c.name 
  END as entity_name,
  m.permissions,
  (m.permissions & 32) <> 0 as has_org_owner,
  (m.permissions & 16384) <> 0 as has_center_owner,
  CASE 
    WHEN m.entity_type = 1 AND (m.permissions & 32) <> 0 THEN '✅ ORG_OWNER added'
    WHEN m.entity_type = 2 AND (m.permissions & 16384) <> 0 THEN '✅ CENTER_OWNER added'
    ELSE '⚠️ No OWNER permission'
  END as status
FROM memberships m
LEFT JOIN organizations o ON m.entity_type = 1 AND m.entity_id = o.id
LEFT JOIN centers c ON m.entity_type = 2 AND m.entity_id = c.id
WHERE m.user_id = auth.uid()
ORDER BY m.entity_type, m.entity_id;

-- ============================================
-- STEP 4: 업데이트 권한 확인
-- ============================================

-- 이제 업데이트 권한이 있는지 확인
SELECT 
  'Update Permissions' as test,
  o.id,
  o.name,
  m.permissions,
  (m.permissions & 2) <> 0 as has_edit_settings,
  (m.permissions & 32) <> 0 as is_owner,
  CASE 
    WHEN (m.permissions & 2) <> 0 OR (m.permissions & 32) <> 0 THEN '✅ Can update'
    ELSE '❌ Cannot update'
  END as can_update
FROM organizations o
INNER JOIN memberships m ON m.entity_id = o.id AND m.entity_type = 1
WHERE m.user_id = auth.uid();

SELECT 
  'Update Permissions' as test,
  c.id,
  c.name,
  m.permissions,
  (m.permissions & 2048) <> 0 as has_edit_settings,
  (m.permissions & 16384) <> 0 as is_owner,
  CASE 
    WHEN (m.permissions & 2048) <> 0 OR (m.permissions & 16384) <> 0 THEN '✅ Can update'
    ELSE '❌ Cannot update'
  END as can_update
FROM centers c
INNER JOIN memberships m ON m.entity_id = c.id AND m.entity_type = 2
WHERE m.user_id = auth.uid();

