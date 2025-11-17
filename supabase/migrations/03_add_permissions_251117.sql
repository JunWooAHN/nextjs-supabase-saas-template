-- Migration: Add explicit OWNER permissions for existing data
-- Date: 2025-11-17
-- Related: 
--   - docs/rules/251117_permission_system_improvement.md
--   - docs/rules/251117_schema_migration_strategy.md

-- ============================================
-- UP Migration
-- ============================================

-- This migration adds explicit OWNER permission flags to existing memberships
-- that have all permissions for their entity type (implicit OWNERs)

-- ============================================
-- ORGANIZATION OWNER PERMISSIONS
-- ============================================

-- Add ORG_OWNER (32 = 1n << 5n) to memberships that have all organization permissions
-- PERMISSIONS_SQL.ORG_VIEW = 1
-- PERMISSIONS_SQL.ORG_EDIT_SETTINGS = 2
-- PERMISSIONS_SQL.ORG_MANAGE_MEMBERS = 4
-- PERMISSIONS_SQL.ORG_VIEW_PROJECTS = 8
-- PERMISSIONS_SQL.ORG_EDIT_PROJECTS = 16
-- All org permissions combined: 1 + 2 + 4 + 8 + 16 = 31
-- PERMISSIONS_SQL.ORG_OWNER = 32

UPDATE memberships
SET permissions = permissions | 32  -- ORG_OWNER
WHERE entity_type = 1  -- ORGANIZATION
  AND (permissions & 31) = 31  -- All organization permissions present
  AND (permissions & 32) = 0;  -- ORG_OWNER not already set

-- Alternative: If ORG_MANAGE_MEMBERS (4) and ORG_EDIT_PROJECTS (16) are present,
-- consider it an implicit OWNER (more lenient approach)
-- Uncomment if needed:
-- UPDATE memberships
-- SET permissions = permissions | 32  -- ORG_OWNER
-- WHERE entity_type = 1  -- ORGANIZATION
--   AND (permissions & 4) <> 0  -- ORG_MANAGE_MEMBERS
--   AND (permissions & 16) <> 0  -- ORG_EDIT_PROJECTS
--   AND (permissions & 32) = 0;  -- ORG_OWNER not already set

-- ============================================
-- CENTER OWNER PERMISSIONS
-- ============================================

-- Add CENTER_OWNER (16384 = 1n << 14n) to memberships that have all center permissions
-- PERMISSIONS_SQL.CENTER_VIEW = 1024
-- PERMISSIONS_SQL.CENTER_EDIT_SETTINGS = 2048
-- PERMISSIONS_SQL.CENTER_MANAGE_ORGS = 4096
-- All center permissions combined: 1024 + 2048 + 4096 = 7168
-- But CENTER_IS_LAW_AGENCY (8192) is optional, so we check for core permissions
-- Core center permissions: 1024 + 2048 + 4096 = 7168
-- PERMISSIONS_SQL.CENTER_OWNER = 16384

UPDATE memberships
SET permissions = permissions | 16384  -- CENTER_OWNER
WHERE entity_type = 2  -- CENTER
  AND (permissions & 7168) = 7168  -- All core center permissions present (VIEW + EDIT_SETTINGS + MANAGE_ORGS)
  AND (permissions & 16384) = 0;  -- CENTER_OWNER not already set

-- Alternative: If CENTER_MANAGE_ORGS (4096) is present, consider it an implicit OWNER
-- Uncomment if needed:
-- UPDATE memberships
-- SET permissions = permissions | 16384  -- CENTER_OWNER
-- WHERE entity_type = 2  -- CENTER
--   AND (permissions & 4096) <> 0  -- CENTER_MANAGE_ORGS
--   AND (permissions & 16384) = 0;  -- CENTER_OWNER not already set

-- ============================================
-- VERIFICATION QUERIES (주석 처리 - 필요시 사용)
-- ============================================

-- Check how many memberships were updated
-- SELECT 
--   entity_type,
--   COUNT(*) as total_memberships,
--   COUNT(*) FILTER (WHERE (permissions & 32) <> 0) as org_owners,
--   COUNT(*) FILTER (WHERE (permissions & 16384) <> 0) as center_owners
-- FROM memberships
-- GROUP BY entity_type;

-- ============================================
-- DOWN Migration (롤백용 - 주석 처리)
-- ============================================

-- Remove explicit OWNER flags (revert to implicit)
-- UPDATE memberships
-- SET permissions = permissions & ~32  -- Remove ORG_OWNER
-- WHERE entity_type = 1
--   AND (permissions & 32) <> 0;  -- ORG_OWNER is set

-- UPDATE memberships
-- SET permissions = permissions & ~16384  -- Remove CENTER_OWNER
-- WHERE entity_type = 2
--   AND (permissions & 16384) <> 0;  -- CENTER_OWNER is set

