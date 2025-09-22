'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';
import { createMemberAccount } from '@/lib/services/member-accounts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    name: string;
    email?: string;
  };
  onSuccess: () => void;
}

export default function CreateMemberAccountModal({ isOpen, onClose, client, onSuccess }: Props) {
  const [email, setEmail] = useState(client.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{email: string, password: string} | null>(null);

  function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Email ve şifre zorunludur');
      return;
    }

    setLoading(true);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      });

      if (authError) throw authError;

      // Create member account using service
      await createMemberAccount(client.id, email, password);

      // Update client email if needed
      if (client.email !== email) {
        await supabase
          .from('clients')
          .update({ email })
          .eq('id', client.id);
      }

      toast.success('Üye girişi oluşturuldu');
      
      // Show credentials to trainer
      setGeneratedCredentials({ email, password });
      setShowCredentials(true);

      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Üye girişi oluşturulamadı');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Üye Girişi Oluştur - {client.name}</DialogTitle>
        </DialogHeader>

        {!showCredentials ? (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label>Email</Label>
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
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    required
                    minLength={6}
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={generatePassword}
                  >
                    Oluştur
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                İptal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ Üye Girişi Oluşturuldu!</h3>
              <p className="text-green-700 text-sm mb-3">Bu bilgileri üyeye iletin:</p>
              
              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium">Email:</Label>
                  <div className="bg-white border rounded px-3 py-2 font-mono text-sm">
                    {generatedCredentials?.email}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Şifre:</Label>
                  <div className="bg-white border rounded px-3 py-2 font-mono text-sm">
                    {generatedCredentials?.password}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={onClose}>
                Tamam
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
