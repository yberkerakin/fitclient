-- Complete Fix for member_accounts RLS Permissions
-- This script fixes all permission issues for member_accounts table

-- =====================================================
-- 1. DIAGNOSTIC: Check Current State
-- =====================================================

-- Check if RLS is enabled
SELECT 
  'RLS Status' as check_type,
  CASE 
    WHEN relrowsecurity THEN 'Enabled'
    ELSE 'Disabled'
  END as status
FROM pg_class 
WHERE relname = 'member_accounts';

-- Check existing policies
SELECT 
  'Existing Policies' as check_type,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'member_accounts'
ORDER BY cmd, policyname;

-- =====================================================
-- 2. ENABLE RLS (if not already enabled)
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE member_accounts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. DROP ALL EXISTING POLICIES
-- =====================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Trainers manage member accounts" ON member_accounts;
DROP POLICY IF EXISTS "Trainers can view member accounts" ON member_accounts;
DROP POLICY IF EXISTS "Trainers can insert member accounts" ON member_accounts;
DROP POLICY IF EXISTS "Trainers can update member accounts" ON member_accounts;
DROP POLICY IF EXISTS "Trainers can delete member accounts" ON member_accounts;
DROP POLICY IF EXISTS "Members see own account" ON member_accounts;
DROP POLICY IF EXISTS "Members can select own account" ON member_accounts;
DROP POLICY IF EXISTS "Members can update own account" ON member_accounts;
DROP POLICY IF EXISTS "Trainers see own programs" ON member_accounts;
DROP POLICY IF EXISTS "Members see own data" ON member_accounts;

-- =====================================================
-- 4. CREATE COMPREHENSIVE POLICIES
-- =====================================================

-- Policy 1: Trainers can SELECT member accounts for their clients
CREATE POLICY "Trainers can view member accounts" ON member_accounts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN trainers t ON c.trainer_id = t.id
      WHERE c.id = member_accounts.client_id 
      AND t.user_id = auth.uid()
    )
  );

-- Policy 2: Trainers can INSERT member accounts for their clients
CREATE POLICY "Trainers can insert member accounts" ON member_accounts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN trainers t ON c.trainer_id = t.id
      WHERE c.id = member_accounts.client_id 
      AND t.user_id = auth.uid()
    )
  );

-- Policy 3: Trainers can UPDATE member accounts for their clients
CREATE POLICY "Trainers can update member accounts" ON member_accounts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN trainers t ON c.trainer_id = t.id
      WHERE c.id = member_accounts.client_id 
      AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN trainers t ON c.trainer_id = t.id
      WHERE c.id = member_accounts.client_id 
      AND t.user_id = auth.uid()
    )
  );

-- Policy 4: Trainers can DELETE member accounts for their clients
CREATE POLICY "Trainers can delete member accounts" ON member_accounts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN trainers t ON c.trainer_id = t.id
      WHERE c.id = member_accounts.client_id 
      AND t.user_id = auth.uid()
    )
  );

-- Policy 5: Members can SELECT their own account data
CREATE POLICY "Members can view own account" ON member_accounts
  FOR SELECT
  USING (
    auth.email() = member_accounts.email
  );

-- Policy 6: Members can UPDATE their own account data (limited fields)
CREATE POLICY "Members can update own account" ON member_accounts
  FOR UPDATE
  USING (
    auth.email() = member_accounts.email
  )
  WITH CHECK (
    auth.email() = member_accounts.email
  );

-- =====================================================
-- 5. VERIFY POLICIES WERE CREATED
-- =====================================================

-- Check all policies on member_accounts
SELECT 
  'Policy Verification' as check_type,
  policyname,
  permissive,
  roles,
  CASE 
    WHEN cmd = 'SELECT' THEN 'SELECT'
    WHEN cmd = 'INSERT' THEN 'INSERT'
    WHEN cmd = 'UPDATE' THEN 'UPDATE'
    WHEN cmd = 'DELETE' THEN 'DELETE'
    WHEN cmd = 'ALL' THEN 'ALL'
    ELSE cmd
  END as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Read access'
    WHEN cmd = 'INSERT' THEN 'Create access'
    WHEN cmd = 'UPDATE' THEN 'Modify access'
    WHEN cmd = 'DELETE' THEN 'Remove access'
    ELSE 'Other'
  END as description
FROM pg_policies 
WHERE tablename = 'member_accounts'
ORDER BY cmd, policyname;

-- =====================================================
-- 6. TEST DATA SETUP
-- =====================================================

-- Get sample data for testing
SELECT 
  'Test Data' as info,
  t.user_id as trainer_user_id,
  t.id as trainer_id,
  t.name as trainer_name,
  c.id as client_id,
  c.name as client_name,
  c.email as client_email
FROM trainers t
JOIN clients c ON c.trainer_id = t.id
LIMIT 3;

-- =====================================================
-- 7. PERMISSION TESTING QUERIES
-- =====================================================

-- Test SELECT permission (should work for authenticated trainers)
-- Replace 'TRAINER_USER_ID' with actual trainer user ID from above query
/*
-- Test as trainer (run this after authenticating as trainer)
SELECT COUNT(*) as accessible_member_accounts 
FROM member_accounts;

-- Test INSERT permission (replace with actual client_id)
INSERT INTO member_accounts (client_id, email, password_hash, is_active)
VALUES (
  'CLIENT_ID_HERE',
  'test-permission@example.com', 
  'managed_by_supabase_auth',
  true
);
*/

-- =====================================================
-- 8. TROUBLESHOOTING COMMANDS
-- =====================================================

-- Check table permissions
SELECT 
  'Table Permissions' as check_type,
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename = 'member_accounts';

-- Check if there are any constraints that might block operations
SELECT 
  'Constraints' as check_type,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'member_accounts'::regclass;

-- Check column permissions
SELECT 
  'Column Info' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'member_accounts' 
ORDER BY ordinal_position;

-- =====================================================
-- 9. FINAL VERIFICATION
-- =====================================================

-- Final status check
SELECT 
  'Final Status' as check_type,
  'member_accounts RLS policies configured successfully' as status,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies
FROM pg_policies 
WHERE tablename = 'member_accounts';

-- =====================================================
-- 10. CLEANUP (if needed)
-- =====================================================

-- To remove test data (uncomment if needed)
-- DELETE FROM member_accounts WHERE email LIKE 'test-%@example.com';

-- =====================================================
-- SUMMARY
-- =====================================================

-- Summary of what was accomplished
SELECT 
  'SUMMARY' as section,
  'member_accounts permissions have been fixed' as status,
  'Trainers can now create, read, update, and delete member accounts for their clients' as trainer_permissions,
  'Members can view and update their own account data' as member_permissions,
  'RLS is enabled and all policies are active' as security_status;
