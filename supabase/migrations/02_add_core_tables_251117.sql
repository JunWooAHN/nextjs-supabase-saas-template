-- Migration: Add core tables for prove-geo-web-app v5.1
-- Date: 2025-11-17
-- Related: 
--   - docs/todo-hypothesis/251117_todo01_database_schema.md
--   - docs/rules/251117_permission_system_improvement.md
--   - docs/rules/5.1.md

-- ============================================
-- UP Migration
-- ============================================

-- Enable necessary extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CORE ENTITY TABLES
-- ============================================

-- Organizations table (조직/테넌트)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Centers table (센터)
CREATE TABLE IF NOT EXISTS centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MEMBERSHIPS TABLE (핵심 멤버십 테이블)
-- ============================================

-- Memberships table
-- 권한 비트 정의는 lib/permissions.ts의 PERMISSIONS_SQL 참조
-- ORG_OWNER: 32 (1n << 5n)
-- CENTER_OWNER: 16384 (1n << 14n)
CREATE TABLE IF NOT EXISTS memberships (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL, -- organizations.id 또는 centers.id 참조
  entity_type SMALLINT NOT NULL CHECK (entity_type IN (1, 2)), -- 1=ORG, 2=CENTER
  permissions BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, entity_id)
);

-- ============================================
-- RELATIONSHIP TABLES
-- ============================================

-- Center-Organization relationships (N:M)
CREATE TABLE IF NOT EXISTS center_org_relationships (
  center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (center_id, organization_id)
);

-- ============================================
-- UPDATE PROFILES TABLE
-- ============================================

-- Add permissions column to profiles table
-- IS_APP_MANAGER: 1n << 60n (권한 시스템 개선안 참조)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS permissions BIGINT NOT NULL DEFAULT 0;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Memberships indexes
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_entity_id ON memberships(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_memberships_user_entity ON memberships(user_id, entity_id, entity_type);

-- Center-Organization relationships indexes
CREATE INDEX IF NOT EXISTS idx_center_org_center_id ON center_org_relationships(center_id);
CREATE INDEX IF NOT EXISTS idx_center_org_org_id ON center_org_relationships(organization_id);
CREATE INDEX IF NOT EXISTS idx_center_org_both ON center_org_relationships(center_id, organization_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE center_org_relationships ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ORGANIZATIONS RLS POLICIES
-- ============================================

-- Users can view organizations they are members of
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.entity_id = organizations.id
        AND memberships.entity_type = 1
        AND memberships.user_id = (SELECT auth.uid())
    )
  );

-- Managers/Owners can update organization settings
-- PERMISSIONS_SQL.ORG_EDIT_SETTINGS = 2
-- PERMISSIONS_SQL.ORG_OWNER = 32
DROP POLICY IF EXISTS "Managers can update organization settings" ON organizations;
CREATE POLICY "Managers can update organization settings" ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.entity_id = organizations.id
        AND memberships.entity_type = 1
        AND memberships.user_id = (SELECT auth.uid())
        AND (
          (memberships.permissions & 2) <> 0  -- ORG_EDIT_SETTINGS
          OR (memberships.permissions & 32) <> 0  -- ORG_OWNER
        )
    )
  );

-- ============================================
-- CENTERS RLS POLICIES
-- ============================================

-- Users can view centers they are members of
DROP POLICY IF EXISTS "Users can view centers they belong to" ON centers;
CREATE POLICY "Users can view centers they belong to" ON centers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.entity_id = centers.id
        AND memberships.entity_type = 2
        AND memberships.user_id = (SELECT auth.uid())
    )
  );

-- Managers/Owners can update center settings
-- PERMISSIONS_SQL.CENTER_EDIT_SETTINGS = 2048
-- PERMISSIONS_SQL.CENTER_OWNER = 16384
DROP POLICY IF EXISTS "Managers can update center settings" ON centers;
CREATE POLICY "Managers can update center settings" ON centers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.entity_id = centers.id
        AND memberships.entity_type = 2
        AND memberships.user_id = (SELECT auth.uid())
        AND (
          (memberships.permissions & 2048) <> 0  -- CENTER_EDIT_SETTINGS
          OR (memberships.permissions & 16384) <> 0  -- CENTER_OWNER
        )
    )
  );

-- ============================================
-- MEMBERSHIPS RLS POLICIES
-- ============================================

