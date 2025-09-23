-- First, drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Trainers manage member accounts" ON member_accounts;
DROP POLICY IF EXISTS "Members see own account" ON member_accounts;
DROP POLICY IF EXISTS "Trainers manage own programs" ON workout_programs;
DROP POLICY IF EXISTS "Access through programs" ON program_exercises;
DROP POLICY IF EXISTS "Trainers manage assignments" ON program_assignments;
DROP POLICY IF EXISTS "Members see own assignments" ON program_assignments;
DROP POLICY IF EXISTS "Access through assignments" ON workout_sessions;
DROP POLICY IF EXISTS "Access through sessions" ON session_exercises;
DROP POLICY IF EXISTS "Members see own notifications" ON notifications;
DROP POLICY IF EXISTS "Trainers manage notifications" ON notifications;

-- Create all tables
CREATE TABLE IF NOT EXISTS member_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  program_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS program_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES workout_programs(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight DECIMAL(5,2),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS program_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES workout_programs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  total_sessions INTEGER NOT NULL,
  completed_sessions INTEGER DEFAULT 0,
  assigned_date TIMESTAMP DEFAULT NOW(),
  UNIQUE(program_id, client_id)
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES program_assignments(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'active', 'completed')),
  UNIQUE(assignment_id, session_number)
);

CREATE TABLE IF NOT EXISTS session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight DECIMAL(5,2),
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 10)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('program_assigned', 'workout_completed', 'session_unlocked')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE member_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for member_accounts
CREATE POLICY "Trainers manage member accounts" ON member_accounts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      JOIN trainers t ON c.trainer_id = t.id
      WHERE c.id = member_accounts.client_id 
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Members see own account" ON member_accounts
  FOR SELECT
  USING (
    auth.email() = member_accounts.email
  );

-- Create RLS Policies for workout_programs
CREATE POLICY "Trainers manage own programs" ON workout_programs
  FOR ALL
  USING (
    trainer_id IN (
      SELECT id FROM trainers WHERE user_id = auth.uid()
    )
  );

-- Create RLS Policies for program_exercises
CREATE POLICY "Access through programs" ON program_exercises
  FOR ALL
  USING (
    program_id IN (
      SELECT id FROM workout_programs 
      WHERE trainer_id IN (
        SELECT id FROM trainers WHERE user_id = auth.uid()
      )
    )
  );

-- Create RLS Policies for program_assignments
CREATE POLICY "Trainers manage assignments" ON program_assignments
  FOR ALL
  USING (
    program_id IN (
      SELECT id FROM workout_programs 
      WHERE trainer_id IN (
        SELECT id FROM trainers WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members see own assignments" ON program_assignments
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM member_accounts 
      WHERE email = auth.email()
    )
  );

-- Create RLS Policies for workout_sessions
CREATE POLICY "Access through assignments" ON workout_sessions
  FOR ALL
  USING (
    assignment_id IN (
      SELECT id FROM program_assignments
      WHERE program_id IN (
        SELECT id FROM workout_programs 
        WHERE trainer_id IN (
          SELECT id FROM trainers WHERE user_id = auth.uid()
        )
      )
      OR client_id IN (
        SELECT client_id FROM member_accounts 
        WHERE email = auth.email()
      )
    )
  );

-- Create RLS Policies for session_exercises
CREATE POLICY "Access through sessions" ON session_exercises
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM workout_sessions
      WHERE assignment_id IN (
        SELECT id FROM program_assignments
        WHERE program_id IN (
          SELECT id FROM workout_programs 
          WHERE trainer_id IN (
            SELECT id FROM trainers WHERE user_id = auth.uid()
          )
        )
        OR client_id IN (
          SELECT client_id FROM member_accounts 
          WHERE email = auth.email()
        )
      )
    )
  );

-- Create RLS Policies for notifications
CREATE POLICY "Members see own notifications" ON notifications
  FOR ALL
  USING (
    client_id IN (
      SELECT client_id FROM member_accounts 
      WHERE email = auth.email()
    )
  );

CREATE POLICY "Trainers manage notifications" ON notifications
  FOR ALL
  USING (
    client_id IN (
      SELECT id FROM clients 
      WHERE trainer_id IN (
        SELECT id FROM trainers WHERE user_id = auth.uid()
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workout_programs_trainer ON workout_programs(trainer_id);
CREATE INDEX IF NOT EXISTS idx_program_exercises_program ON program_exercises(program_id);
CREATE INDEX IF NOT EXISTS idx_program_assignments_client ON program_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_program_assignments_program ON program_assignments(program_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_assignment ON workout_sessions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON workout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_exercises_session ON session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_notifications_client ON notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_member_accounts_client ON member_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_member_accounts_email ON member_accounts(email);

-- Grant necessary permissions
GRANT ALL ON member_accounts TO authenticated;
GRANT ALL ON workout_programs TO authenticated;
GRANT ALL ON program_exercises TO authenticated;
GRANT ALL ON program_assignments TO authenticated;
GRANT ALL ON workout_sessions TO authenticated;
GRANT ALL ON session_exercises TO authenticated;
GRANT ALL ON notifications TO authenticated;
