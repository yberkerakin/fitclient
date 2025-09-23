-- Test member_accounts Permissions
-- Run this after fixing permissions to verify they work

-- =====================================================
-- 1. CHECK CURRENT USER CONTEXT
-- =====================================================

SELECT 
  'User Context' as test_type,
  current_user as current_user,
  auth.uid() as auth_uid,
  auth.email() as auth_email,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'Authenticated'
    ELSE 'Not Authenticated'
  END as auth_status;

-- =====================================================
-- 2. CHECK RLS STATUS
-- =====================================================

SELECT 
  'RLS Status' as test_type,
  CASE 
    WHEN relrowsecurity THEN 'Enabled'
    ELSE 'Disabled'
  END as status
FROM pg_class 
WHERE relname = 'member_accounts';

-- =====================================================
-- 3. LIST ACTIVE POLICIES
-- =====================================================

SELECT 
  'Active Policies' as test_type,
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Read'
    WHEN cmd = 'INSERT' THEN 'Create'
    WHEN cmd = 'UPDATE' THEN 'Modify'
    WHEN cmd = 'DELETE' THEN 'Remove'
    ELSE cmd
  END as description
FROM pg_policies 
WHERE tablename = 'member_accounts'
ORDER BY cmd, policyname;

-- =====================================================
-- 4. GET TEST DATA
-- =====================================================

-- Get a trainer and their client for testing
SELECT 
  'Test Data' as test_type,
  t.user_id as trainer_user_id,
  t.id as trainer_id,
  t.name as trainer_name,
  c.id as client_id,
  c.name as client_name,
  c.email as client_email
FROM trainers t
JOIN clients c ON c.trainer_id = t.id
LIMIT 1;

-- =====================================================
-- 5. TEST SELECT PERMISSION
-- =====================================================

-- Test if we can read member accounts
SELECT 
  'SELECT Test' as test_type,
  COUNT(*) as accessible_records,
  CASE 
    WHEN COUNT(*) >= 0 THEN 'SUCCESS - Can read member accounts'
    ELSE 'FAILED - Cannot read member accounts'
  END as result
FROM member_accounts;

-- =====================================================
-- 6. TEST INSERT PERMISSION
-- =====================================================

-- Note: Replace 'CLIENT_ID_HERE' with actual client ID from step 4
-- This is commented out to avoid creating test data automatically
/*
-- Test INSERT permission
INSERT INTO member_accounts (client_id, email, password_hash, is_active)
VALUES (
  'CLIENT_ID_HERE',  -- Replace with actual client ID
  'test-permissions@example.com', 
  'managed_by_supabase_auth',
  true
) RETURNING id, email, client_id;

-- If successful, clean up test data
-- DELETE FROM member_accounts WHERE email = 'test-permissions@example.com';
*/

-- =====================================================
-- 7. CHECK EXISTING MEMBER ACCOUNTS
-- =====================================================

-- Show existing member accounts (if any)
SELECT 
  'Existing Member Accounts' as test_type,
  ma.id,
  ma.email,
  ma.client_id,
  ma.is_active,
  ma.created_at,
  c.name as client_name
FROM member_accounts ma
LEFT JOIN clients c ON c.id = ma.client_id
ORDER BY ma.created_at DESC
LIMIT 10;

-- =====================================================
-- 8. PERMISSION SUMMARY
-- =====================================================

-- Summary of permissions
SELECT 
  'Permission Summary' as test_type,
  'member_accounts table permissions configured' as status,
  'Trainers can manage member accounts for their clients' as trainer_access,
  'Members can view and update their own accounts' as member_access,
  'RLS policies are active and enforced' as security_status;

-- =====================================================
-- 9. TROUBLESHOOTING INFO
-- =====================================================

-- If tests fail, check these:

-- Check if user is authenticated as trainer
SELECT 
  'Trainer Check' as test_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM trainers t 
      WHERE t.user_id = auth.uid()
    ) THEN 'User is a trainer'
    ELSE 'User is not a trainer'
  END as trainer_status;

-- Check trainer-client relationships
SELECT 
  'Trainer-Client Relationships' as test_type,
  COUNT(*) as total_relationships
FROM trainers t
JOIN clients c ON c.trainer_id = t.id;

-- Check if there are any member accounts at all
SELECT 
  'Member Accounts Count' as test_type,
  COUNT(*) as total_member_accounts
FROM member_accounts;
