'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, CheckCircle, PlayCircle } from 'lucide-react';
import { getMemberSession } from '@/lib/auth/member-auth';
import { createBrowserSupabaseClient } from '@/lib/supabase-client';
import { toast } from 'sonner';

export default function MemberWorkoutsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkouts();
  }, []);

  async function loadWorkouts() {
    try {
      const session = await getMemberSession();
      if (!session) return;

      const supabase = createBrowserSupabaseClient();

      // Get all program assignments with sessions
      const { data } = await supabase
        .from('program_assignments')
        .select(`
          *,
          program:workout_programs(*, exercises:program_exercises(*)),
          sessions:workout_sessions(*)
        `)
        .eq('client_id', session.client_id)
        .order('assigned_date', { ascending: false });

      setAssignments(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Antrenmanlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  function getSessionStatus(session: any) {
    if (session.status === 'completed') return 'completed';
    if (session.status === 'active') return 'active';
    return 'locked';
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'active':
        return <PlayCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <Lock className="h-5 w-5 text-gray-400" />;
    }
  }

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Antrenmanlarım</h1>
        <p className="text-gray-600 mt-1">Atanan antrenman programlarını görüntüle</p>
      </div>

      {assignments.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">Henüz antrenman programı atanmamış</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{assignment.program.name}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(assignment.assigned_date).toLocaleDateString('tr-TR')} tarihinde atandı
                  </p>
                </div>
                <Badge variant={assignment.completed_sessions === assignment.total_sessions ? 'default' : 'secondary'}>
                  {assignment.completed_sessions} / {assignment.total_sessions} Tamamlandı
                </Badge>
              </div>

              {/* Exercise List */}
              <div className="mb-4 bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-sm text-gray-700 mb-2">Egzersizler:</h4>
                <div className="space-y-1">
                  {assignment.program.exercises
                    .sort((a: any, b: any) => a.order_index - b.order_index)
                    .map((exercise: any, index: number) => (
                      <div key={exercise.id} className="text-sm">
                        {index + 1}. {exercise.exercise_name} - {exercise.sets}x{exercise.reps}
                        {exercise.weight && ` @ ${exercise.weight}kg`}
                      </div>
                    ))}
                </div>
              </div>

              {/* Sessions */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Seanslar:</h4>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                  {assignment.sessions
                    .sort((a: any, b: any) => a.session_number - b.session_number)
                    .map((session: any) => {
                      const status = getSessionStatus(session);
                      return (
                        <div
                          key={session.id}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border ${
                            status === 'completed'
                              ? 'bg-green-50 border-green-300'
                              : status === 'active'
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          {getStatusIcon(status)}
                          <span className="text-xs mt-1">{session.session_number}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(assignment.completed_sessions / assignment.total_sessions) * 100}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">
                  %{Math.round((assignment.completed_sessions / assignment.total_sessions) * 100)} tamamlandı
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
