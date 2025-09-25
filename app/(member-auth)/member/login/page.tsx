'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserSupabaseClient } from '@/lib/supabase-client';
import { authenticateMember } from '@/lib/services/member-accounts';
import { translateAuthError } from '@/lib/utils/auth-error-translator';
import Link from 'next/link';

export default function MemberLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);


  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Use our authenticateMember service
      await authenticateMember(email, password);
      
      toast.success('Giriş başarılı!');
      router.push('/member/dashboard');
    } catch (error: any) {
      // Translate the error message to Turkish
      const translatedError = translateAuthError(error.message || 'Giriş başarısız');
      toast.error(translatedError);
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
          <h1 className="text-2xl font-bold">Üye Girişi</h1>
          <p className="text-gray-500 mt-2">FitClient hesabınıza giriş yapın</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label>E-posta Adresi</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@email.com"
              required
            />
          </div>

          <div>
            <Label>Şifre</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm space-y-2">
          <p className="text-gray-500">
            Hesabınız yok mu?{' '}
            <Link href="/member/register" className="text-purple-600 hover:underline">
              Üye olun
            </Link>
          </p>
          <p className="text-gray-500">
            Eğitmen misiniz?{' '}
            <Link href="/login" className="text-purple-600 hover:underline">
              Eğitmen girişi
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
