'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dumbbell, Users, UserCheck } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-4">
            <Dumbbell className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">FitClient</h1>
          <p className="text-xl text-white/80">Fitness İşletme Yönetim Sistemi</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Trainer Login */}
          <Card className="p-8 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => router.push('/login')}>
            <div className="text-center">
              <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Eğitmen Girişi</h2>
              <p className="text-gray-600 mb-4">
                Üyelerinizi yönetin, paket satın ve antrenman programları oluşturun
              </p>
              <Button className="w-full">Eğitmen Olarak Giriş Yap</Button>
            </div>
          </Card>

          {/* Member Login */}
          <Card className="p-8 hover:shadow-xl transition-shadow cursor-pointer" onClick={() => router.push('/member/login')}>
            <div className="text-center">
              <UserCheck className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Üye Girişi</h2>
              <p className="text-gray-600 mb-4">
                Antrenman programlarınızı görün ve ilerlemenizi takip edin
              </p>
              <Button variant="outline" className="w-full">Üye Olarak Giriş Yap</Button>
            </div>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-white/60">
            Henüz hesabınız yok mu? Eğitmeninizden giriş bilgilerinizi isteyin.
          </p>
        </div>
      </div>
    </div>
  );
}