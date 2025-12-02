-- Fix infinite recursion in memberships RLS policies
-- Run this in Supabase Dashboard SQL Editor

-- ============================================
-- FIX: Remove problematic policies that cause infinite recursion
-- ============================================

-- "Managers can view entity memberships" 정책 제거
-- 이 정책은 memberships 테이블을 조회하면서 memberships 테이블 자체를 참조하여 무한 재귀 발생
DROP POLICY IF EXISTS "Managers can view entity memberships" ON memberships;

-- "Managers can update entity memberships" 정책 제거
-- 동일한 이유로 무한 재귀 발생
DROP POLICY IF EXISTS "Managers can update entity memberships" ON memberships;

-- ============================================
-- Verify: Check remaining policies
-- ============================================

-- 남아있는 memberships 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'memberships'
ORDER BY policyname;

-- ============================================
-- Expected Result
-- ============================================
-- 다음 정책만 남아있어야 함:
-- 1. "Users can view own memberships" - 사용자는 자신의 멤버십만 조회
-- 2. "Users can insert own memberships" - 사용자는 자신의 멤버십만 생성

