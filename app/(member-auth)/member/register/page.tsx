'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dumbbell, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserSupabaseClient } from '@/lib/supabase-client';

export default function MemberRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Basic info
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Step 2: Trainer selection
  const [trainers, setTrainers] = useState<any[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState('');

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone
          }
        }
      });

      if (authError) throw authError;

      // Fetch available trainers
      const { data: trainerList } = await supabase
        .from('trainers')
        .select('id, name, email')
        .order('name');

      setTrainers(trainerList || []);
      setStep(2);
    } catch (error: any) {
      toast.error(error.message || 'Kayıt oluşturulamadı');
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTrainer) {
      toast.error('Lütfen bir eğitmen seçin');
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      
      // Create client record
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({
          trainer_id: selectedTrainer,
          name: name,
          email: email,
          phone: phone,
          qr_code: crypto.randomUUID()
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Create member_account record
      const { error: memberError } = await supabase
        .from('member_accounts')
        .insert({
          client_id: client.id,
          email: email,
          password_hash: 'managed_by_supabase_auth',
          is_active: true
        });

      if (memberError) throw memberError;

      toast.success('Kayıt başarılı! Giriş yapabilirsiniz.');
      router.push('/member/login');
    } catch (error: any) {
      toast.error(error.message || 'Kayıt tamamlanamadı');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
            <Dumbbell className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold">Üye Kaydı</h1>
          <p className="text-gray-500 mt-2">
            {step === 1 ? 'Kişisel bilgilerinizi girin' : 'Eğitmeninizi seçin'}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200'
          }`}>1</div>
          <div className={`w-24 h-1 ${step >= 2 ? 'bg-purple-600' : 'bg-gray-200'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200'
          }`}>2</div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleStep1} className="space-y-4">
            <div>
              <Label>Ad Soyad</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>E-posta</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Telefon</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(5XX) XXX XX XX"
              />
            </div>

            <div>
              <Label>Şifre</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Şifre Tekrar</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'İşleniyor...' : 'Devam Et'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        ) : (
          <form onSubmit={handleStep2} className="space-y-4">
            <div>
              <Label>Eğitmeninizi Seçin</Label>
              <select
                className="w-full p-2 border rounded-md mt-2"
                value={selectedTrainer}
                onChange={(e) => setSelectedTrainer(e.target.value)}
                required
              >
                <option value="">Seçiniz...</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.name} ({trainer.email})
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydı Tamamla'}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm">
          <p className="text-gray-500">
            Zaten hesabınız var mı?{' '}
            <a href="/member/login" className="text-purple-600 hover:underline">
              Giriş yapın
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
