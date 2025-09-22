'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, Calendar, QrCode } from 'lucide-react';
import { getMemberSession } from '@/lib/auth/member-auth';
import { createBrowserSupabaseClient } from '@/lib/supabase-client';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function MemberProfilePage() {
  const [member, setMember] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const session = await getMemberSession();
      if (!session) return;

      setMember(session);
      setFormData({
        name: session.client.name,
        phone: session.client.phone || '',
        email: session.email
      });
    } catch (error) {
      toast.error('Profil yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();

    try {
      const supabase = createBrowserSupabaseClient();
      
      // Update client info
      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          phone: formData.phone
        })
        .eq('id', member.client_id);

      if (error) throw error;

      toast.success('Profil güncellendi');
      setEditing(false);
      loadProfile();
    } catch (error) {
      toast.error('Profil güncellenemedi');
    }
  }

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  const qrValue = JSON.stringify({
    type: 'member',
    id: member.client_id,
    name: member.client.name
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profilim</h1>
        <p className="text-gray-600 mt-1">Kişisel bilgilerini görüntüle ve düzenle</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Info Card */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Kişisel Bilgiler</h2>
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Düzenle
              </Button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label>Ad Soyad</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Telefon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(5XX) XXX XX XX"
                />
              </div>

              <div>
                <Label>E-posta</Label>
                <Input
                  value={formData.email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">E-posta adresi değiştirilemez</p>
              </div>

              <div className="flex gap-2">
                <Button type="submit">Kaydet</Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  İptal
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Ad Soyad</p>
                  <p className="font-medium">{member.client.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Telefon</p>
                  <p className="font-medium">{member.client.phone || 'Belirtilmemiş'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">E-posta</p>
                  <p className="font-medium">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Üyelik Tarihi</p>
                  <p className="font-medium">
                    {new Date(member.client.created_at).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* QR Code Card */}
        <Card className="p-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold mb-4">QR Kodum</h2>
            <div className="bg-gray-50 p-4 rounded-lg inline-block mb-4">
              <QRCodeSVG value={qrValue} size={150} />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Salona girişte bu QR kodu okut
            </p>
            <Button onClick={() => setShowQR(true)}>
              <QrCode className="mr-2 h-4 w-4" />
              Büyük Göster
            </Button>
          </div>
        </Card>
      </div>

      {/* QR Modal */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">QR Kodum</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="bg-white p-4 rounded-lg inline-block">
              <QRCodeSVG value={qrValue} size={250} />
            </div>
            <p className="mt-4 text-sm text-gray-600">{member.client.name}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
