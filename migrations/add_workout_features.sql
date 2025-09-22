-- Add Workout Features Migration
-- This migration adds comprehensive workout program management functionality

-- Member accounts for client login
CREATE TABLE IF NOT EXISTS member_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workout programs created by trainers
CREATE TABLE IF NOT EXISTS workout_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  program_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exercises within programs
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

-- Program assignments to clients
CREATE TABLE IF NOT EXISTS program_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES workout_programs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  total_sessions INTEGER NOT NULL,
  completed_sessions INTEGER DEFAULT 0,
  assigned_date TIMESTAMP DEFAULT NOW(),
  UNIQUE(program_id, client_id)
);

-- Individual workout sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES program_assignments(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'active', 'completed')),
  UNIQUE(assignment_id, session_number)
);

-- Exercise performance in sessions
CREATE TABLE IF NOT EXISTS session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight DECIMAL(5,2),
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 10)
);

-- Notifications for members
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('program_assigned', 'workout_completed', 'session_unlocked')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE member_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Trainers see own programs" ON workout_programs
  FOR ALL USING (trainer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM trainers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Members see own data" ON member_accounts
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE trainer_id IN (SELECT id FROM trainers WHERE user_id = auth.uid()))
    OR client_id = (SELECT client_id FROM member_accounts WHERE id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_workout_programs_trainer ON workout_programs(trainer_id);
CREATE INDEX idx_program_exercises_program ON program_exercises(program_id);
CREATE INDEX idx_program_assignments_client ON program_assignments(client_id);
CREATE INDEX idx_workout_sessions_assignment ON workout_sessions(assignment_id);
CREATE INDEX idx_notifications_client ON notifications(client_id);
