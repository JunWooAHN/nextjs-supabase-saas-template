-- Migration: Fix infinite recursion in memberships RLS policies
-- Date: 2025-11-18
-- Issue: RLS policies for memberships table cause infinite recursion
-- Solution: Remove or simplify policies that reference memberships table itself

-- ============================================
-- FIX: Remove problematic policies
-- ============================================

-- "Managers can view entity memberships" 정책 제거
-- 이 정책은 memberships 테이블을 조회하면서 memberships 테이블 자체를 참조하여 무한 재귀 발생
-- 대신 사용자는 자신의 멤버십만 조회하고, 관리자 기능은 Tier 2 (tRPC)에서 처리
DROP POLICY IF EXISTS "Managers can view entity memberships" ON memberships;

-- "Managers can update entity memberships" 정책 제거
-- 동일한 이유로 무한 재귀 발생
-- 멤버십 업데이트는 Tier 2 (tRPC)에서 처리
DROP POLICY IF EXISTS "Managers can update entity memberships" ON memberships;

-- ============================================
-- KEEP: Simple policies that don't cause recursion
-- ============================================

-- 사용자는 자신의 멤버십만 조회 가능 (재귀 없음)
-- 이미 존재하는 정책이므로 유지

-- 사용자는 자신의 멤버십만 생성 가능 (재귀 없음)
-- 이미 존재하는 정책이므로 유지

-- ============================================
-- NOTE: Manager functionality
-- ============================================
-- 관리자가 다른 멤버의 멤버십을 조회/수정하는 기능은:
-- 1. Tier 2 (tRPC)에서 처리 (서버 사이드에서 권한 체크)
-- 2. RLS 정책은 사용자 자신의 데이터만 보호하는 역할만 수행

