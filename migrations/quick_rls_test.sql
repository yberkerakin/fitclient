-- Quick RLS Test for member_accounts
-- Run this to quickly diagnose RLS issues

-- 1. Check current user and RLS status
SELECT 
  current_user,
  auth.uid(),
  auth.email(),
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'member_accounts') as rls_enabled;

-- 2. Check existing policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'member_accounts';

-- 3. Get a test client ID (replace YOUR_CLIENT_ID in step 4)
SELECT c.id as client_id, c.name, t.user_id as trainer_user_id
FROM clients c
JOIN trainers t ON c.trainer_id = t.id
LIMIT 1;

-- 4. Test INSERT (replace YOUR_CLIENT_ID with actual client ID from step 3)
-- INSERT INTO member_accounts (client_id, email, password_hash, is_active)
-- VALUES ('YOUR_CLIENT_ID', 'test@example.com', 'managed_by_supabase_auth', true);

-- 5. If step 4 fails, temporarily disable RLS to test
-- ALTER TABLE member_accounts DISABLE ROW LEVEL SECURITY;
-- Try step 4 again
-- ALTER TABLE member_accounts ENABLE ROW LEVEL SECURITY;

-- 6. Create INSERT policy if missing
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
