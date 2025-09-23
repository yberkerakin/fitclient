-- Quick Fix for member_accounts Permissions
-- Execute this script to fix member account creation issues

-- 1. Enable RLS
ALTER TABLE member_accounts ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies
DROP POLICY IF EXISTS "Trainers manage member accounts" ON member_accounts;
DROP POLICY IF EXISTS "Trainers can view member accounts" ON member_accounts;
DROP POLICY IF EXISTS "Trainers can insert member accounts" ON member_accounts;
DROP POLICY IF EXISTS "Trainers can update member accounts" ON member_accounts;
DROP POLICY IF EXISTS "Trainers can delete member accounts" ON member_accounts;
DROP POLICY IF EXISTS "Members see own account" ON member_accounts;
DROP POLICY IF EXISTS "Members can view own account" ON member_accounts;
DROP POLICY IF EXISTS "Members can update own account" ON member_accounts;

-- 3. Create new policies
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

CREATE POLICY "Members can view own account" ON member_accounts
  FOR SELECT
  USING (auth.email() = member_accounts.email);

CREATE POLICY "Members can update own account" ON member_accounts
  FOR UPDATE
  USING (auth.email() = member_accounts.email)
  WITH CHECK (auth.email() = member_accounts.email);

-- 4. Verify policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'member_accounts';
