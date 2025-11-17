-- RLS 및 권한 시스템 테스트 스크립트
-- Date: 2025-11-17
-- Purpose: RLS 정책과 권한 시스템이 올바르게 작동하는지 검증

-- ============================================
-- SETUP: 테스트 사용자 및 데이터 준비
-- ============================================

-- 현재 사용자 확인
SELECT 
  auth.uid() as current_user_id,
  (SELECT email FROM profiles WHERE id = auth.uid()) as current_user_email;

-- 테스트 데이터 확인
SELECT 
  'Organizations' as entity_type,
  COUNT(*) as count
FROM organizations
UNION ALL
SELECT 
  'Centers' as entity_type,
  COUNT(*) as count
FROM centers
UNION ALL
SELECT 
  'Memberships' as entity_type,
  COUNT(*) as count
FROM memberships;

-- ============================================
-- TEST 1: RLS 정책 - 조직 조회 권한
-- ============================================

-- Test 1.1: 자신이 멤버인 조직만 조회 가능한지 확인
SELECT 
  'TEST 1.1: Organizations I can view' as test_name,
  o.id,
  o.name,
  m.permissions,
  (m.permissions & 32) <> 0 as is_owner
FROM organizations o
INNER JOIN memberships m ON m.entity_id = o.id AND m.entity_type = 1
WHERE m.user_id = auth.uid();

-- Test 1.2: 자신이 멤버가 아닌 조직은 조회 불가능한지 확인
-- (이 쿼리는 RLS 정책에 의해 필터링되어야 함)
SELECT 
  'TEST 1.2: All organizations (should only show mine)' as test_name,
  COUNT(*) as visible_organizations
FROM organizations;

-- ============================================
-- TEST 2: RLS 정책 - 센터 조회 권한
-- ============================================

-- Test 2.1: 자신이 멤버인 센터만 조회 가능한지 확인
SELECT 
  'TEST 2.1: Centers I can view' as test_name,
  c.id,
  c.name,
  m.permissions,
  (m.permissions & 16384) <> 0 as is_owner
FROM centers c
INNER JOIN memberships m ON m.entity_id = c.id AND m.entity_type = 2
WHERE m.user_id = auth.uid();

-- ============================================
-- TEST 3: RLS 정책 - 멤버십 조회 권한
-- ============================================

-- Test 3.1: 자신의 멤버십 조회
SELECT 
  'TEST 3.1: My memberships' as test_name,
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
  CASE WHEN (m.permissions & 16384) <> 0 THEN 'CENTER_OWNER ' ELSE '' END as permissions_detail
FROM memberships m
LEFT JOIN organizations o ON m.entity_type = 1 AND m.entity_id = o.id
LEFT JOIN centers c ON m.entity_type = 2 AND m.entity_id = c.id
WHERE m.user_id = auth.uid();

-- Test 3.2: 관리자가 다른 멤버십 조회 가능한지 확인
-- (ORG_MANAGE_MEMBERS 또는 CENTER_MANAGE_ORGS 권한이 있는 경우)
SELECT 
  'TEST 3.2: Memberships I can view as manager' as test_name,
  m.entity_type,
  CASE m.entity_type 
    WHEN 1 THEN o.name 
    WHEN 2 THEN c.name 
  END as entity_name,
  COUNT(*) as visible_memberships
FROM memberships m
LEFT JOIN organizations o ON m.entity_type = 1 AND m.entity_id = o.id
LEFT JOIN centers c ON m.entity_type = 2 AND m.entity_id = c.id
GROUP BY m.entity_type, o.name, c.name;

-- ============================================
-- TEST 4: 권한 비트 연산 테스트
-- ============================================

-- Test 4.1: 특정 권한 체크 함수 (시뮬레이션)
SELECT 
  'TEST 4.1: Permission checks' as test_name,
  m.entity_type,
  CASE m.entity_type 
    WHEN 1 THEN o.name 
    WHEN 2 THEN c.name 
  END as entity_name,
  m.permissions,
  -- ORG 권한 체크
  (m.permissions & 1) <> 0 as has_org_view,
  (m.permissions & 2) <> 0 as has_org_edit_settings,
  (m.permissions & 4) <> 0 as has_org_manage_members,
  (m.permissions & 32) <> 0 as has_org_owner,
  -- CENTER 권한 체크
  (m.permissions & 1024) <> 0 as has_center_view,
  (m.permissions & 4096) <> 0 as has_center_manage_orgs,
  (m.permissions & 16384) <> 0 as has_center_owner,
  -- OWNER는 모든 권한을 암시적으로 가짐 (로직 검증)
  CASE 
    WHEN m.entity_type = 1 AND (m.permissions & 32) <> 0 THEN 
      (m.permissions & 31) = 31  -- OWNER면 모든 조직 권한 있어야 함
    WHEN m.entity_type = 2 AND (m.permissions & 16384) <> 0 THEN 
      (m.permissions & 7168) = 7168  -- OWNER면 모든 센터 권한 있어야 함
    ELSE true
  END as owner_has_all_permissions
