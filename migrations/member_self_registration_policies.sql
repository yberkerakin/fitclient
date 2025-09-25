-- Member Self-Registration System Migration
-- This migration enables members to self-register and creates appropriate RLS policies

-- =====================================================
-- DROP EXISTING PROBLEMATIC POLICIES
-- =====================================================

-- Drop old member_accounts policies that may conflict
DROP POLICY IF EXISTS "Trainers manage member accounts" ON member_accounts;
DROP POLICY IF EXISTS "Members see own account" ON member_accounts;
DROP POLICY IF EXISTS "Members see own data" ON member_accounts;

-- Drop any existing client policies that might block member registration
DROP POLICY IF EXISTS "Members can create own client record" ON clients;

-- =====================================================
-- MEMBER ACCOUNTS POLICIES
-- =====================================================

-- Allow members to create their own member account during registration
CREATE POLICY "Members can create own account" ON member_accounts
  FOR INSERT
  WITH CHECK (auth.email() = email);

-- Allow members to view their own account details
CREATE POLICY "Members can view own account" ON member_accounts
  FOR SELECT
  USING (auth.email() = email);

-- Allow members to update their own account (e.g., deactivate)
CREATE POLICY "Members can update own account" ON member_accounts
  FOR UPDATE
  USING (auth.email() = email);

-- Trainers can view member accounts for their clients (for management)
CREATE POLICY "Trainers can view client member accounts" ON member_accounts
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE trainer_id IN (
        SELECT id FROM trainers WHERE user_id = auth.uid()
      )
    )
  );

-- Trainers can update member accounts for their clients (e.g., deactivate)
CREATE POLICY "Trainers can update client member accounts" ON member_accounts
  FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE trainer_id IN (
        SELECT id FROM trainers WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- CLIENTS POLICIES
-- =====================================================

-- Allow members to create their own client record during registration
CREATE POLICY "Members can create own client record" ON clients
  FOR INSERT
  WITH CHECK (auth.email() = email);

-- Members can view their own client record
CREATE POLICY "Members can view own client record" ON clients
  FOR SELECT
  USING (auth.email() = email);

-- Members can update their own client record (limited fields)
CREATE POLICY "Members can update own client record" ON clients
  FOR UPDATE
  USING (auth.email() = email)
  WITH CHECK (auth.email() = email);

-- Trainers can manage their clients (existing functionality)
CREATE POLICY "Trainers can manage their clients" ON clients
  FOR ALL
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- TRAINERS POLICIES
-- =====================================================

-- Allow public access to view trainers for selection during registration
CREATE POLICY "Public can view trainers for selection" ON trainers
  FOR SELECT
  USING (true);

-- Trainers can manage their own profile
CREATE POLICY "Trainers can manage own profile" ON trainers
  FOR ALL
  USING (user_id = auth.uid());

-- =====================================================
-- WORKOUT PROGRAMS POLICIES
-- =====================================================

-- Trainers can manage their own programs
CREATE POLICY "Trainers can manage own programs" ON workout_programs
  FOR ALL
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE user_id = auth.uid()
    )
  );

-- Members can view programs assigned to them
CREATE POLICY "Members can view assigned programs" ON workout_programs
  FOR SELECT
  USING (
    id IN (
      SELECT program_id FROM program_assignments 
      WHERE client_id IN (
        SELECT id FROM clients WHERE email = auth.email()
      )
    )
  );

-- =====================================================
-- PROGRAM EXERCISES POLICIES
-- =====================================================

-- Trainers can manage exercises for their programs
CREATE POLICY "Trainers can manage program exercises" ON program_exercises
  FOR ALL
  USING (
    program_id IN (
      SELECT id FROM workout_programs 
      WHERE trainer_id IN (
        SELECT id FROM trainers WHERE user_id = auth.uid()
      )
    )
  );

-- Members can view exercises for their assigned programs
CREATE POLICY "Members can view assigned program exercises" ON program_exercises
  FOR SELECT
  USING (
    program_id IN (
      SELECT program_id FROM program_assignments 
      WHERE client_id IN (
        SELECT id FROM clients WHERE email = auth.email()
      )
    )
  );

