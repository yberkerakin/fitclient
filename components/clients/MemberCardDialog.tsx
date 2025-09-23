'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { createBrowserSupabaseClient } from '@/lib/supabase-client';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, Copy, CheckCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
}

export default function MemberCardDialog({ isOpen, onClose, client }: Props) {
  const [trainerInfo, setTrainerInfo] = useState<{
    name: string;
    phone?: string;
    email?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate QR code data for check-in only
  const qrValue = JSON.stringify({
    type: 'member_checkin',
    clientId: client.id,
    name: client.name
  });

  const loadTrainerInfo = async () => {
    if (trainerInfo) return; // Already loaded
    
    try {
      setLoading(true);
      const supabase = createBrowserSupabaseClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: trainer } = await supabase
        .from('trainers')
        .select('name, phone, email')
        .eq('user_id', user.id)
        .single();

      if (trainer) {
        setTrainerInfo(trainer);
      }
    } catch (error) {
      console.error('Error loading trainer info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('member-card-print');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Üye Kartı - ${client.name}</title>
          <style>
            @media print {
              @page { 
                margin: 0.5in; 
                size: 3.375in 2.125in; /* Standard credit card size */
              }
              body { 
                margin: 0; 
                padding: 0; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              }
            }
            .member-card {
              width: 3.375in;
              height: 2.125in;
              background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
              border-radius: 12px;
              padding: 16px;
              box-sizing: border-box;
              position: relative;
              overflow: hidden;
              color: white;
            }
            .card-content {
              display: flex;
              justify-content: space-between;
              align-items: center;
              height: 100%;
            }
            .card-left {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              height: 100%;
            }
            .member-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .login-info {
              font-size: 10px;
              opacity: 0.9;
              margin-bottom: 8px;
            }
            .trainer-info {
              font-size: 8px;
              opacity: 0.8;
            }
            .qr-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .qr-code {
              width: 60px;
              height: 60px;
              background: white;
              border-radius: 8px;
              padding: 4px;
              margin-bottom: 4px;
            }
            .qr-label {
              font-size: 8px;
              text-align: center;
              opacity: 0.9;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const copyCardInfo = () => {
    const cardText = `Üye Kartı - ${client.name}
QR Kod: Giriş için kullanın
Giriş: app.fitclient.co/member/login
Eğitmen: ${trainerInfo?.name || 'Bilinmiyor'}`;
    
    navigator.clipboard.writeText(cardText).then(() => {
      setCopied(true);
      toast.success('Kart bilgileri kopyalandı');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isOpen && !trainerInfo && !loading) {
    loadTrainerInfo();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Üye Kartı - {client.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Printable Member Card */}
          <div id="member-card-print" className="member-card">
            <div className="card-content">
              <div className="card-left">
                <div>
                  <div className="member-name">{client.name}</div>
                  <div className="login-info">Giriş: app.fitclient.co/member/login</div>
                </div>
                <div className="trainer-info">
                  <div>Eğitmen: {trainerInfo?.name || 'Yükleniyor...'}</div>
                  {trainerInfo?.phone && <div>Tel: {trainerInfo.phone}</div>}
                </div>
              </div>
              <div className="qr-section">
                <div className="qr-code">
                  <QRCodeSVG value={qrValue} size={52} />
                </div>
                <div className="qr-label">Giriş QR</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handlePrint} variant="outline" className="h-10">
              <Printer className="h-4 w-4 mr-2" />
              Yazdır
            </Button>
            
            <Button onClick={copyCardInfo} variant="outline" className="h-10">
              {copied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Kopyala
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-2">Kullanım Talimatları:</p>
            <ul className="space-y-1 text-xs">
              <li>• Bu kart sadece giriş için kullanılır</li>
              <li>• QR kodu salon girişinde okutulur</li>
              <li>• Üye girişi için app.fitclient.co/member/login adresini kullanın</li>
              <li>• Kartı yazdırıp üyeye verin</li>
            </ul>
          </div>

          <Button onClick={onClose} className="w-full">
            Tamam
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
