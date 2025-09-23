'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { createBrowserSupabaseClient } from '@/lib/supabase-client';
import { createMemberAccount } from '@/lib/services/member-accounts';
import { translateAuthError } from '@/lib/utils/auth-error-translator';
import { Copy, MessageSquare, Mail, Phone, CheckCircle } from 'lucide-react';

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
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{email: string, password: string} | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);


  function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  }

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field} panoya kopyalandı`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Kopyalama başarısız');
    }
  }

  function copyAllCredentials() {
    if (!generatedCredentials) return;
    const credentials = `Email: ${generatedCredentials.email}\nŞifre: ${generatedCredentials.password}\nGiriş URL: https://app.fitclient.co/member/login`;
    copyToClipboard(credentials, 'Tüm bilgiler');
  }

  function getWhatsAppLink() {
    if (!generatedCredentials) return '';
    const message = `Merhaba ${client.name}! FitClient hesabınız oluşturuldu. Giriş bilgileriniz:\n\nEmail: ${generatedCredentials.email}\nŞifre: ${generatedCredentials.password}\n\nGiriş için: https://app.fitclient.co/member/login`;
    return `https://wa.me/${client.phone?.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`;
  }

  function getSMSLink() {
    if (!generatedCredentials) return '';
    const message = `FitClient hesabınız oluşturuldu. Email: ${generatedCredentials.email}, Şifre: ${generatedCredentials.password}. Giriş: https://app.fitclient.co/member/login`;
    return `sms:${client.phone}?body=${encodeURIComponent(message)}`;
  }

  function getEmailLink() {
    if (!generatedCredentials) return '';
    const subject = 'FitClient Hesap Bilgileriniz';
    const body = `Merhaba ${client.name},

FitClient hesabınız başarıyla oluşturuldu. Giriş bilgileriniz:

Email: ${generatedCredentials.email}
Şifre: ${generatedCredentials.password}

Giriş için bu linki kullanın: https://app.fitclient.co/member/login

İyi antrenmanlar!
FitClient Ekibi`;
    return `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Email ve şifre zorunludur');
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      
      // Create member account using service (handles auth user creation)
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
      // Translate the error message to Turkish
      const translatedError = translateAuthError(error.message || 'Üye girişi oluşturulamadı');
      toast.error(translatedError);
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
          <div className="space-y-6 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Üye Girişi Oluşturuldu!</h3>
              </div>
              
              <p className="text-green-700 text-sm mb-4">
                Bu bilgileri üyeye iletin. Üye bu bilgilerle https://app.fitclient.co/member/login adresinden giriş yapabilir.
              </p>
              
              <Card className="p-4 bg-white">
                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Email:</Label>
                    <div className="flex gap-2 mt-1">
                      <div className="flex-1 bg-gray-50 border rounded px-3 py-2 font-mono text-sm">
                        {generatedCredentials?.email}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedCredentials?.email || '', 'Email')}
                      >
                        {copiedField === 'Email' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Password */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Şifre:</Label>
                    <div className="flex gap-2 mt-1">
                      <div className="flex-1 bg-gray-50 border rounded px-3 py-2 font-mono text-sm">
                        {generatedCredentials?.password}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedCredentials?.password || '', 'Şifre')}
                      >
                        {copiedField === 'Şifre' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Login URL */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Giriş URL:</Label>
                    <div className="flex gap-2 mt-1">
                      <div className="flex-1 bg-gray-50 border rounded px-3 py-2 font-mono text-sm">
                        https://app.fitclient.co/member/login
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard('https://app.fitclient.co/member/login', 'URL')}
                      >
                        {copiedField === 'URL' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Copy All Button */}
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={copyAllCredentials}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Tüm Bilgileri Kopyala
                  </Button>
                </div>
              </Card>
            </div>

            {/* Sharing Options */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Bilgileri Paylaş:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {client.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getWhatsAppLink(), '_blank')}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp
                  </Button>
                )}
                
                {client.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getSMSLink(), '_self')}
                    className="flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    SMS
                  </Button>
                )}
                
                {client.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getEmailLink(), '_self')}
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                )}
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
