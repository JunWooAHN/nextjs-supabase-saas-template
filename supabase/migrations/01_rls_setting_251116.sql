-- Fix signup 500 error: Add RLS policy for system user and improve trigger function
-- Based on hypothesis document: docs/hypothesis/signup-500-error.md
-- Date: 2025-11-16
-- 
-- This migration is idempotent and can be run multiple times safely.
-- It addresses the following issues:
-- 1. Missing RLS policy for supabase_auth_admin role (prevents trigger from inserting profiles)
-- 2. Missing explicit schema reference in trigger function
-- 3. Missing NULL email handling for OAuth users

-- =============================================
-- 1. UPDATE TRIGGER FUNCTION
-- =============================================

-- Drop and recreate trigger function with improvements:
-- - Explicit schema reference (public.profiles)
-- - NULL email handling for OAuth users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.email, 
      'user_' || NEW.id::text || '@placeholder.local'
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. ADD RLS POLICY FOR SYSTEM USER
-- =============================================

-- Drop policy if it exists (for idempotency)
DROP POLICY IF EXISTS "System can insert profiles during signup" ON profiles;

-- Create RLS policy for supabase_auth_admin role
-- This allows the trigger function to insert profiles during user signup
CREATE POLICY "System can insert profiles during signup" ON profiles
  FOR INSERT 
  TO supabase_auth_admin
  WITH CHECK (true);

-- =============================================
-- 3. VERIFY TRIGGER EXISTS
-- =============================================

-- Ensure trigger exists (idempotent - won't create if already exists)
-- Note: PostgreSQL doesn't support CREATE TRIGGER IF NOT EXISTS,
-- so we check if it exists first using DO block
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON POLICY "System can insert profiles during signup" ON profiles IS 
  'Allows supabase_auth_admin role to insert profiles during user signup. This is required for the handle_new_user() trigger function to work correctly when RLS is enabled on the profiles table.';

COMMENT ON FUNCTION handle_new_user() IS 
  'Trigger function that automatically creates a profile when a new user signs up. Uses explicit schema reference (public.profiles) and handles NULL email cases for OAuth providers that may not provide email addresses.';

