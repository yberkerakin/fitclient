'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, User, Calendar, AlertCircle, Loader2 } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { 
  getClientWithSessions, 
  recordCheckIn, 
  canClientCheckIn,
  type Client 
} from '@/lib/services/clients'
import CheckInSuccess from '@/components/ui/CheckInSuccess'

export default function CheckInPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string
  
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkInSuccess, setCheckInSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheckInTime, setLastCheckInTime] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)

  // Add useRef to track active check-in and prevent duplicates
  const isCheckInInProgress = useRef(false)
  const activeCheckInId = useRef<string | null>(null)

  // Debounce time in milliseconds (5 seconds)
  const DEBOUNCE_TIME = 5000

  // Debug logging for URL and params
  useEffect(() => {
    console.log('🔗 ===== CHECK-IN PAGE DEBUG =====')
    console.log('📱 Current URL:', window.location.href)
    console.log('🔗 Full URL path:', window.location.pathname)
    console.log('🔗 URL search params:', window.location.search)
    console.log('🔗 URL hash:', window.location.hash)
    console.log('📋 All params:', params)
    console.log('👤 Client ID from params:', clientId)
    console.log('👤 Client ID type:', typeof clientId)
    console.log('👤 Client ID length:', clientId?.length)
    console.log('👤 Client ID valid UUID format:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId || ''))
    console.log('🔗 ===== END CHECK-IN PAGE DEBUG =====')
  }, [params, clientId])

  useEffect(() => {
    if (clientId) {
      console.log('🔄 Client ID detected, fetching client details...')
      fetchClientDetails()
    } else {
      console.error('❌ No client ID found in params')
      setError('Geçersiz URL - Client ID bulunamadı')
      setLoading(false)
    }
  }, [clientId])

  const fetchClientDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 ===== FETCHING CLIENT DETAILS =====')
      console.log('👤 Client ID to fetch:', clientId)
      
      // Use the new clients service function to get client with calculated sessions
      const clientWithSessions = await getClientWithSessions(clientId)
      
      if (!clientWithSessions) {
        console.error('❌ Client not found or error occurred')
        setError('Müşteri bulunamadı veya erişim hatası')
        setLoading(false)
        return
      }

      console.log('✅ Client data retrieved successfully:', clientWithSessions)
      setClient(clientWithSessions)
      setLoading(false)

    } catch (error) {
      console.error('❌ Error fetching client details:', error)
      setError('Müşteri bilgileri alınırken hata oluştu')
      setLoading(false)
    }
  }

  const handleCheckIn = useCallback(async () => {
    if (!client) return

    const uiCallId = Math.random().toString(36).substr(2, 9) // Unique UI call identifier
    console.log(`🖱️ [${uiCallId}] ===== UI CHECK-IN BUTTON CLICKED =====`)
    console.log(`🖱️ [${uiCallId}] Timestamp: ${new Date().toISOString()}`)
    console.log(`🖱️ [${uiCallId}] Client:`, client)
    console.log(`🖱️ [${uiCallId}] Current state - checkingIn: ${checkingIn}, isLoading: ${isLoading}`)
    console.log(`🖱️ [${uiCallId}] useRef state - isCheckInInProgress: ${isCheckInInProgress.current}, activeCheckInId: ${activeCheckInId.current}`)

    // Check if a check-in is already in progress (useRef protection)
    if (isCheckInInProgress.current) {
      console.log(`🚫 [${uiCallId}] Check-in already in progress (useRef protection) - blocking duplicate call`)
      toast.error('Giriş işlemi zaten devam ediyor. Lütfen bekleyin...')
      return
    }

    // Check if enough time has passed since last check-in
    const now = Date.now()
    const timeSinceLastCheckIn = now - lastCheckInTime
    
    if (timeSinceLastCheckIn < DEBOUNCE_TIME) {
      const remainingTime = Math.ceil((DEBOUNCE_TIME - timeSinceLastCheckIn) / 1000)
      console.log(`⏰ [${uiCallId}] Debounce check failed - ${remainingTime} seconds remaining`)
      toast.error(`Çok hızlı tıklıyorsunuz. Lütfen ${remainingTime} saniye bekleyin.`)
      return
    }

    // Check if already processing (state-based protection)
    if (checkingIn || isLoading) {
      console.log(`🚫 [${uiCallId}] Already processing (state protection) - blocking duplicate call`)
      toast.error('İşlem devam ediyor, lütfen bekleyin...')
      return
    }

    try {
      console.log(`🔄 [${uiCallId}] Starting check-in process...`)
      
      // Set useRef flag to prevent duplicate calls
      isCheckInInProgress.current = true
      activeCheckInId.current = uiCallId
      
      setCheckingIn(true)
      setIsLoading(true)
      setLastCheckInTime(now)

      console.log(`🔄 [${uiCallId}] Calling recordCheckIn function...`)

      // Use the new clients service function for check-in
      const result = await recordCheckIn(client.id, client.trainer_id)

      console.log(`🔄 [${uiCallId}] recordCheckIn returned:`, result)

      if (result.success) {
        console.log(`✅ [${uiCallId}] Check-in successful`)
        
        // Update local state with new remaining sessions
        setClient(prev => prev ? {
          ...prev,
          remaining_sessions: result.remainingSessions || 0
        } : null)
        
        // Show success
        setCheckInSuccess(true)
        setCheckingIn(false)
        setIsLoading(false)
      } else {
        // Handle specific error types
        console.log(`❌ [${uiCallId}] Check-in failed with error:`, result.error)

        switch (result.error) {
          case 'NO_SESSIONS_LEFT':
            toast.error('Ders hakkınız kalmamış')
            break
          case 'RECENT_CHECK_IN':
            toast.error('Yakın zamanda giriş yapıldı. Lütfen 30 saniye bekleyin.')
            break
          case 'NETWORK_ERROR':
            toast.error('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.')
            break
          case 'TIMEOUT_ERROR':
            toast.error('İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.')
            break
          default:
            toast.error(result.message || 'Giriş işlemi başarısız oldu')
        }
        
        setCheckingIn(false)
        setIsLoading(false)
      }

    } catch (error) {
      console.error(`❌ [${uiCallId}] Check-in error:`, error)
      toast.error('Beklenmeyen bir hata oluştu')
      setCheckingIn(false)
      setIsLoading(false)
    } finally {
      // Always reset useRef flags
      console.log(`🔄 [${uiCallId}] Resetting useRef flags`)
      isCheckInInProgress.current = false
      activeCheckInId.current = null
    }
  }, [client, lastCheckInTime, checkingIn, isLoading])

  const handleSuccessDismiss = () => {
    router.push('/')
  }

  // Check if button should be disabled
  const isButtonDisabled = () => {
    return (
      isLoading || 
      checkingIn || 
      isCheckInInProgress.current || // Add useRef check
      (client?.remaining_sessions || 0) <= 0 ||
      (Date.now() - lastCheckInTime) < DEBOUNCE_TIME
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 flex items-center justify-center p-6">
        <div className="text-center space-y-6">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto" />
          <p className="text-white text-lg">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm border border-red-400/30">
            <AlertCircle className="w-12 h-12 text-red-400" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-white">
              Hata
            </h1>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <p className="text-lg text-white">
                {error}
              </p>
            </div>
            
            <Button
              onClick={() => router.push('/')}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-2xl text-lg transition-colors border border-white/20"
            >
              Ana Sayfaya Dön
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (checkInSuccess && client) {
    return (
      <CheckInSuccess
        clientName={client.name}
        remainingSessions={client.remaining_sessions}
        onDismiss={handleSuccessDismiss}
        autoDismissDelay={3000}
      />
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm border border-red-400/30">
            <AlertCircle className="w-12 h-12 text-red-400" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-white">
              Müşteri Bulunamadı
            </h1>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <p className="text-lg text-white">
                Bu QR kod ile ilişkili müşteri bulunamadı.
              </p>
            </div>
            
            <Button
              onClick={() => router.push('/')}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-2xl text-lg transition-colors border border-white/20"
            >
              Ana Sayfaya Dön
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
          <User className="w-12 h-12 text-white" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white">
            {client.name}
          </h1>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Calendar className="w-6 h-6 text-white" />
              <span className="text-lg text-white">Kalan Seanslar</span>
            </div>
            
            <div className="text-center">
              <span className={`text-4xl font-bold ${
                client.remaining_sessions > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {client.remaining_sessions}
              </span>
              <p className="text-sm text-white/60 mt-1">ders</p>
            </div>
          </div>
          
          {client.remaining_sessions > 0 ? (
            <Button
              onClick={handleCheckIn}
              disabled={isButtonDisabled()}
              className={`w-full font-semibold py-4 px-6 rounded-2xl text-lg transition-colors ${
                isButtonDisabled()
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {checkingIn ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Giriş Yapılıyor...
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Kontrol Ediliyor...
                </div>
              ) : (
                'Giriş Yap'
              )}
            </Button>
          ) : (
            <div className="bg-red-500/20 border border-red-400/30 rounded-2xl p-4 backdrop-blur-sm">
              <p className="text-sm text-red-200">
                Ders hakkınız kalmamış
              </p>
              <p className="text-xs text-red-300 mt-1">
                Yeni paket satın almanız gerekiyor
              </p>
            </div>
          )}

          {/* Debounce Warning */}
          {(Date.now() - lastCheckInTime) < DEBOUNCE_TIME && (
            <div className="text-center">
              <p className="text-yellow-200 text-sm">
                Çok hızlı tıklamayın. Lütfen bekleyin...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 