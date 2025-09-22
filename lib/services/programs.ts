import { createBrowserSupabaseClient } from '@/lib/supabase-client';

const supabase = createBrowserSupabaseClient();

// Get all programs for a trainer
export async function getProgramsByTrainer(trainerId: string) {
  const { data, error } = await supabase
    .from('workout_programs')
    .select('*')
    .eq('trainer_id', trainerId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Create new program with exercises
export async function createProgram(
  trainerId: string, 
  name: string, 
  programDate: string | null,
  exercises: Array<{
    exercise_name: string;
    sets: number;
    reps: number;
    weight: number | null;
    order_index: number;
  }>
) {
  // Start transaction
  const { data: program, error: programError } = await supabase
    .from('workout_programs')
    .insert({
      trainer_id: trainerId,
      name: name,
      program_date: programDate
    })
    .select()
    .single();

  if (programError) throw programError;

  // Add exercises
  const exercisesToInsert = exercises.map(exercise => ({
    ...exercise,
    program_id: program.id
  }));

  const { error: exercisesError } = await supabase
    .from('program_exercises')
    .insert(exercisesToInsert);

  if (exercisesError) throw exercisesError;

  return program;
}

// Get program with exercises
export async function getProgramWithExercises(programId: string) {
  const { data: program, error: programError } = await supabase
    .from('workout_programs')
    .select('*')
    .eq('id', programId)
    .single();

  if (programError) throw programError;

  const { data: exercises, error: exercisesError } = await supabase
    .from('program_exercises')
    .select('*')
    .eq('program_id', programId)
    .order('order_index');

  if (exercisesError) throw exercisesError;

  return { ...program, exercises };
}

// Assign program to client
export async function assignProgramToClient(
  programId: string,
  clientId: string,
  totalSessions: number
) {
  // Create assignment
  const { data: assignment, error: assignError } = await supabase
    .from('program_assignments')
    .insert({
      program_id: programId,
      client_id: clientId,
      total_sessions: totalSessions
    })
    .select()
    .single();

  if (assignError) throw assignError;

  // Create workout sessions
  const sessions = Array.from({ length: totalSessions }, (_, i) => ({
    assignment_id: assignment.id,
    session_number: i + 1,
    status: i === 0 ? 'active' : 'locked' // First session is active
  }));

  const { error: sessionsError } = await supabase
    .from('workout_sessions')
    .insert(sessions);

  if (sessionsError) throw sessionsError;

  // Create notification
  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', clientId)
    .single();

  await supabase
    .from('notifications')
    .insert({
      client_id: clientId,
      type: 'program_assigned',
      message: `Size yeni bir antrenman programı atandı!`
    });

  return assignment;
}

// Delete program
export async function deleteProgram(programId: string) {
  const { error } = await supabase
    .from('workout_programs')
    .delete()
    .eq('id', programId);

  if (error) throw error;
}

// Get client's assigned programs
export async function getClientPrograms(clientId: string) {
  const { data, error } = await supabase
    .from('program_assignments')
    .select(`
      *,
      workout_programs (*),
      workout_sessions (*)
    `)
    .eq('client_id', clientId)
    .order('assigned_date', { ascending: false });

  if (error) throw error;
  return data;
}

// Get active workout session for client
export async function getActiveWorkoutSession(clientId: string) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(`
      *,
      program_assignments!inner (
        client_id,
        workout_programs (*)
      )
    `)
    .eq('program_assignments.client_id', clientId)
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data;
}

// Start workout session
export async function startWorkoutSession(sessionId: string) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .update({
      start_time: new Date().toISOString(),
      status: 'active'
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Complete workout session
export async function completeWorkoutSession(
  sessionId: string,
  exercises: Array<{
    exercise_name: string;
    sets: number;
    reps: number;
    weight: number | null;
    difficulty_rating?: number;
  }>
) {
  // Update session
  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .update({
      end_time: new Date().toISOString(),
      status: 'completed'
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (sessionError) throw sessionError;

  // Insert exercise performance
  const exercisesToInsert = exercises.map(exercise => ({
    ...exercise,
    session_id: sessionId
  }));

  const { error: exercisesError } = await supabase
    .from('session_exercises')
    .insert(exercisesToInsert);

  if (exercisesError) throw exercisesError;

  // Update assignment progress
  const { data: assignment } = await supabase
    .from('program_assignments')
    .select('*')
    .eq('id', session.assignment_id)
    .single();

  if (assignment) {
    const newCompletedSessions = assignment.completed_sessions + 1;
    
    await supabase
      .from('program_assignments')
      .update({ completed_sessions: newCompletedSessions })
      .eq('id', session.assignment_id);

    // Unlock next session if exists
    if (newCompletedSessions < assignment.total_sessions) {
      await supabase
        .from('workout_sessions')
        .update({ status: 'active' })
        .eq('assignment_id', session.assignment_id)
        .eq('session_number', newCompletedSessions + 1);

      // Create notification for next session
      await supabase
        .from('notifications')
        .insert({
          client_id: assignment.client_id,
          type: 'session_unlocked',
          message: `Yeni antrenman seansınız hazır!`
        });
    }

    // Create completion notification
    await supabase
      .from('notifications')
      .insert({
        client_id: assignment.client_id,
        type: 'workout_completed',
        message: `Harika! Antrenmanınızı başarıyla tamamladınız!`
      });
  }

  return session;
}

// Get client notifications
export async function getClientNotifications(clientId: string, limit = 10) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
}
