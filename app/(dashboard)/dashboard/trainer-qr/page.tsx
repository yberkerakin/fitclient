'use client'

import { useState, useEffect } from 'react'
import { QrCode, Download, Printer, User } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface Trainer {
  id: string
  name: string
  email: string
}

export default function TrainerQRPage() {
  const [trainer, setTrainer] = useState<Trainer | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTrainerInfo()
  }, [])

  const fetchTrainerInfo = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Fetching trainer information...')
      
      const supabase = createBrowserSupabaseClient()

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('❌ User error:', userError)
        setError('Kullanıcı bilgisi alınamadı')
        return
      }

      // Get trainer record
      const { data: trainerData, error: trainerError } = await supabase
        .from('trainers')
        .select('id, name, email')
        .eq('user_id', user.id)
        .single()

      if (trainerError || !trainerData) {
        console.error('❌ Trainer error:', trainerError)
        setError('Eğitmen profili bulunamadı')
        return
      }

      console.log('✅ Trainer found:', trainerData)
      setTrainer(trainerData)

      // Generate QR code URL - Use new /go/ route for shorter, simpler QR codes
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      if (!baseUrl) {
        console.error('❌ NEXT_PUBLIC_APP_URL is not set!')
        setError('QR kodu oluşturulamadı - Uygulama URL\'i ayarlanmamış')
        return
      }
      
      const checkinUrl = `${baseUrl}/go/${trainerData.id}`
      
      console.log('🔗 ===== QR CODE URL GENERATION =====')
      console.log('🌐 Base URL (NEXT_PUBLIC_APP_URL):', baseUrl)
      console.log('👤 Trainer ID:', trainerData.id)
      console.log('🔗 Full check-in URL:', checkinUrl)
      console.log('📱 QR will point to Vercel:', baseUrl.includes('vercel.app'))
      console.log('🔗 ===== END QR CODE URL GENERATION =====')
      
      // Generate QR code
      const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkinUrl)}`
      setQrCodeUrl(qrCodeApiUrl)

    } catch (error: any) {
      console.error('❌ Unexpected error:', error)
      setError('Beklenmeyen hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const downloadQRCode = async () => {
    if (!qrCodeUrl) return

    try {
      console.log('📥 Downloading QR code...')
      
      const response = await fetch(qrCodeUrl)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `trainer-qr-${trainer?.name || 'qr'}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('QR kodu başarıyla indirildi!')
    } catch (error) {
      console.error('❌ Download error:', error)
      toast.error('QR kodu indirilirken hata oluştu')
    }
  }

  const printQRCode = () => {
    if (!qrCodeUrl || !trainer) return

    try {
      console.log('🖨️ Printing QR code...')
      
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast.error('Yazdırma penceresi açılamadı')
        return
      }

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Eğitmen QR Kodu - ${trainer.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              text-align: center;
              background: white;
            }
            .qr-container {
              max-width: 400px;
              margin: 0 auto;
              padding: 20px;
              border: 2px solid #333;
              border-radius: 10px;
            }
            .qr-title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #333;
            }
            .qr-code {
              margin: 20px 0;
            }
            .qr-code img {
              width: 300px;
              height: 300px;
              border: 1px solid #ddd;
            }
            .trainer-info {
              margin: 20px 0;
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .trainer-name {
              font-size: 20px;
              font-weight: bold;
              color: #333;
              margin-bottom: 10px;
            }
            .trainer-description {
              font-size: 14px;
              color: #666;
              line-height: 1.5;
            }
            .instructions {
              margin-top: 20px;
              padding: 15px;
              background: #e3f2fd;
              border-radius: 8px;
              border-left: 4px solid #2196f3;
            }
            .instructions h3 {
              margin: 0 0 10px 0;
              color: #1976d2;
              font-size: 16px;
            }
            .instructions p {
              margin: 0;
              color: #424242;
              font-size: 14px;
            }
            @media print {
              body { margin: 0; }
              .qr-container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-title">Üye Giriş QR Kodu</div>
            
            <div class="qr-code">
              <img src="${qrCodeUrl}" alt="Trainer QR Code" />
            </div>
            
            <div class="trainer-info">
              <div class="trainer-name">${trainer.name}</div>
              <div class="trainer-description">
                Üyeleriniz bu QR kodu okutarak ders girişi yapabilir
              </div>
            </div>
            
            <div class="instructions">
              <h3>Kullanım Talimatları</h3>
              <p>Bu QR kodu salonunuzda görünür bir yere asabilirsiniz. Üyeler telefonlarıyla QR kodu tarayarak kolayca ders girişi yapabilirler.</p>
            </div>
          </div>
        </body>
        </html>
      `

      printWindow.document.write(printContent)
      printWindow.document.close()
      
      // Wait for images to load before printing
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 500)
      }
      
      toast.success('Yazdırma penceresi açıldı!')
    } catch (error) {
      console.error('❌ Print error:', error)
      toast.error('Yazdırma sırasında hata oluştu')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">QR kodu yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Hata</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchTrainerInfo} variant="outline">
            Tekrar Dene
          </Button>
        </div>
      </div>
    )
  }

  if (!trainer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600">Eğitmen bilgisi bulunamadı</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Eğitmen QR Kodu</h1>
        <p className="text-gray-600 mt-1">
          Üyeleriniz için QR kodu oluşturun ve yazdırın
        </p>
      </div>

      {/* QR Code Card */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2">
            <QrCode className="h-6 w-6 text-purple-600" />
            <span>Üye Giriş QR Kodu</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* QR Code Display */}
          <div className="flex justify-center">
            {qrCodeUrl ? (
              <div className="space-y-4">
                <img 
                  src={qrCodeUrl} 
                  alt="Trainer QR Code" 
                  className="w-[300px] h-[300px] border border-gray-200 rounded-lg shadow-sm"
                />
                
                {/* Trainer Info */}
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {trainer.name}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Üyeleriniz bu QR kodu okutarak ders girişi yapabilir
                  </p>
                  
                  {/* Simple Instruction */}
                  <p className="text-sm text-gray-500 mt-2">
                    Üyeler QR okutunca çıkan linke tıklasın
                  </p>
                  
                  {/* URL Status Indicator */}
                  {process.env.NEXT_PUBLIC_APP_URL && (
                    <div className={`mt-3 p-2 rounded-lg text-xs font-medium ${
                      process.env.NEXT_PUBLIC_APP_URL.includes('vercel.app') 
                        ? 'bg-green-50 border border-green-200 text-green-700' 
                        : 'bg-blue-50 border border-blue-200 text-blue-700'
                    }`}>
                      <div className="flex items-center justify-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        <span>
                          {process.env.NEXT_PUBLIC_APP_URL.includes('vercel.app') 
                            ? 'QR kodu Vercel URL\'ini kullanıyor' 
                            : 'QR kodu özel URL kullanıyor'
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-[300px] h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">QR kodu yükleniyor...</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <Button 
              onClick={downloadQRCode}
              disabled={!qrCodeUrl}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              QR Kodu İndir
            </Button>
            
            <Button 
              onClick={printQRCode}
              disabled={!qrCodeUrl}
              variant="outline"
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              Yazdır
            </Button>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <QrCode className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900 mb-1">
                  Kullanım Talimatları
                </h3>
                <p className="text-sm text-purple-700">
                  Bu QR kodu salonunuzda görünür bir yere asabilirsiniz. 
                  Üyeler telefonlarıyla QR kodu tarayarak kolayca ders girişi yapabilirler.
                </p>
              </div>
            </div>
          </div>

          {/* Debug Info (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-2">Debug Bilgileri:</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>Trainer ID: {trainer.id}</p>
                <p>Base URL: {process.env.NEXT_PUBLIC_APP_URL || 'NOT SET'}</p>
                <p>Full QR URL: {process.env.NEXT_PUBLIC_APP_URL || 'NOT SET'}/go/{trainer.id}</p>
                <p>Environment: {process.env.NODE_ENV}</p>
                {process.env.NEXT_PUBLIC_APP_URL && (
                  <div className={`mt-2 p-2 rounded text-xs font-medium ${
                    process.env.NEXT_PUBLIC_APP_URL.includes('vercel.app') 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {process.env.NEXT_PUBLIC_APP_URL.includes('vercel.app') 
                      ? '✅ Using Vercel URL - QR will work from any device' 
                      : '⚠️ Using custom URL - QR may not work from all devices'
                    }
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 