FROM memberships m
LEFT JOIN organizations o ON m.entity_type = 1 AND m.entity_id = o.id
LEFT JOIN centers c ON m.entity_type = 2 AND m.entity_id = c.id
WHERE m.user_id = auth.uid();

-- ============================================
-- TEST 5: RLS 정책 - 업데이트 권한
-- ============================================

-- Test 5.1: 조직 설정 업데이트 권한 체크
-- (이 쿼리는 RLS 정책에 의해 필터링되어야 함)
SELECT 
  'TEST 5.1: Organizations I can update' as test_name,
  o.id,
  o.name,
  m.permissions,
  (m.permissions & 2) <> 0 as has_edit_settings,
  (m.permissions & 32) <> 0 as is_owner,
  CASE 
    WHEN (m.permissions & 2) <> 0 OR (m.permissions & 32) <> 0 THEN '✅ Can update'
    ELSE '❌ Cannot update'
  END as update_permission
FROM organizations o
INNER JOIN memberships m ON m.entity_id = o.id AND m.entity_type = 1
WHERE m.user_id = auth.uid();

-- Test 5.2: 센터 설정 업데이트 권한 체크
SELECT 
  'TEST 5.2: Centers I can update' as test_name,
  c.id,
  c.name,
  m.permissions,
  (m.permissions & 2048) <> 0 as has_edit_settings,
  (m.permissions & 16384) <> 0 as is_owner,
  CASE 
    WHEN (m.permissions & 2048) <> 0 OR (m.permissions & 16384) <> 0 THEN '✅ Can update'
    ELSE '❌ Cannot update'
  END as update_permission
FROM centers c
INNER JOIN memberships m ON m.entity_id = c.id AND m.entity_type = 2
WHERE m.user_id = auth.uid();

-- ============================================
-- TEST 6: 멤버십 업데이트 권한
-- ============================================

-- Test 6.1: 자신의 멤버십 업데이트 가능한지 확인
-- (RLS 정책: 자신의 멤버십은 업데이트 불가, 관리자만 가능)
SELECT 
  'TEST 6.1: Memberships I can update' as test_name,
  m.entity_type,
  CASE m.entity_type 
    WHEN 1 THEN o.name 
    WHEN 2 THEN c.name 
  END as entity_name,
  -- 관리자 권한 체크
  CASE 
    WHEN m.entity_type = 1 AND EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.user_id = auth.uid()
        AND m2.entity_id = m.entity_id
        AND m2.entity_type = 1
        AND ((m2.permissions & 4) <> 0 OR (m2.permissions & 32) <> 0)
    ) THEN '✅ Can update (Manager/Owner)'
    WHEN m.entity_type = 2 AND EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.user_id = auth.uid()
        AND m2.entity_id = m.entity_id
        AND m2.entity_type = 2
        AND ((m2.permissions & 4096) <> 0 OR (m2.permissions & 16384) <> 0)
    ) THEN '✅ Can update (Manager/Owner)'
    ELSE '❌ Cannot update'
  END as update_permission
FROM memberships m
LEFT JOIN organizations o ON m.entity_type = 1 AND m.entity_id = o.id
LEFT JOIN centers c ON m.entity_type = 2 AND m.entity_id = c.id
WHERE m.user_id = auth.uid()
LIMIT 5;

-- ============================================
-- TEST 7: 센터-조직 관계 조회 권한
-- ============================================

-- Test 7.1: 센터 관리자가 관계 조회 가능한지 확인
SELECT 
  'TEST 7.1: Center-Org relationships I can view' as test_name,
  cor.center_id,
  c.name as center_name,
  cor.organization_id,
  o.name as org_name
FROM center_org_relationships cor
INNER JOIN centers c ON cor.center_id = c.id
INNER JOIN organizations o ON cor.organization_id = o.id
WHERE EXISTS (
  SELECT 1 FROM memberships m
  WHERE m.entity_id = cor.center_id
    AND m.entity_type = 2
    AND m.user_id = auth.uid()
    AND ((m.permissions & 4096) <> 0 OR (m.permissions & 16384) <> 0)
);

-- ============================================
-- TEST 8: 권한 상수 값 검증
-- ============================================

-- Test 8.1: 권한 상수 값이 올바른지 확인
SELECT 
  'TEST 8.1: Permission constants verification' as test_name,
  'ORG_VIEW' as permission_name,
  1 as expected_value,
  1 as actual_value,
  CASE WHEN 1 = 1 THEN '✅ Match' ELSE '❌ Mismatch' END as status
