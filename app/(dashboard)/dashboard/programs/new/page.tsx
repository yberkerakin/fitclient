'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { createProgram } from '@/lib/services/programs';
import { createBrowserSupabaseClient } from '@/lib/supabase-client';

interface Exercise {
  id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight: number | null;
  order_index: number;
}

export default function NewProgramPage() {
  const router = useRouter();
  const [programName, setProgramName] = useState('');
  const [programDate, setProgramDate] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);

  function addExercise() {
    const newExercise: Exercise = {
      id: crypto.randomUUID(),
      exercise_name: '',
      sets: 3,
      reps: 10,
      weight: null,
      order_index: exercises.length
    };
    setExercises([...exercises, newExercise]);
  }

  function updateExercise(id: string, field: keyof Exercise, value: any) {
    setExercises(exercises.map(ex => 
      ex.id === id ? { ...ex, [field]: value } : ex
    ));
  }

  function removeExercise(id: string) {
    setExercises(exercises.filter(ex => ex.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!programName.trim()) {
      toast.error('Program adı giriniz');
      return;
    }

    if (exercises.length === 0) {
      toast.error('En az bir egzersiz eklemelisiniz');
      return;
    }

    // Validate exercises
    const invalidExercise = exercises.find(ex => !ex.exercise_name.trim());
    if (invalidExercise) {
      toast.error('Tüm egzersiz isimlerini doldurunuz');
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!trainer) {
        toast.error('Trainer bulunamadı');
        return;
      }

      await createProgram(
        trainer.id,
        programName,
        programDate || null,
        exercises.map((ex, index) => ({
          exercise_name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          order_index: index
        }))
      );

      toast.success('Program oluşturuldu');
      router.push('/dashboard/programs');
    } catch (error) {
      console.error(error);
      toast.error('Program oluşturulamadı');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Yeni Antrenman Programı</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Program Adı</Label>
              <Input
                id="name"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Örn: Üst Vücut Kuvvet"
                required
              />
            </div>
            <div>
              <Label htmlFor="date">Tarih (Opsiyonel)</Label>
              <Input
                id="date"
                type="date"
                value={programDate}
                onChange={(e) => setProgramDate(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Egzersizler</h2>
            <Button
              type="button"
              onClick={addExercise}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Egzersiz Ekle
            </Button>
          </div>

          {exercises.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Henüz egzersiz eklenmedi
            </p>
          ) : (
            <div className="space-y-4">
              {exercises.map((exercise, index) => (
                <Card key={exercise.id} className="p-4">
                  <div className="flex items-start gap-2">
                    <div className="pt-2">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                    </div>
                    
                    <div className="flex-1 grid gap-3 md:grid-cols-4">
                      <div className="md:col-span-2">
                        <Label>Egzersiz Adı</Label>
                        <Input
                          value={exercise.exercise_name}
                          onChange={(e) => updateExercise(exercise.id, 'exercise_name', e.target.value)}
                          placeholder="Örn: Bench Press"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label>Set</Label>
                        <Input
                          type="number"
                          min="1"
                          value={exercise.sets}
                          onChange={(e) => updateExercise(exercise.id, 'sets', parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label>Tekrar</Label>
                        <Input
                          type="number"
                          min="1"
                          value={exercise.reps}
                          onChange={(e) => updateExercise(exercise.id, 'reps', parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>
                      
                      <div className="md:col-span-1">
                        <Label>Ağırlık (kg)</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={exercise.weight || ''}
                          onChange={(e) => updateExercise(exercise.id, 'weight', parseFloat(e.target.value) || null)}
                          placeholder="Opsiyonel"
                        />
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExercise(exercise.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            İptal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Oluşturuluyor...' : 'Programı Oluştur'}
          </Button>
        </div>
      </form>
    </div>
  );
}