-- Users can view their own memberships
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;
CREATE POLICY "Users can view own memberships" ON memberships
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Managers can view memberships for entities they manage
-- PERMISSIONS_SQL.ORG_MANAGE_MEMBERS = 4
-- PERMISSIONS_SQL.CENTER_MANAGE_ORGS = 4096
DROP POLICY IF EXISTS "Managers can view entity memberships" ON memberships;
CREATE POLICY "Managers can view entity memberships" ON memberships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.entity_id = memberships.entity_id
        AND m.entity_type = memberships.entity_type
        AND (
          (m.entity_type = 1 AND (m.permissions & 4) <> 0)  -- ORG_MANAGE_MEMBERS
          OR (m.entity_type = 1 AND (m.permissions & 32) <> 0)  -- ORG_OWNER
          OR (m.entity_type = 2 AND (m.permissions & 4096) <> 0)  -- CENTER_MANAGE_ORGS
          OR (m.entity_type = 2 AND (m.permissions & 16384) <> 0)  -- CENTER_OWNER
        )
    )
  );

-- Users can insert their own memberships (for initial creation)
-- Note: 실제로는 관리자가 초대하는 방식이므로 제한적일 수 있음
DROP POLICY IF EXISTS "Users can insert own memberships" ON memberships;
CREATE POLICY "Users can insert own memberships" ON memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Managers can update memberships for entities they manage
DROP POLICY IF EXISTS "Managers can update entity memberships" ON memberships;
CREATE POLICY "Managers can update entity memberships" ON memberships
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = (SELECT auth.uid())
        AND m.entity_id = memberships.entity_id
        AND m.entity_type = memberships.entity_type
        AND (
          (m.entity_type = 1 AND (m.permissions & 4) <> 0)  -- ORG_MANAGE_MEMBERS
          OR (m.entity_type = 1 AND (m.permissions & 32) <> 0)  -- ORG_OWNER
          OR (m.entity_type = 2 AND (m.permissions & 4096) <> 0)  -- CENTER_MANAGE_ORGS
          OR (m.entity_type = 2 AND (m.permissions & 16384) <> 0)  -- CENTER_OWNER
        )
    )
  );

-- ============================================
-- CENTER_ORG_RELATIONSHIPS RLS POLICIES
-- ============================================

-- Center managers can view relationships for their centers
-- PERMISSIONS_SQL.CENTER_MANAGE_ORGS = 4096
DROP POLICY IF EXISTS "Center managers can view relationships" ON center_org_relationships;
CREATE POLICY "Center managers can view relationships" ON center_org_relationships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.entity_id = center_org_relationships.center_id
        AND memberships.entity_type = 2
        AND memberships.user_id = (SELECT auth.uid())
        AND (
          (memberships.permissions & 4096) <> 0  -- CENTER_MANAGE_ORGS
          OR (memberships.permissions & 16384) <> 0  -- CENTER_OWNER
        )
    )
  );

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Use existing update_updated_at_column() function from 00_initial_schema.sql
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_centers_updated_at ON centers;
CREATE TRIGGER update_centers_updated_at
  BEFORE UPDATE ON centers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_memberships_updated_at ON memberships;
CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE organizations IS 'Organizations/Tenants in the system';
COMMENT ON TABLE centers IS 'Centers that can manage multiple organizations';
COMMENT ON TABLE memberships IS 'User memberships to organizations or centers with permission bits';
COMMENT ON TABLE center_org_relationships IS 'N:M relationship between centers and organizations';

COMMENT ON COLUMN memberships.entity_type IS '1 = ORGANIZATION, 2 = CENTER';
COMMENT ON COLUMN memberships.permissions IS 'BigInt bitfield for permissions. See lib/permissions.ts PERMISSIONS_SQL for values';
COMMENT ON COLUMN profiles.permissions IS 'BigInt bitfield for app-level permissions. IS_APP_MANAGER = 1n << 60n';

-- ============================================
-- DOWN Migration (롤백용 - 주석 처리)
-- ============================================

-- DROP TRIGGERS
-- DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
-- DROP TRIGGER IF EXISTS update_centers_updated_at ON centers;
-- DROP TRIGGER IF EXISTS update_memberships_updated_at ON memberships;

-- DROP POLICIES
-- DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
-- DROP POLICY IF EXISTS "Managers can update organization settings" ON organizations;
-- DROP POLICY IF EXISTS "Users can view centers they belong to" ON centers;
-- DROP POLICY IF EXISTS "Managers can update center settings" ON centers;
-- DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;
-- DROP POLICY IF EXISTS "Managers can view entity memberships" ON memberships;
-- DROP POLICY IF EXISTS "Users can insert own memberships" ON memberships;
-- DROP POLICY IF EXISTS "Managers can update entity memberships" ON memberships;
-- DROP POLICY IF EXISTS "Center managers can view relationships" ON center_org_relationships;

-- DROP TABLES (순서 중요: 외래키 참조 순서 역순)
-- DROP TABLE IF EXISTS center_org_relationships;
-- DROP TABLE IF EXISTS memberships;
-- DROP TABLE IF EXISTS centers;
-- DROP TABLE IF EXISTS organizations;

-- REMOVE COLUMN FROM PROFILES
-- ALTER TABLE profiles DROP COLUMN IF EXISTS permissions;

