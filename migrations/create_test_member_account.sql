-- Create Test Member Account - Manual Setup
-- Follow these steps to create a test member account

-- =====================================================
-- STEP 1: MANUAL AUTH USER CREATION
-- =====================================================
-- Go to Supabase Dashboard → Authentication → Users → Create User
-- Email: test@example.com
-- Password: test123
-- 
-- OR use the Supabase CLI (if available):
-- supabase auth users create test@example.com --password test123

-- =====================================================
-- STEP 2: CREATE MEMBER ACCOUNT RECORD
-- =====================================================

-- Link the auth user to the first available client
INSERT INTO member_accounts (client_id, email, password_hash, is_active)
SELECT 
  id,
  'test@example.com',
  'managed_by_supabase_auth',
  true
FROM clients
WHERE id NOT IN (
  -- Avoid clients that already have member accounts
  SELECT DISTINCT client_id 
  FROM member_accounts 
  WHERE client_id IS NOT NULL
)
LIMIT 1;

-- =====================================================
-- STEP 3: VERIFY CREATION
-- =====================================================

-- Check if member account was created successfully
SELECT 
  ma.id as member_account_id,
  ma.client_id,
  ma.email,
  ma.password_hash,
  ma.is_active,
  ma.created_at,
  c.name as client_name,
  c.phone as client_phone
FROM member_accounts ma
JOIN clients c ON c.id = ma.client_id
WHERE ma.email = 'test@example.com';

-- =====================================================
-- STEP 4: CHECK AUTH USER STATUS
-- =====================================================

-- Verify the auth user exists (this might not work depending on RLS policies)
-- SELECT 
--   id,
--   email,
--   email_confirmed_at,
--   created_at,
--   last_sign_in_at
-- FROM auth.users 
-- WHERE email = 'test@example.com';

-- =====================================================
-- STEP 5: TEST DATA VERIFICATION
-- =====================================================

-- Show all member accounts for reference
SELECT 
  ma.id,
  ma.email,
  ma.is_active,
  ma.created_at,
  c.name as client_name
FROM member_accounts ma
LEFT JOIN clients c ON c.id = ma.client_id
ORDER BY ma.created_at DESC;

-- =====================================================
-- STEP 6: CLEANUP (if needed)
-- =====================================================

-- To remove the test account (uncomment if needed):
-- DELETE FROM member_accounts WHERE email = 'test@example.com';
-- 
-- Then manually delete the auth user in Supabase Dashboard:
-- Authentication → Users → Find test@example.com → Delete User

-- =====================================================
-- ALTERNATIVE: CREATE WITH SPECIFIC CLIENT
-- =====================================================

-- If you want to link to a specific client, replace the INSERT above with:
-- INSERT INTO member_accounts (client_id, email, password_hash, is_active)
-- VALUES (
--   'YOUR_CLIENT_ID_HERE',  -- Replace with actual client ID
--   'test@example.com',
--   'managed_by_supabase_auth',
--   true
-- );

-- =====================================================
-- LOGIN TEST INSTRUCTIONS
-- =====================================================

-- After running this script:
-- 1. Go to https://app.fitclient.co/member/login
-- 2. Use credentials:
--    Email: test@example.com
--    Password: test123
-- 3. If email confirmation is enabled, check email first
-- 4. Should redirect to member dashboard

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- If login fails, check:
-- 1. Auth user was created in Supabase Dashboard
-- 2. Email confirmation status
-- 3. Member account record exists
-- 4. Client is properly linked
-- 5. RLS policies allow access

-- Check for any RLS policy issues:
-- SELECT * FROM pg_policies WHERE tablename = 'member_accounts';
