-- Migration: Add work time settings and force clockout at midnight for organizations and centers
-- Date: 2025-11-18
-- Related: 
--   - docs/data-scheme/tables/organizations.md
--   - docs/data-scheme/tables/centers.md
--   - docs/data-scheme/tables/attendance_events.md

-- ============================================
-- UP Migration
-- ============================================

-- Add work time settings columns to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS work_start_time TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS work_end_time TIME DEFAULT '18:00:00',
ADD COLUMN IF NOT EXISTS timezone VARCHAR DEFAULT 'Asia/Seoul',
ADD COLUMN IF NOT EXISTS force_clockout_at_midnight BOOLEAN DEFAULT false;

-- Add work time settings columns to centers table
ALTER TABLE centers
ADD COLUMN IF NOT EXISTS work_start_time TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS work_end_time TIME DEFAULT '18:00:00',
ADD COLUMN IF NOT EXISTS timezone VARCHAR DEFAULT 'Asia/Seoul',
ADD COLUMN IF NOT EXISTS force_clockout_at_midnight BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN organizations.work_start_time IS '기본 출근 시간 (기본값: 09:00:00)';
COMMENT ON COLUMN organizations.work_end_time IS '기본 퇴근 시간 (기본값: 18:00:00)';
COMMENT ON COLUMN organizations.timezone IS '조직 타임존 (기본값: Asia/Seoul)';
COMMENT ON COLUMN organizations.force_clockout_at_midnight IS '자정(23:59:59) 강제 퇴근 여부. true: 자정을 넘기면 자동 퇴근 처리 (심야 불가), false: 자정을 넘겨도 출근 상태 유지 (심야 가능)';

COMMENT ON COLUMN centers.work_start_time IS '기본 출근 시간 (기본값: 09:00:00)';
COMMENT ON COLUMN centers.work_end_time IS '기본 퇴근 시간 (기본값: 18:00:00)';
COMMENT ON COLUMN centers.timezone IS '센터 타임존 (기본값: Asia/Seoul)';
COMMENT ON COLUMN centers.force_clockout_at_midnight IS '자정(23:59:59) 강제 퇴근 여부. true: 자정을 넘기면 자동 퇴근 처리 (심야 불가), false: 자정을 넘겨도 출근 상태 유지 (심야 가능)';

-- ============================================
-- DOWN Migration (롤백용)
-- ============================================

-- Remove work time settings columns from organizations table
-- ALTER TABLE organizations
-- DROP COLUMN IF EXISTS force_clockout_at_midnight,
-- DROP COLUMN IF EXISTS timezone,
-- DROP COLUMN IF EXISTS work_end_time,
-- DROP COLUMN IF EXISTS work_start_time;

-- Remove work time settings columns from centers table
-- ALTER TABLE centers
-- DROP COLUMN IF EXISTS force_clockout_at_midnight,
-- DROP COLUMN IF EXISTS timezone,
-- DROP COLUMN IF EXISTS work_end_time,
-- DROP COLUMN IF EXISTS work_start_time;

