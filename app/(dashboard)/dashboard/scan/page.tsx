'use client'

import { useState, useEffect, useRef } from 'react'
import { QrCode, Search, User, CheckCircle, AlertCircle, Users } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Client {
  id: string
  name: string
  remaining_sessions: number
  trainer_id: string
}

interface Trainer {
  id: string
  name: string
}

export default function ScanPage() {
  const [activeTab, setActiveTab] = useState<'qr' | 'manual'>('qr')
  const [scanning, setScanning] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkInSuccess, setCheckInSuccess] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [trainer, setTrainer] = useState<Trainer | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetchTrainerAndClients()
  }, [])

  const fetchTrainerAndClients = async () => {
    try {
      setLoading(true)
      const supabase = createBrowserSupabaseClient()

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        toast.error('Kullanıcı bilgisi alınırken hata oluştu')
        return
      }

      // Get trainer
      const { data: trainerData, error: trainerError } = await supabase
        .from('trainers')
        .select('id, name')
        .eq('user_id', user.id)
        .single()

      if (trainerError || !trainerData) {
        toast.error('Eğitmen profili alınırken hata oluştu')
        return
      }

      setTrainer(trainerData)

      // Fetch all clients for this trainer
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, remaining_sessions, trainer_id')
        .eq('trainer_id', trainerData.id)
        .order('name')

      if (clientsError) {
        toast.error('Müşteriler yüklenirken hata oluştu')
        return
      }

      setClients(clientsData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Veri yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const startQRScan = async () => {
    try {
      setScanning(true)
      setCheckInSuccess(false)
      setSelectedClient(null)

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      // Start scanning loop
      scanQRCode()

    } catch (error) {
      console.error('Error starting camera:', error)
      toast.error('Kamera erişimi sağlanamadı')
      setScanning(false)
    }
  }

  const stopQRScan = () => {
    setScanning(false)
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const scanQRCode = () => {
    if (!scanning || !videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    
    // Simple QR code detection (in production, use a proper QR library)
    // For now, we'll simulate QR detection
    setTimeout(() => {
      if (scanning) {
        scanQRCode()
      }
    }, 100)
  }

  const handleQRCodeDetected = (qrData: string) => {
    console.log('QR Code detected:', qrData)
    
    // Extract clientId from URL format: http://localhost:3000/checkin/{clientId}
    const urlMatch = qrData.match(/\/checkin\/([^\/\?]+)/)
    if (urlMatch) {
      const clientId = urlMatch[1]
      processCheckIn(clientId)
    } else {
      toast.error('Geçersiz QR kod formatı')
    }
  }

  const processCheckIn = async (clientId: string) => {
    try {
      setCheckingIn(true)
      console.log('🔄 Processing check-in for client ID:', clientId)

      const supabase = createBrowserSupabaseClient()

      // Find client
      const client = clients.find(c => c.id === clientId)
      if (!client) {
        toast.error('Müşteri bulunamadı')
        return
      }

      setSelectedClient(client)

      // Verify remaining sessions
      if (client.remaining_sessions <= 0) {
        toast.error('Müşterinin kalan seansı bulunmamaktadır')
        return
      }

      // Create session record
      const sessionData = {
        client_id: client.id,
        trainer_id: client.trainer_id,
        session_date: new Date().toISOString(),
        status: 'completed'
      }

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert([sessionData])
        .select()
        .single()

      if (sessionError) {
        console.error('❌ Error creating session:', sessionError)
        toast.error('Check-in işlemi başarısız oldu')
        return
      }

      // Update client's remaining sessions
      const newRemainingSessions = client.remaining_sessions - 1
      
      const { error: updateError } = await supabase
        .from('clients')
        .update({ 
          remaining_sessions: newRemainingSessions,
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id)

      if (updateError) {
        console.error('❌ Error updating client sessions:', updateError)
        toast.error('Seans güncellenirken hata oluştu')
        return
      }

      // Update local state
      setClients(prevClients => 
        prevClients.map(c => 
          c.id === client.id 
            ? { ...c, remaining_sessions: newRemainingSessions }
            : c
        )
      )

      // Show success
      setCheckInSuccess(true)
      toast.success(`${client.name} başarıyla check-in yaptı!`)

      // Stop scanning
      stopQRScan()

      // Reset after 3 seconds
      setTimeout(() => {
        setCheckInSuccess(false)
        setSelectedClient(null)
      }, 3000)

    } catch (error) {
      console.error('❌ Unexpected error during check-in:', error)
      toast.error('Check-in sırasında beklenmeyen hata oluştu')
    } finally {
      setCheckingIn(false)
    }
  }

  const handleManualCheckIn = async (client: Client) => {
    if (client.remaining_sessions <= 0) {
      toast.error('Müşterinin kalan seansı bulunmamaktadır')
      return
    }

    await processCheckIn(client.id)
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Check-in</h1>
        <p className="text-gray-600 mt-1">
          Müşteri check-in işlemlerini yönetin
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          variant={activeTab === 'qr' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('qr')}
          className="flex-1"
        >
          <QrCode className="h-4 w-4 mr-2" />
          QR Kod
        </Button>
        <Button
          variant={activeTab === 'manual' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('manual')}
          className="flex-1"
        >
          <Users className="h-4 w-4 mr-2" />
          Manuel
        </Button>
      </div>

      {/* QR Scanner Tab */}
      {activeTab === 'qr' && (
        <div className="space-y-6">
          {!scanning ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <QrCode className="h-5 w-5 mr-2" />
                  QR Kod Check-in
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                    <QrCode className="h-12 w-12 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      QR Kod Tarayıcı
                    </h3>
                    <p className="text-gray-600">
                      Müşterinin QR kodunu okutmasını isteyin
                    </p>
                  </div>
                  <Button
                    onClick={startQRScan}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Taramayı Başlat
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <QrCode className="h-5 w-5 mr-2" />
                    QR Kod Tarama
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stopQRScan}
                  >
                    Durdur
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full h-64 bg-black rounded-lg"
                    autoPlay
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-white rounded-lg p-2">
                      <div className="w-48 h-48 border-2 border-white rounded-lg"></div>
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-gray-600 mt-4">
                  QR kodu çerçeve içine alın
                </p>
              </CardContent>
            </Card>
          )}

          {/* Check-in Success */}
          {checkInSuccess && selectedClient && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      Check-in Başarılı!
                    </h3>
                    <p className="text-green-700">
                      {selectedClient.name} başarıyla check-in yaptı
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      Kalan seans: {selectedClient.remaining_sessions - 1}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Manual Check-in Tab */}
      {activeTab === 'manual' && (
        <div className="space-y-6">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="h-5 w-5 mr-2" />
                Müşteri Ara
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Müşteri adı ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Client List */}
          <div className="space-y-3">
            {filteredClients.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz müşteri yok'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredClients.map((client) => (
                <Card key={client.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {client.name}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge 
                              variant={client.remaining_sessions > 0 ? "default" : "secondary"}
                              className={`text-xs ${
                                client.remaining_sessions > 0 
                                  ? 'bg-green-100 text-green-700 border-green-200' 
                                  : 'bg-gray-100 text-gray-600 border-gray-200'
                              }`}
                            >
                              {client.remaining_sessions} seans
                            </Badge>
                            {client.remaining_sessions === 0 && (
                              <span className="text-xs text-red-500">Seans yok</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleManualCheckIn(client)}
                        disabled={checkingIn || client.remaining_sessions <= 0}
                        size="sm"
                        className={
                          client.remaining_sessions > 0
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }
                      >
                        {checkingIn && selectedClient?.id === client.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Check-in
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
} 