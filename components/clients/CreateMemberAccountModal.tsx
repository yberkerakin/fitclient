'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { translateAuthError } from '@/lib/utils/auth-error-translator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  onSuccess: () => void;
}

export default function CreateMemberAccountModal({ isOpen, onClose, client, onSuccess }: Props) {
  const [email, setEmail] = useState(client.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);


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
      const response = await fetch('/api/create-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          clientId: client.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Member oluşturulamadı');
      }

      // Success - no session change!
      toast.success('Üye girişi oluşturuldu');

      // Show credentials
      alert(`
        Üye Giriş Bilgileri:
        Email: ${email}
        Şifre: ${password}
        
        Bu bilgileri üyeye iletin.
      `);

      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('Member account creation failed:', error);
      
      // Translate the error message to Turkish
      const translatedError = translateAuthError(error.message || 'Üye girişi oluşturulamadı');
      toast.error(translatedError);
      
      // Don't close modal on error - let user try again
    } finally {
      setLoading(false);
    }
  }

  // Reset state when modal closes
  function handleClose() {
    setEmail(client.email || '');
    setPassword('');
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Üye Girişi Oluştur - {client.name}</DialogTitle>
        </DialogHeader>

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
            <Button type="button" variant="outline" onClick={handleClose}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Oluşturuluyor...' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
