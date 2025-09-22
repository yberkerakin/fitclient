'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Dumbbell, Trophy, Clock } from 'lucide-react';
import { getMemberSession } from '@/lib/auth/member-auth';
import { createBrowserSupabaseClient } from '@/lib/supabase-client';
import { toast } from 'sonner';
import Link from 'next/link';

export default function MemberDashboard() {
  const [member, setMember] = useState<any>(null);
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    activePrograms: 0,
    nextWorkout: null as any
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const session = await getMemberSession();
      if (!session) return;
      
      setMember(session);
      const supabase = createBrowserSupabaseClient();

      // Get statistics
      // Total remaining sessions from purchases
      const { data: purchases } = await supabase
        .from('purchases')
        .select('remaining_sessions')
        .eq('client_id', session.client_id);

      const totalRemaining = purchases?.reduce((sum, p) => sum + p.remaining_sessions, 0) || 0;

      // Get completed sessions this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: completedCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact' })
        .eq('client_id', session.client_id)
        .gte('check_in_time', startOfMonth.toISOString());

      // Get active programs
      const { data: assignments } = await supabase
        .from('program_assignments')
        .select('*, program:workout_programs(*)')
        .eq('client_id', session.client_id)
        .gt('total_sessions', 'completed_sessions');

      // Get next available workout
      const { data: nextWorkout } = await supabase
        .from('workout_sessions')
        .select('*, assignment:program_assignments(*, program:workout_programs(*))')
        .eq('status', 'active')
        .in('assignment_id', assignments?.map(a => a.id) || [])
        .order('session_number')
        .limit(1)
        .single();

      setStats({
        totalSessions: totalRemaining,
        completedSessions: completedCount || 0,
        activePrograms: assignments?.length || 0,
        nextWorkout
      });

    } catch (error) {
      console.error(error);
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hoş geldin, {member?.client?.name}! 👋</h1>
        <p className="text-gray-600 mt-1">Bugün harika bir gün antrenman yapmak için!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Kalan Ders</p>
              <p className="text-2xl font-bold">{stats.totalSessions}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bu Ay Tamamlanan</p>
              <p className="text-2xl font-bold">{stats.completedSessions}</p>
            </div>
            <Trophy className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aktif Program</p>
              <p className="text-2xl font-bold">{stats.activePrograms}</p>
            </div>
            <Dumbbell className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sonraki Antrenman</p>
              <p className="text-lg font-bold">
                {stats.nextWorkout ? 'Hazır' : 'Yok'}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Next Workout Card */}
      {stats.nextWorkout && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Sonraki Antrenmanın</h2>
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-medium text-purple-900">
              {stats.nextWorkout.assignment.program.name}
            </h3>
            <p className="text-sm text-purple-700 mt-1">
              Seans {stats.nextWorkout.session_number} / {stats.nextWorkout.assignment.total_sessions}
            </p>
            <Link href="/member/workouts">
              <Button className="mt-4" size="sm">
                Programı Görüntüle
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-semibold mb-2">QR ile Giriş</h3>
          <p className="text-sm text-gray-600 mb-4">
            Salona geldiğinde QR kodunu okutarak giriş yapabilirsin
          </p>
          <Button variant="outline" className="w-full">
            QR Kodumu Göster
          </Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-2">Performansın</h3>
          <p className="text-sm text-gray-600 mb-4">
            Gelişimini takip et ve hedeflerine ulaş
          </p>
          <Link href="/member/stats">
            <Button variant="outline" className="w-full">
              İstatistikleri Gör
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
