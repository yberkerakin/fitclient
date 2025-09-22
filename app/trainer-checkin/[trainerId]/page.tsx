'use client'

import { useState, useEffect, useCallback, useRef } from 'react' // Added useRef
import { useParams } from 'next/navigation'
import { Search, User, CheckCircle, X, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getClientsByTrainer,
  recordCheckIn,
  canClientCheckIn,
  getTrainer,
  getClientDebugInfo,
  type Client,
  type Trainer
} from '@/lib/services/clients'
import CheckInSuccess from '@/components/ui/CheckInSuccess'

type ViewState = 'loading' | 'client-list' | 'confirmation' | 'success'

export default function TrainerCheckInPage() {
  const params = useParams()
  const trainerId = params.trainerId as string

  const [viewState, setViewState] = useState<ViewState>('loading')
  const [trainer, setTrainer] = useState<Trainer | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [remainingSessions, setRemainingSessions] = useState(0)
  const [lastCheckInTime, setLastCheckInTime] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  // Add state to track original remaining sessions for confirmation screen
  const [originalRemainingSessions, setOriginalRemainingSessions] = useState(0)

  // Add useRef to track active check-in and prevent duplicates
  const isCheckInInProgress = useRef(false)
  const activeCheckInId = useRef<string | null>(null)

  // Debounce time in milliseconds (5 seconds)
  const DEBOUNCE_TIME = 5000

  useEffect(() => {
    fetchTrainerAndClients()
  }, [trainerId])

  useEffect(() => {
    // Filter clients based on search term
    if (searchTerm.trim() === '') {
      setFilteredClients(clients)
    } else {
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredClients(filtered)
    }
  }, [searchTerm, clients])

  const fetchTrainerAndClients = async () => {
    try {
      // Use the new clients service functions
      const [trainerData, clientsWithSessions] = await Promise.all([
        getTrainer(trainerId),
        getClientsByTrainer(trainerId)
      ])

      if (!trainerData) {
        toast.error('Eğitmen bulunamadı')
        setViewState('client-list')
        return
      }

      setTrainer(trainerData)
      setClients(clientsWithSessions)
      setFilteredClients(clientsWithSessions)
      setViewState('client-list')

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Veri yüklenirken hata oluştu')
      setViewState('client-list')
    }
  }

  const handleClientSelect = async (client: Client) => {
    if (isLoading || isCheckingIn || isCheckInInProgress.current) {
      toast.error('İşlem devam ediyor, lütfen bekleyin...')
      return
    }
    
    console.log(`🔍 [CLIENT_SELECT] ===== CLIENT SELECTED =====`)
    console.log(`🔍 [CLIENT_SELECT] Client: ${client.name} (ID: ${client.id})`)
    console.log(`🔍 [CLIENT_SELECT] Client's current remaining_sessions from database: ${client.remaining_sessions}`)
    console.log(`🔍 [CLIENT_SELECT] Timestamp: ${new Date().toISOString()}`)
    
    setSelectedClient(client)
    setViewState('confirmation')
    setIsLoading(true)

    // Debug: Get detailed client information
    console.log(`🔍 [DEBUG] Getting detailed info for client: ${client.name} (${client.id})`)
    const debugInfo = await getClientDebugInfo(client.id)
    console.log(`🔍 [DEBUG] Debug info:`, debugInfo.debugInfo.join('\n'))

    // Validate if client can check in before showing confirmation
    console.log(`🔍 [VALIDATION] Starting validation for client: ${client.name}`)
    const { canCheckIn, remainingSessions: initialRemaining } = await canClientCheckIn(client.id)
    
    console.log(`🔍 [VALIDATION] Validation result:`)
    console.log(`   - canCheckIn: ${canCheckIn}`)
    console.log(`   - initialRemaining: ${initialRemaining}`)
    console.log(`   - Client's database remaining_sessions: ${client.remaining_sessions}`)
    console.log(`   - Difference: ${client.remaining_sessions - initialRemaining}`)
    
    // Store the original remaining sessions for confirmation screen display
    console.log(`💰 [STATE_UPDATE] Storing original remaining sessions: ${initialRemaining}`)
    setOriginalRemainingSessions(initialRemaining)
    setRemainingSessions(initialRemaining)
    setIsLoading(false)

    console.log(`🔍 [CLIENT_SELECT] ===== CLIENT SELECTION COMPLETED =====`)
    console.log(`🔍 [CLIENT_SELECT] Original remaining sessions stored: ${initialRemaining}`)
    console.log(`🔍 [CLIENT_SELECT] Confirmation screen should show: "Kalan: ${initialRemaining} ders"`)

    if (!canCheckIn) {
      console.log(`❌ [CLIENT_SELECT] Client cannot check in, showing error`)
      toast.error('Ders hakkınız kalmamış veya yakın zamanda giriş yapıldı.')
      setViewState('client-list')
      setSelectedClient(null)
    }
  }

  const handleCheckIn = useCallback(async () => {
    if (!selectedClient) return

    const uiCallId = Math.random().toString(36).substr(2, 9) // Unique UI call identifier
    console.log(`🖱️ [${uiCallId}] ===== UI CHECK-IN BUTTON CLICKED =====`)
    console.log(`🖱️ [${uiCallId}] Timestamp: ${new Date().toISOString()}`)
    console.log(`🖱️ [${uiCallId}] Selected client:`, selectedClient)
    console.log(`🖱️ [${uiCallId}] Trainer ID: ${trainerId}`)
    console.log(`🖱️ [${uiCallId}] Current state - isCheckingIn: ${isCheckingIn}, isLoading: ${isLoading}`)
    console.log(`🖱️ [${uiCallId}] useRef state - isCheckInInProgress: ${isCheckInInProgress.current}, activeCheckInId: ${activeCheckInId.current}`)
    
    // Log remaining sessions state before check-in
    console.log(`💰 [${uiCallId}] REMAINING SESSIONS BEFORE CHECK-IN:`)
    console.log(`   - originalRemainingSessions: ${originalRemainingSessions}`)
    console.log(`   - remainingSessions: ${remainingSessions}`)
    console.log(`   - selectedClient.remaining_sessions: ${selectedClient.remaining_sessions}`)
    console.log(`   - Confirmation screen showed: "Kalan: ${originalRemainingSessions} ders"`)

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
    if (isCheckingIn || isLoading) {
      console.log(`🚫 [${uiCallId}] Already processing (state protection) - blocking duplicate call`)
      toast.error('İşlem devam ediyor, lütfen bekleyin...')
      return
    }

    try {
      console.log(`🔄 [${uiCallId}] Starting check-in process...`)
      
      // Set useRef flag to prevent duplicate calls
      isCheckInInProgress.current = true
      activeCheckInId.current = uiCallId
      
      setIsCheckingIn(true)
      setIsLoading(true)
      setLastCheckInTime(now)

      console.log(`🔄 [${uiCallId}] Calling recordCheckIn function...`)

      // Use the new clients service function for check-in
      const result = await recordCheckIn(selectedClient.id, trainerId)

      console.log(`🔄 [${uiCallId}] recordCheckIn returned:`, result)

      if (result.success) {
        console.log(`✅ [${uiCallId}] Check-in successful`)
        
        // Log remaining sessions after check-in
        console.log(`💰 [${uiCallId}] REMAINING SESSIONS AFTER CHECK-IN:`)
        console.log(`   - Before check-in: ${originalRemainingSessions}`)
        console.log(`   - After check-in: ${result.remainingSessions || 0}`)
        console.log(`   - Sessions deducted: ${originalRemainingSessions - (result.remainingSessions || 0)}`)
        console.log(`   - Success screen will show: "Giriş başarılı! Kalan: ${result.remainingSessions || 0} ders"`)
        
        setRemainingSessions(result.remainingSessions || 0)
        
        // Update local state
        setClients(prev => prev.map(client => 
          client.id === selectedClient.id 
            ? { ...client, remaining_sessions: result.remainingSessions || 0 }
            : client
        ))

        setIsCheckingIn(false)
        setIsLoading(false)
        setViewState('success')
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
        
        setIsCheckingIn(false)
        setIsLoading(false)
      }

    } catch (error) {
      console.error(`❌ [${uiCallId}] Check-in error:`, error)
      toast.error('Beklenmeyen bir hata oluştu')
      setIsCheckingIn(false)
      setIsLoading(false)
    } finally {
      // Always reset useRef flags
      console.log(`🔄 [${uiCallId}] Resetting useRef flags`)
      isCheckInInProgress.current = false
      activeCheckInId.current = null
    }
  }, [selectedClient, trainerId, lastCheckInTime, isCheckingIn, isLoading, originalRemainingSessions, remainingSessions])

  const handleBack = () => {
    // Only allow going back if not currently processing
    if (isLoading || isCheckingIn || isCheckInInProgress.current) {
      toast.error('İşlem devam ediyor, lütfen bekleyin...')
      return
    }

    setViewState('client-list')
    setSelectedClient(null)
    setSearchTerm('')
    setIsLoading(false)
    setIsCheckingIn(false)
    setOriginalRemainingSessions(0)
  }

  const handleSuccessDismiss = () => {
    setViewState('client-list')
    setSelectedClient(null)
    setSearchTerm('')
    setIsLoading(false)
    setIsCheckingIn(false)
    setOriginalRemainingSessions(0)
  }

  // Check if button should be disabled
  const isButtonDisabled = () => {
    return (
      isLoading ||
      isCheckingIn ||
      isCheckInInProgress.current || // Add useRef check
      (viewState === 'confirmation' ? originalRemainingSessions : (selectedClient?.remaining_sessions || 0)) <= 0 ||
      (Date.now() - lastCheckInTime) < DEBOUNCE_TIME
    )
  }

  if (viewState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800 flex items-center justify-center p-6">
        <div className="text-center space-y-6">
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto" />
          <p className="text-white text-lg">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (viewState === 'success' && selectedClient) {
    console.log(`🎉 [SUCCESS_SCREEN] ===== RENDERING SUCCESS SCREEN =====`)
    console.log(`🎉 [SUCCESS_SCREEN] Selected client: ${selectedClient.name}`)
    console.log(`🎉 [SUCCESS_SCREEN] remainingSessions: ${remainingSessions}`)
    console.log(`🎉 [SUCCESS_SCREEN] originalRemainingSessions: ${originalRemainingSessions}`)
    console.log(`🎉 [SUCCESS_SCREEN] selectedClient.remaining_sessions: ${selectedClient.remaining_sessions}`)
    console.log(`🎉 [SUCCESS_SCREEN] Displaying to user: "Giriş başarılı! Kalan: ${remainingSessions} ders"`)
    console.log(`🎉 [SUCCESS_SCREEN] Sessions deducted: ${originalRemainingSessions - remainingSessions}`)
    console.log(`🎉 [SUCCESS_SCREEN] Timestamp: ${new Date().toISOString()}`)
    
    return (
      <CheckInSuccess
        clientName={selectedClient.name}
        remainingSessions={remainingSessions}
        onDismiss={handleSuccessDismiss}
        autoDismissDelay={3000}
      />
    )
  }

  if (viewState === 'confirmation') {
    console.log(`📱 [CONFIRMATION_SCREEN] ===== RENDERING CONFIRMATION SCREEN =====`)
    console.log(`📱 [CONFIRMATION_SCREEN] Selected client: ${selectedClient?.name}`)
    console.log(`📱 [CONFIRMATION_SCREEN] originalRemainingSessions: ${originalRemainingSessions}`)
    console.log(`📱 [CONFIRMATION_SCREEN] remainingSessions: ${remainingSessions}`)
    console.log(`📱 [CONFIRMATION_SCREEN] selectedClient.remaining_sessions: ${selectedClient?.remaining_sessions}`)
    console.log(`📱 [CONFIRMATION_SCREEN] Displaying to user: "Kalan: ${originalRemainingSessions} ders"`)
    console.log(`📱 [CONFIRMATION_SCREEN] Timestamp: ${new Date().toISOString()}`)
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center">
            <button
              onClick={handleBack}
              disabled={isLoading || isCheckingIn || isCheckInInProgress.current}
              className={`inline-flex items-center gap-2 mb-4 transition-colors ${
                isLoading || isCheckingIn || isCheckInInProgress.current
                  ? 'text-white/40 cursor-not-allowed'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
              Geri
            </button>
            
            <h1 className="text-2xl font-bold text-white">
              Giriş Onayı
            </h1>
          </div>

          {/* Client Info */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                <User className="w-10 h-10 text-white" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {selectedClient?.name}
                </h2>
                <p className="text-lg text-purple-200">
                  Kalan: {originalRemainingSessions} ders
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleCheckIn}
              disabled={isButtonDisabled()}
              className={`w-full font-semibold py-4 px-6 rounded-2xl text-lg transition-colors ${
                isButtonDisabled()
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isCheckingIn ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  İşleniyor...
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Kontrol Ediliyor...
                </div>
              ) : (
                'Giriş Yap'
              )}
            </button>
            
            <button
              onClick={handleBack}
              disabled={isLoading || isCheckingIn || isCheckInInProgress.current}
              className={`w-full font-semibold py-4 px-6 rounded-2xl text-lg transition-colors border ${
                isLoading || isCheckingIn || isCheckInInProgress.current
                  ? 'bg-white/5 text-white/40 border-white/10 cursor-not-allowed'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              İptal
            </button>
          </div>

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
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800 p-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
            <User className="w-10 h-10 text-white" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {trainer?.name}
            </h1>
            <p className="text-purple-200 text-sm">
              Üye Giriş Sistemi
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
          <input
            type="text"
            placeholder="İsminizi yazın veya seçin"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isLoading}
            className={`w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 transition-colors ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
        </div>

        {/* Client List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/60">
                {searchTerm ? 'Aradığınız üye bulunamadı' : 'Henüz üye bulunmuyor'}
              </p>
            </div>
          ) : (
            filteredClients.map((client) => (
              <button
                key={client.id}
                onClick={() => handleClientSelect(client)}
                disabled={isLoading}
                className={`w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-left transition-colors ${
                  isLoading 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{client.name}</h3>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      client.remaining_sessions > 0 
                        ? 'bg-green-500/20 text-green-200 border border-green-400/30'
                        : 'bg-red-500/20 text-red-200 border border-red-400/30'
                    }`}>
                      Kalan: {client.remaining_sessions} ders
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer Info */}
        <div className="text-center">
          <p className="text-white/60 text-sm">
            Toplam {clients.length} üye
          </p>
          {isLoading && (
            <p className="text-yellow-200 text-sm mt-2">
              İşlem devam ediyor...
            </p>
          )}
        </div>
      </div>
    </div>
  )
} 