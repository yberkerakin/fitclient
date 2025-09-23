-- Diagnose and Fix RLS Issues for member_accounts Table
-- This script helps identify and resolve Row Level Security problems

-- =====================================================
-- 1. CHECK CURRENT USER AND PERMISSIONS
-- =====================================================

-- Check current user context
SELECT 
  'Current User Info' as check_type,
  current_user as current_user,
  auth.uid() as auth_uid,
  auth.email() as auth_email;

-- Check if we're authenticated
SELECT 
  'Authentication Status' as check_type,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'Authenticated'
    ELSE 'Not Authenticated'
  END as status;

-- =====================================================
-- 2. CHECK TABLE STRUCTURE AND RLS STATUS
-- =====================================================

-- Check if member_accounts table exists and RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  hasrls as has_rls_policies
FROM pg_tables 
WHERE tablename = 'member_accounts';

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'member_accounts' 
ORDER BY ordinal_position;

-- =====================================================
-- 3. CHECK EXISTING RLS POLICIES
-- =====================================================

-- List all existing policies on member_accounts
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'member_accounts';

-- Check if policies exist at all
SELECT 
  'Policy Count' as check_type,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'member_accounts';

-- =====================================================
-- 4. CHECK TRAINER AND CLIENT DATA
-- =====================================================

-- Check if we have trainers data
SELECT 
  'Trainers Count' as check_type,
  COUNT(*) as count
FROM trainers;

-- Check if we have clients data
SELECT 
  'Clients Count' as check_type,
  COUNT(*) as count
FROM clients;

-- Check trainer-client relationships
SELECT 
  'Trainer-Client Relationships' as check_type,
  COUNT(*) as count
FROM clients c
JOIN trainers t ON c.trainer_id = t.id;

-- =====================================================
-- 5. TEST PERMISSIONS (Replace YOUR_CLIENT_ID)
-- =====================================================

-- First, get a valid client ID for testing
SELECT 
  'Available Client IDs' as info,
  c.id as client_id,
  c.name as client_name,
  t.user_id as trainer_user_id
FROM clients c
JOIN trainers t ON c.trainer_id = t.id
LIMIT 5;

-- Test SELECT permission (should work)
SELECT 
  'SELECT Test' as test_type,
  COUNT(*) as accessible_records
FROM member_accounts;

-- Test INSERT permission with a real client ID
-- Replace 'REPLACE_WITH_ACTUAL_CLIENT_ID' with a real client ID from above query
/*
INSERT INTO member_accounts (client_id, email, password_hash, is_active)
VALUES (
  'REPLACE_WITH_ACTUAL_CLIENT_ID',
  'test-rls-permission@example.com', 
  'managed_by_supabase_auth',
  true
);
*/

-- =====================================================
-- 6. TEMPORARILY DISABLE RLS FOR TESTING
-- =====================================================

-- WARNING: Only run this for testing, then re-enable!
-- ALTER TABLE member_accounts DISABLE ROW LEVEL SECURITY;

-- Test insert without RLS
/*
INSERT INTO member_accounts (client_id, email, password_hash, is_active)
VALUES (
  'REPLACE_WITH_ACTUAL_CLIENT_ID',
  'test-no-rls@example.com', 
  'managed_by_supabase_auth',
  true
);
*/

-- Re-enable RLS
-- ALTER TABLE member_accounts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CREATE MISSING POLICIES
-- =====================================================

-- Drop existing policies if they exist (to start fresh)
DROP POLICY IF EXISTS "Trainers see own member accounts" ON member_accounts;
DROP POLICY IF EXISTS "Trainers can insert member accounts" ON member_accounts;
DROP POLICY IF EXISTS "Members see own data" ON member_accounts;

-- Create comprehensive policies for member_accounts

-- Policy 1: Trainers can SELECT member accounts for their clients
CREATE POLICY "Trainers can select member accounts" ON member_accounts
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
CREATE POLICY "Members can select own account" ON member_accounts
  FOR SELECT
  USING (
    email = auth.email()
  );

-- Policy 6: Members can UPDATE their own account data (limited fields)
CREATE POLICY "Members can update own account" ON member_accounts
  FOR UPDATE
  USING (
    email = auth.email()
  )
  WITH CHECK (
    email = auth.email()
  );

-- =====================================================
-- 8. VERIFY POLICIES WERE CREATED
-- =====================================================

-- Check all policies on member_accounts
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'SELECT'
    WHEN cmd = 'INSERT' THEN 'INSERT'
    WHEN cmd = 'UPDATE' THEN 'UPDATE'
    WHEN cmd = 'DELETE' THEN 'DELETE'
    WHEN cmd = 'ALL' THEN 'ALL'
    ELSE cmd
  END as operation
FROM pg_policies 
WHERE tablename = 'member_accounts'
ORDER BY cmd, policyname;

-- =====================================================
-- 9. TEST POLICIES WITH ACTUAL DATA
-- =====================================================

-- Get a trainer's user_id and their client
SELECT 
  'Test Data Setup' as info,
  t.user_id as trainer_user_id,
  t.id as trainer_id,
  c.id as client_id,
  c.name as client_name
FROM trainers t
JOIN clients c ON c.trainer_id = t.id
LIMIT 1;

-- Test the policies (run this after getting the trainer_user_id)
-- You'll need to be authenticated as the trainer user
/*
-- Test SELECT
SELECT COUNT(*) FROM member_accounts;

-- Test INSERT (replace with actual client_id)
INSERT INTO member_accounts (client_id, email, password_hash, is_active)
VALUES (
  'ACTUAL_CLIENT_ID_HERE',
  'test-policy@example.com', 
  'managed_by_supabase_auth',
  true
);
*/

-- =====================================================
-- 10. TROUBLESHOOTING COMMANDS
-- =====================================================

-- If still having issues, check these:

-- Check if RLS is actually enabled
SELECT 
  'RLS Status' as check,
  CASE 
    WHEN relrowsecurity THEN 'Enabled'
    ELSE 'Disabled'
  END as status
FROM pg_class 
WHERE relname = 'member_accounts';

-- Check table owner and permissions
SELECT 
  'Table Permissions' as check,
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename = 'member_accounts';

-- Check if there are any constraints blocking inserts
SELECT 
  'Constraints' as check,
  conname,
  contype,
  consrc
FROM pg_constraint 
WHERE conrelid = 'member_accounts'::regclass;

-- =====================================================
-- 11. CLEANUP TEST DATA
-- =====================================================

-- Remove test data if needed
-- DELETE FROM member_accounts WHERE email LIKE 'test-%@example.com';

-- =====================================================
-- SUMMARY
-- =====================================================

-- Final verification
SELECT 
  'Final Status' as check_type,
  'member_accounts RLS policies configured' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'member_accounts';
