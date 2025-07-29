'use client'

import { useState, useEffect } from 'react'
import { Download, Printer, X, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'


interface Client {
  id: string
  name: string
  qr_code?: string
}

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client | null
}

export default function QRCodeModal({ isOpen, onClose, client }: QRCodeModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [baseUrl, setBaseUrl] = useState<string>('')
  const [checkinUrl, setCheckinUrl] = useState<string>('')

  useEffect(() => {
    if (isOpen && client?.id) {
      generateQRCode()
    }
  }, [isOpen, client])

  const generateQRCode = async () => {
    if (!client?.id) return

    try {
      setLoading(true)
      
      // Get base URL from environment variable or fallback
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://172.20.10.15:3000'
      setBaseUrl(baseUrl)
      
      // Generate check-in URL
      const url = `${baseUrl}/checkin/${client.id}`
      setCheckinUrl(url)
      
      // Log the full URL being encoded in QR
      console.log('🔗 ===== QR CODE URL DEBUG =====')
      console.log('📱 Full URL being encoded in QR:', url)
      console.log('🌐 Base URL used:', baseUrl)
      console.log('🔧 Environment variable NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'not set')
      console.log('👤 Client ID:', client.id)
      console.log('👤 Client Name:', client.name)
      console.log('🔗 ===== END QR CODE URL DEBUG =====')
      
      // Generate QR code using the full check-in URL
      const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(url)}`
      setQrCodeUrl(qrCodeApiUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast.error('QR kodu oluşturulurken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!qrCodeUrl) return

    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `${client?.name || 'client'}-qr-code.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('QR kodu indirildi')
  }

  const handlePrint = () => {
    if (!qrCodeUrl) return

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Kod - ${client?.name}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px;
                margin: 0;
              }
              .qr-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
              }
              .client-name {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
              }
              .qr-code {
                border: 2px solid #333;
                padding: 10px;
              }
              .qr-code img {
                width: 256px;
                height: 256px;
              }
              @media print {
                body { margin: 0; }
                .qr-container { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <div class="client-name">${client?.name}</div>
              <div class="qr-code">
                <img src="${qrCodeUrl}" alt="QR Code" />
              </div>
              <p>QR Kod - ${client?.name}</p>
              <p style="font-size: 12px; color: #666; margin-top: 10px;">
                Check-in URL: ${checkinUrl}
              </p>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
      
      toast.success('Yazdırma başlatıldı')
    }
  }

  if (!client) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            QR Kod - {client.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Check-in URL Info */}
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              Bu QR kod tarandığında check-in sayfası açılır:
            </p>
            {checkinUrl && (
              <div className="space-y-3">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Debug - Check-in URL:</p>
                  <p className="text-xs text-purple-600 font-mono break-all">
                    {checkinUrl}
                  </p>
                </div>
                {baseUrl.includes('vercel.app') ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <Info className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-green-800">
                        <p className="font-semibold mb-1">Vercel URL Kullanılıyor</p>
                        <p>Production URL kullanılıyor: {baseUrl}</p>
                      </div>
                    </div>
                  </div>
                ) : baseUrl.includes('172.20.10.15') ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <Info className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-yellow-800">
                        <p className="font-semibold mb-1">Fallback IP Kullanılıyor</p>
                        <p>NEXT_PUBLIC_APP_URL ayarlanmamış. Varsayılan IP adresi kullanılıyor.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-800">
                        <p className="font-semibold mb-1">Custom URL Kullanılıyor</p>
                        <p>Environment variable ayarlandı: {baseUrl}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* QR Code Display */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              {loading ? (
                <div className="w-64 h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt={`QR Code for ${client.name}`}
                  className="w-64 h-64"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-gray-500">
                  QR kod yüklenemedi
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleDownload}
              disabled={!qrCodeUrl || loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              QR Kodu İndir
            </Button>
            
            <Button 
              onClick={handlePrint}
              disabled={!qrCodeUrl || loading}
              variant="outline"
              className="flex-1"
            >
              <Printer className="h-4 w-4 mr-2" />
              Yazdır
            </Button>
          </div>

          {/* Close Button */}
          <div className="flex justify-center">
            <Button 
              onClick={onClose}
              variant="ghost"
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4 mr-2" />
              Kapat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 