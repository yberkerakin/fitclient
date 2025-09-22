'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createBrowserSupabaseClient } from '@/lib/supabase-client';
import { getProgramWithExercises, assignProgramToClient } from '@/lib/services/programs';
import { WorkoutProgram, ProgramExercise, Client } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AssignProgramPage() {
  const router = useRouter();
  const params = useParams();
  const programId = params.programId as string;
  const [program, setProgram] = useState<(WorkoutProgram & { exercises: ProgramExercise[] }) | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [totalSessions, setTotalSessions] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [programId]);

  async function fetchData() {
    try {
      // Get program
      const programData = await getProgramWithExercises(programId);
      setProgram(programData);

      // Get clients
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (trainer) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('*')
          .eq('trainer_id', trainer.id)
          .order('name');

        setClients(clientsData || []);
      }
    } catch (error) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedClient) {
      toast.error('Üye seçiniz');
      return;
    }

    setSubmitting(true);

    try {
      await assignProgramToClient(programId, selectedClient, totalSessions);
      toast.success('Program başarıyla atandı');
      router.push('/dashboard/programs');
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast.error('Bu program bu üyeye zaten atanmış');
      } else {
        toast.error('Program atanamadı');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-red-600" />
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

  if (clients.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Program Ata</h1>
            <p className="text-gray-500">{program.name}</p>
          </div>
        </div>

        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz Üye Yok</h3>
          <p className="text-gray-600 mb-4">Program atamak için önce üye eklemeniz gerekiyor.</p>
          <Button onClick={() => router.push('/dashboard/clients')} variant="outline">
            Üye Ekle
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Program Ata</h1>
          <p className="text-gray-500">{program?.name}</p>
        </div>
      </div>

      {/* Program Summary */}
      <Card className="p-4 mb-6 bg-purple-50 border-purple-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Check className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">Program Özeti</h3>
            <p className="text-sm text-purple-700">
              {program.exercises?.length || 0} egzersiz • {totalSessions} seans
            </p>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 space-y-6">
          <div>
            <Label htmlFor="client-select">Üye Seçin</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger id="client-select" className="mt-2">
                <SelectValue placeholder="Üye seçiniz..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{client.name}</span>
                      {client.phone && (
                        <span className="text-sm text-gray-500">{client.phone}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Toplam Seans Sayısı</Label>
            <Input
              type="number"
              min="1"
              value={totalSessions}
              onChange={(e) => setTotalSessions(parseInt(e.target.value) || 1)}
              className="mt-2"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Üye bu programı kaç seans boyunca yapacak?
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Not:</strong> Program atandığında ilk seans otomatik olarak açılır. 
              Diğer seanslar önceki seans tamamlandıkça açılacaktır.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              İptal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Atanıyor...' : 'Programı Ata'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