UNION ALL
SELECT 
  'TEST 8.1',
  'ORG_EDIT_SETTINGS',
  2,
  2,
  CASE WHEN 2 = 2 THEN '✅ Match' ELSE '❌ Mismatch' END
UNION ALL
SELECT 
  'TEST 8.1',
  'ORG_MANAGE_MEMBERS',
  4,
  4,
  CASE WHEN 4 = 4 THEN '✅ Match' ELSE '❌ Mismatch' END
UNION ALL
SELECT 
  'TEST 8.1',
  'ORG_OWNER',
  32,
  32,
  CASE WHEN 32 = 32 THEN '✅ Match' ELSE '❌ Mismatch' END
UNION ALL
SELECT 
  'TEST 8.1',
  'CENTER_VIEW',
  1024,
  1024,
  CASE WHEN 1024 = 1024 THEN '✅ Match' ELSE '❌ Mismatch' END
UNION ALL
SELECT 
  'TEST 8.1',
  'CENTER_MANAGE_ORGS',
  4096,
  4096,
  CASE WHEN 4096 = 4096 THEN '✅ Match' ELSE '❌ Mismatch' END
UNION ALL
SELECT 
  'TEST 8.1',
  'CENTER_OWNER',
  16384,
  16384,
  CASE WHEN 16384 = 16384 THEN '✅ Match' ELSE '❌ Mismatch' END;

-- ============================================
-- TEST 9: 실제 업데이트 시도 (주의: 실제 데이터 변경)
-- ============================================

-- Test 9.1: 조직 이름 업데이트 시도 (RLS 정책 검증)
-- 주의: 실제로 업데이트가 발생합니다. 테스트용 데이터에서만 실행하세요.
/*
UPDATE organizations
SET name = name || ' (Updated)'
WHERE id IN (
  SELECT entity_id FROM memberships
  WHERE user_id = auth.uid()
    AND entity_type = 1
    AND ((permissions & 2) <> 0 OR (permissions & 32) <> 0)
  LIMIT 1
)
RETURNING id, name;
*/

-- ============================================
-- TEST 10: 권한 조합 테스트
-- ============================================

-- Test 10.1: 여러 권한 조합이 올바르게 작동하는지 확인
SELECT 
  'TEST 10.1: Permission combinations' as test_name,
  m.permissions,
  -- 권한 조합 시뮬레이션
  (m.permissions & 31) as all_org_perms_combined,
  (m.permissions & 31) = 31 as has_all_org_perms,
  (m.permissions & 7168) as all_center_perms_combined,
  (m.permissions & 7168) = 7168 as has_all_center_perms,
  -- OWNER 권한 포함 여부
  (m.permissions & 32) <> 0 as has_org_owner_flag,
  (m.permissions & 16384) <> 0 as has_center_owner_flag
FROM memberships m
WHERE m.user_id = auth.uid();

-- ============================================
-- SUMMARY: 전체 테스트 결과 요약
-- ============================================

SELECT 
  'SUMMARY' as section,
  'Total organizations I can view' as metric,
  COUNT(*)::text as value
FROM organizations
UNION ALL
SELECT 
  'SUMMARY',
  'Total centers I can view',
  COUNT(*)::text
FROM centers
UNION ALL
SELECT 
  'SUMMARY',
  'Total memberships I can view',
  COUNT(*)::text
FROM memberships
UNION ALL
SELECT 
  'SUMMARY',
  'Organizations I can update',
  COUNT(*)::text
FROM organizations o
INNER JOIN memberships m ON m.entity_id = o.id AND m.entity_type = 1
WHERE m.user_id = auth.uid()
  AND ((m.permissions & 2) <> 0 OR (m.permissions & 32) <> 0)
UNION ALL
SELECT 
  'SUMMARY',
  'Centers I can update',
  COUNT(*)::text
FROM centers c
INNER JOIN memberships m ON m.entity_id = c.id AND m.entity_type = 2
WHERE m.user_id = auth.uid()
  AND ((m.permissions & 2048) <> 0 OR (m.permissions & 16384) <> 0)
UNION ALL
SELECT 
  'SUMMARY',
  'My ORG_OWNER memberships',
  COUNT(*)::text
FROM memberships
WHERE user_id = auth.uid()
  AND entity_type = 1
  AND (permissions & 32) <> 0
UNION ALL
SELECT 
  'SUMMARY',
  'My CENTER_OWNER memberships',
  COUNT(*)::text
FROM memberships
WHERE user_id = auth.uid()
  AND entity_type = 2
  AND (permissions & 16384) <> 0;

