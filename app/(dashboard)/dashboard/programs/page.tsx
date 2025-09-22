'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { getProgramsByTrainer, deleteProgram } from '@/lib/services/programs';
import { createBrowserSupabaseClient } from '@/lib/supabase-client';
import { WorkoutProgram } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPrograms();
  }, []);

  async function fetchPrograms() {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (trainer) {
        const programs = await getProgramsByTrainer(trainer.id);
        setPrograms(programs || []);
      }
    } catch (error) {
      toast.error('Programlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedProgram) return;

    try {
      await deleteProgram(selectedProgram);
      toast.success('Program silindi');
      setDeleteDialogOpen(false);
      fetchPrograms();
    } catch (error) {
      toast.error('Program silinemedi');
    }
  }

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Antrenman Programları</h1>
        <Button onClick={() => router.push('/dashboard/programs/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Program
        </Button>
      </div>

      {programs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">Henüz program oluşturmadınız</p>
          <Button 
            onClick={() => router.push('/dashboard/programs/new')}
            className="mt-4"
          >
            İlk Programı Oluştur
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <Card key={program.id} className="p-6">
              <h3 className="font-semibold text-lg mb-2">{program.name}</h3>
              <p className="text-sm text-gray-500 mb-4">
                {program.program_date 
                  ? new Date(program.program_date).toLocaleDateString('tr-TR')
                  : 'Tarih belirtilmemiş'}
              </p>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/programs/${program.id}`)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/programs/${program.id}/assign`)}
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600"
                  onClick={() => {
                    setSelectedProgram(program.id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Programı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu programı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
