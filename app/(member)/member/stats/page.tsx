'use client';

import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, Trophy, Target } from 'lucide-react';

export default function MemberStatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">İstatistiklerim</h1>
        <p className="text-gray-600 mt-1">Performans ve gelişim istatistiklerin</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6 text-center">
          <BarChart3 className="h-12 w-12 text-purple-600 mx-auto mb-3" />
          <h3 className="font-semibold">Gelişim Grafikleri</h3>
          <p className="text-sm text-gray-600 mt-1">Yakında</p>
        </Card>

        <Card className="p-6 text-center">
          <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <h3 className="font-semibold">Kaldırılan Ağırlıklar</h3>
          <p className="text-sm text-gray-600 mt-1">Yakında</p>
        </Card>

        <Card className="p-6 text-center">
          <Trophy className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
          <h3 className="font-semibold">Kişisel Rekorlar</h3>
          <p className="text-sm text-gray-600 mt-1">Yakında</p>
        </Card>

        <Card className="p-6 text-center">
          <Target className="h-12 w-12 text-blue-600 mx-auto mb-3" />
          <h3 className="font-semibold">Hedefler</h3>
          <p className="text-sm text-gray-600 mt-1">Yakında</p>
        </Card>
      </div>

      <Card className="p-12 text-center bg-gray-50">
        <p className="text-gray-500">
          Performans istatistikleri özelliği yakında eklenecek!
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Antrenmanlarını tamamladıkça burada detaylı analizler görebileceksin.
        </p>
      </Card>
    </div>
  );
}
