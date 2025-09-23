'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { createBrowserSupabaseClient } from '@/lib/supabase-client';
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
  onSuccess: () => Promise<void>;
}

export default function CreateMemberAccountModal({ isOpen, onClose, client, onSuccess }: Props) {
  const [email, setEmail] = useState(client.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{email: string, password: string} | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [authData, setAuthData] = useState<any>(null);


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
    let authUserCreated = false;

    try {
      const supabase = createBrowserSupabaseClient();
      
      // Step 1: Create auth user using regular signUp (works with anon key)
      console.log('Starting member account creation for:', { clientId: client.id, email });
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/member/login`
        }
      });

      // Log auth creation result
      console.log('Auth signup result:', { authData, authError });

      if (authError) {
        console.error('Auth creation failed:', authError);
        throw new Error(authError.message);
      }

      if (!authData.user) {
        console.error('No user returned from auth creation');
        throw new Error('Auth kullanıcısı oluşturulamadı');
      }

      authUserCreated = true;
      console.log('Auth user created successfully:', {
        id: authData.user.id,
        email: authData.user.email,
        emailConfirmed: authData.user.email_confirmed_at
      });

      // Store auth data for display
      setAuthData(authData);

      // Step 2: Create member_accounts record with proper error handling
      console.log('Creating member_accounts record...');
      
      const { data: memberData, error: memberError } = await supabase
        .from('member_accounts')
        .insert({
          client_id: client.id,
          email: email,
          password_hash: 'managed_by_supabase_auth',
          is_active: true
        })
        .select()
        .single();

      // Log the member account creation result
      console.log('Member account result:', { memberData, memberError });

      if (memberError) {
        console.error('Member account creation failed:', memberError);
        
        // Since we can't delete auth users from client side, we'll just show an error
        // The auth user will remain but the member_accounts record won't exist
        throw new Error(`Üye hesabı kaydı oluşturulamadı: ${memberError.message}`);
      }

      console.log('Member account created successfully:', memberData);

      // Step 3: Update client email if needed
      if (client.email !== email) {
        console.log('Updating client email...');
        const { error: clientUpdateError } = await supabase
          .from('clients')
          .update({ email })
          .eq('id', client.id);

        if (clientUpdateError) {
          console.warn('Client email update failed:', clientUpdateError);
          // Don't throw here, this is not critical
        } else {
          console.log('Client email updated successfully');
        }
      }

      // Success - show appropriate message
      if (authData.user && !authData.user.email_confirmed_at) {
        toast.success('Üye girişi oluşturuldu! Email doğrulama linki gönderildi.');
        console.log('Email confirmation required');
      } else {
        toast.success('Üye girişi oluşturuldu!');
        console.log('Email already confirmed or confirmation not required');
      }
      
      // Show credentials to trainer
      setGeneratedCredentials({ email, password });
      setShowCredentials(true);

      // Only call onSuccess if everything completed successfully
      await onSuccess();
      
    } catch (error: any) {
      console.error('Member account creation failed:', error);
      
      // If auth user was created but member account failed, show specific error
      if (authUserCreated) {
        const errorMessage = 'Auth kullanıcısı oluşturuldu ancak üye kaydı oluşturulamadı. Lütfen tekrar deneyin.';
        toast.error(errorMessage);
        console.error('Partial failure - auth created but member account failed');
      } else {
        // Translate the error message to Turkish
        const translatedError = translateAuthError(error.message || 'Üye girişi oluşturulamadı');
        toast.error(translatedError);
      }
      
      // Don't close modal on error - let user try again
      // onSuccess() is not called, so modal stays open
    } finally {
      setLoading(false);
    }
  }

  // Reset state when modal closes
  function handleClose() {
    setShowCredentials(false);
    setGeneratedCredentials(null);
    setAuthData(null);
    setCopiedField(null);
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
              <Button type="button" variant="outline" onClick={handleClose}>
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
                {!authData?.user?.email_confirmed_at && (
                  <span className="block mt-2 font-medium text-orange-700">
                    ⚠️ Email doğrulama linki gönderildi. Üye önce emailini doğrulamalı.
                  </span>
                )}
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
              <Button onClick={handleClose}>
                Tamam
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
