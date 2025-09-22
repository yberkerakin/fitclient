'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getProgramWithExercises } from '@/lib/services/programs';
import { WorkoutProgram, ProgramExercise } from '@/lib/types';

export default function ProgramDetailPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.programId as string;
  const [program, setProgram] = useState<(WorkoutProgram & { exercises: ProgramExercise[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgram();
  }, [programId]);

  async function fetchProgram() {
    try {
      const data = await getProgramWithExercises(programId);
      setProgram(data);
    } catch (error) {
      toast.error('Program yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Program yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Edit className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Program Bulunamadı</h3>
          <p className="text-gray-600 mb-4">Aradığınız program bulunamadı veya silinmiş olabilir.</p>
          <Button onClick={() => router.push('/dashboard/programs')} variant="outline">
            Programlara Dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{program.name}</h1>
            {program.program_date && (
              <p className="text-sm text-gray-500">
                {new Date(program.program_date).toLocaleDateString('tr-TR')}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/programs/${programId}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Düzenle
          </Button>
          <Button
            onClick={() => router.push(`/dashboard/programs/${programId}/assign`)}
          >
            <Users className="mr-2 h-4 w-4" />
            Üye Ata
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Egzersizler</h2>
        
        {program.exercises && program.exercises.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">#</th>
                  <th className="text-left py-3 px-2">Egzersiz</th>
                  <th className="text-center py-3 px-2">Set</th>
                  <th className="text-center py-3 px-2">Tekrar</th>
                  <th className="text-center py-3 px-2">Ağırlık</th>
                </tr>
              </thead>
              <tbody>
                {program.exercises.map((exercise: ProgramExercise, index: number) => (
                  <tr key={exercise.id} className="border-b">
                    <td className="py-3 px-2">{index + 1}</td>
                    <td className="py-3 px-2 font-medium">{exercise.exercise_name}</td>
                    <td className="py-3 px-2 text-center">{exercise.sets}</td>
                    <td className="py-3 px-2 text-center">{exercise.reps}</td>
                    <td className="py-3 px-2 text-center">
                      {exercise.weight ? `${exercise.weight} kg` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Edit className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz Egzersiz Yok</h3>
            <p className="text-gray-600 mb-4">Bu programa henüz egzersiz eklenmemiş.</p>
            <Button 
              onClick={() => router.push(`/dashboard/programs/${programId}/edit`)}
              variant="outline"
            >
              Egzersiz Ekle
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