-- =====================================================
-- PROGRAM ASSIGNMENTS POLICIES
-- =====================================================

-- Trainers can assign programs to their clients
CREATE POLICY "Trainers can assign programs to clients" ON program_assignments
  FOR ALL
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE trainer_id IN (
        SELECT id FROM trainers WHERE user_id = auth.uid()
      )
    )
  );

-- Members can view their own program assignments
CREATE POLICY "Members can view own program assignments" ON program_assignments
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE email = auth.email()
    )
  );

-- =====================================================
-- WORKOUT SESSIONS POLICIES
-- =====================================================

-- Trainers can manage sessions for their clients
CREATE POLICY "Trainers can manage client sessions" ON workout_sessions
  FOR ALL
  USING (
    assignment_id IN (
      SELECT pa.id FROM program_assignments pa
      JOIN clients c ON pa.client_id = c.id
      WHERE c.trainer_id IN (
        SELECT id FROM trainers WHERE user_id = auth.uid()
      )
    )
  );

-- Members can view their own sessions
CREATE POLICY "Members can view own sessions" ON workout_sessions
  FOR SELECT
  USING (
    assignment_id IN (
      SELECT pa.id FROM program_assignments pa
      JOIN clients c ON pa.client_id = c.id
      WHERE c.email = auth.email()
    )
  );

-- Members can update their own sessions (mark as completed)
CREATE POLICY "Members can update own sessions" ON workout_sessions
  FOR UPDATE
  USING (
    assignment_id IN (
      SELECT pa.id FROM program_assignments pa
      JOIN clients c ON pa.client_id = c.id
      WHERE c.email = auth.email()
    )
  );

-- =====================================================
-- SESSION EXERCISES POLICIES
-- =====================================================

-- Trainers can manage session exercises for their clients
CREATE POLICY "Trainers can manage client session exercises" ON session_exercises
  FOR ALL
  USING (
    session_id IN (
      SELECT ws.id FROM workout_sessions ws
      JOIN program_assignments pa ON ws.assignment_id = pa.id
      JOIN clients c ON pa.client_id = c.id
      WHERE c.trainer_id IN (
        SELECT id FROM trainers WHERE user_id = auth.uid()
      )
    )
  );

-- Members can view and update their own session exercises
CREATE POLICY "Members can manage own session exercises" ON session_exercises
  FOR ALL
  USING (
    session_id IN (
      SELECT ws.id FROM workout_sessions ws
      JOIN program_assignments pa ON ws.assignment_id = pa.id
      JOIN clients c ON pa.client_id = c.id
      WHERE c.email = auth.email()
    )
  );

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================

-- Trainers can create notifications for their clients
CREATE POLICY "Trainers can create client notifications" ON notifications
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients 
      WHERE trainer_id IN (
        SELECT id FROM trainers WHERE user_id = auth.uid()
      )
    )
  );

-- Members can view their own notifications
CREATE POLICY "Members can view own notifications" ON notifications
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE email = auth.email()
    )
  );

-- Members can update their own notifications (mark as read)
CREATE POLICY "Members can update own notifications" ON notifications
  FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM clients WHERE email = auth.email()
    )
  );

-- =====================================================
-- CLEANUP ORPHANED AUTH USERS
-- =====================================================

-- Clean up any orphaned auth users from previous registration attempts
-- This is a one-time cleanup that removes auth users who don't have
-- corresponding records in either trainers or member_accounts tables
DELETE FROM auth.users 
WHERE id NOT IN (
  SELECT user_id FROM trainers WHERE user_id IS NOT NULL
) 
AND email NOT IN (
  SELECT email FROM member_accounts
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify all policies are created successfully
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('member_accounts', 'clients', 'trainers', 'workout_programs', 'program_exercises', 'program_assignments', 'workout_sessions', 'session_exercises', 'notifications')
ORDER BY tablename, policyname;

-- Check RLS status for all tables
SELECT schemaname, tablename, rowsecurity, forcerowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('member_accounts', 'clients', 'trainers', 'workout_programs', 'program_exercises', 'program_assignments', 'workout_sessions', 'session_exercises', 'notifications')
ORDER BY tablename;
