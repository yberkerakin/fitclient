'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, User, Calendar, AlertCircle, Loader2 } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Client {
  id: string
  name: string
  remaining_sessions: number
  trainer_id: string
}

export default function CheckInPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string
  
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkInSuccess, setCheckInSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      console.log('👤 Client ID type:', typeof clientId)
      console.log('👤 Client ID valid UUID:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId || ''))
      
      const supabase = createBrowserSupabaseClient()
      console.log('🔧 Supabase client created successfully')

      // Test Supabase connection first
      console.log('🔍 ===== TESTING SUPABASE CONNECTION =====')
      console.log('🌐 Environment check:')
      console.log('   - NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET')
      console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET')
      console.log('   - NODE_ENV:', process.env.NODE_ENV)
      console.log('   - VERCEL_ENV:', process.env.VERCEL_ENV || 'NOT SET')
      console.log('   - VERCEL_URL:', process.env.VERCEL_URL || 'NOT SET')
      
      // Check Supabase client configuration
      console.log('🔧 Supabase client configuration:')
      console.log('   - Supabase URL from env:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...' || 'UNDEFINED')
      console.log('   - Supabase key from env:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...' || 'UNDEFINED')
      console.log('   - Environment variables loaded:', !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))
      
      // Test a simple query to verify connection
      console.log('🔍 Testing simple Supabase query...')
      const { data: testData, error: testError } = await supabase
        .from('clients')
        .select('count')
        .limit(1)
      
      if (testError) {
        console.error('❌ ===== SUPABASE CONNECTION ERROR =====')
        console.error('   - Error message:', testError.message)
        console.error('   - Error code:', testError.code)
        console.error('   - Error details:', testError.details)
        console.error('   - Error hint:', testError.hint)
        console.error('   - Full error object:', JSON.stringify(testError, null, 2))
        console.error('   - This indicates a Supabase connection issue')
        console.error('   - Check environment variables in Vercel')
        console.error('   - Check Supabase project status')
        console.error('   - Check if clients table exists')
        console.error('❌ ===== END SUPABASE CONNECTION ERROR =====')
        
        setError('Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.')
        return
      }
      
      console.log('✅ Supabase connection test successful')
      console.log('   - Test query result:', testData)
      console.log('   - No connection errors detected')
      console.log('   - Clients table is accessible')
      console.log('🔍 ===== END SUPABASE CONNECTION TEST =====')

      // Build the Supabase query
      const query = supabase
        .from('clients')
        .select(`
          id,
          name,
          remaining_sessions,
          trainer_id
        `)
        .eq('id', clientId)
        .single()

      console.log('🔍 Supabase query details:')
      console.log('   - Table: clients')
      console.log('   - Filter: id =', clientId)
      console.log('   - Select fields: id, name, remaining_sessions, trainer_id')
      console.log('   - Single result: true')
      console.log('   - Query object:', query)

      // Execute the query
      const { data: clientData, error: clientError } = await query

      console.log('📊 Query results:')
      console.log('   - Data:', clientData)
      console.log('   - Error:', clientError)
      console.log('   - Data type:', typeof clientData)
      console.log('   - Data is null:', clientData === null)
      console.log('   - Data is undefined:', clientData === undefined)

      if (clientError) {
        console.error('❌ ===== CLIENT FETCH ERROR =====')
        console.error('   - Error message:', clientError.message)
        console.error('   - Error code:', clientError.code)
        console.error('   - Error details:', clientError.details)
        console.error('   - Error hint:', clientError.hint)
        console.error('   - Full error object:', JSON.stringify(clientError, null, 2))
        console.error('   - Client ID that failed:', clientId)
        console.error('   - Query that failed:', 'SELECT id, name, remaining_sessions, trainer_id FROM clients WHERE id = ?')
        console.error('❌ ===== END CLIENT FETCH ERROR =====')
        
        setError(`Client ID: ${clientId} bulunamadı`)
        return
      }

      if (!clientData) {
        console.error('❌ ===== NO CLIENT DATA =====')
        console.error('   - No client found with ID:', clientId)
        console.error('   - Query returned null/undefined')
        console.error('   - This means the client ID does not exist in the database')
        console.error('   - Check if the client was created properly')
        console.error('   - Check if the client ID in the URL is correct')
        console.error('❌ ===== END NO CLIENT DATA =====')
        
        setError(`Client ID: ${clientId} bulunamadı`)
        return
      }

      console.log('✅ ===== CLIENT FOUND SUCCESSFULLY =====')
      console.log('   - Client ID:', clientData.id)
      console.log('   - Client Name:', clientData.name)
      console.log('   - Remaining Sessions:', clientData.remaining_sessions)
      console.log('   - Trainer ID:', clientData.trainer_id)
      console.log('   - Full client data:', JSON.stringify(clientData, null, 2))
      console.log('✅ ===== END CLIENT FOUND =====')
      
      setClient({
        id: clientData.id,
        name: clientData.name,
        remaining_sessions: clientData.remaining_sessions || 0,
        trainer_id: clientData.trainer_id
      })

    } catch (error: any) {
      console.error('❌ ===== UNEXPECTED ERROR =====')
      console.error('   - Error type:', typeof error)
      console.error('   - Error name:', error?.name)
      console.error('   - Error message:', error?.message)
      console.error('   - Error stack:', error?.stack)
      console.error('   - Full error object:', JSON.stringify(error, null, 2))
      console.error('   - Client ID that caused error:', clientId)
      console.error('❌ ===== END UNEXPECTED ERROR =====')
      
      setError(`Beklenmeyen hata: ${error?.message || 'Bilinmeyen hata'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    if (!client) return

    try {
      setCheckingIn(true)
      console.log('🔄 ===== STARTING CHECK-IN PROCESS =====')
      console.log('👤 Client name:', client.name)
      console.log('👤 Client ID:', client.id)
      console.log('👤 Current remaining sessions:', client.remaining_sessions)
      
      const supabase = createBrowserSupabaseClient()

      // Verify client has remaining sessions
      if (client.remaining_sessions <= 0) {
        console.log('❌ Client has no remaining sessions')
        toast.error('Ders hakkınız bulunmamaktadır')
        return
      }

      console.log('✅ Client has remaining sessions:', client.remaining_sessions)

      // Create session record
      const sessionData = {
        client_id: client.id,
        trainer_id: client.trainer_id,
        session_date: new Date().toISOString(),
        status: 'completed'
      }

      console.log('📝 Session data to insert:', JSON.stringify(sessionData, null, 2))

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert([sessionData])
        .select()
        .single()

      if (sessionError) {
        console.error('❌ ===== SESSION CREATION ERROR =====')
        console.error('   - Error message:', sessionError.message)
        console.error('   - Error code:', sessionError.code)
        console.error('   - Error details:', sessionError.details)
        console.error('   - Full error object:', JSON.stringify(sessionError, null, 2))
        console.error('   - Session data that failed:', JSON.stringify(sessionData, null, 2))
        console.error('❌ ===== END SESSION CREATION ERROR =====')
        
        toast.error('Giriş işlemi başarısız oldu')
        return
      }

      console.log('✅ Session created successfully:', JSON.stringify(session, null, 2))

      // Update client's remaining sessions
      const newRemainingSessions = client.remaining_sessions - 1
      
      console.log('🔄 Updating client sessions from', client.remaining_sessions, 'to', newRemainingSessions)
      
      const { error: updateError } = await supabase
        .from('clients')
        .update({ 
          remaining_sessions: newRemainingSessions,
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id)

      if (updateError) {
        console.error('❌ ===== CLIENT UPDATE ERROR =====')
        console.error('   - Error message:', updateError.message)
        console.error('   - Error code:', updateError.code)
        console.error('   - Error details:', updateError.details)
        console.error('   - Full error object:', JSON.stringify(updateError, null, 2))
        console.error('   - Client ID:', client.id)
        console.error('   - New remaining sessions:', newRemainingSessions)
        console.error('❌ ===== END CLIENT UPDATE ERROR =====')
        
        toast.error('Ders güncellenirken hata oluştu')
        return
      }

      console.log('✅ Client sessions updated successfully to:', newRemainingSessions)

      // Update local state
      setClient(prev => prev ? {
        ...prev,
        remaining_sessions: newRemainingSessions
      } : null)

      // Show success
      setCheckInSuccess(true)
      toast.success('Giriş başarılı!')
      
      console.log('✅ ===== CHECK-IN PROCESS COMPLETED SUCCESSFULLY =====')

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        console.log('🔄 Redirecting to dashboard...')
        router.push('/dashboard')
      }, 3000)

    } catch (error: any) {
      console.error('❌ ===== UNEXPECTED CHECK-IN ERROR =====')
      console.error('   - Error type:', typeof error)
      console.error('   - Error name:', error?.name)
      console.error('   - Error message:', error?.message)
      console.error('   - Error stack:', error?.stack)
      console.error('   - Full error object:', JSON.stringify(error, null, 2))
      console.error('   - Client that caused error:', client)
      console.error('❌ ===== END UNEXPECTED CHECK-IN ERROR =====')
      
      toast.error('Giriş sırasında beklenmeyen hata oluştu')
    } finally {
      setCheckingIn(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800 flex items-center justify-center p-6">
        <div className="text-center space-y-6">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto"></div>
          <div className="space-y-2">
            <p className="text-xl font-semibold text-white">Bilgiler yükleniyor...</p>
            <p className="text-purple-200">Müşteri bilgileri alınıyor</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800 flex items-center justify-center p-6">
        <div className="text-center space-y-8 max-w-sm">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-white">Hata</h1>
            <p className="text-lg text-purple-200">{error}</p>
            <p className="text-sm text-purple-300">
              QR kodu geçersiz veya müşteri bulunamadı.
            </p>
            {/* Debug information */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <p className="text-xs font-semibold text-white mb-2">Debug Bilgileri:</p>
                <p className="text-xs text-purple-200">Client ID: {clientId}</p>
                <p className="text-xs text-purple-200">URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
                <p className="text-xs text-purple-200">Path: {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}</p>
                <p className="text-xs text-purple-200">Environment: {process.env.NODE_ENV}</p>
                <p className="text-xs text-purple-200">Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET'}</p>
                <p className="text-xs text-purple-200">Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}</p>
                <p className="text-xs text-purple-200">Vercel Env: {process.env.VERCEL_ENV || 'NOT SET'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-xl text-purple-200">Müşteri bulunamadı</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-md mx-auto px-6 py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <span className="text-purple-600 font-bold text-lg">F</span>
              </div>
              <span className="text-2xl font-bold text-white">FitClient</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="text-center space-y-8">
          {checkInSuccess ? (
            /* Success State */
            <div className="space-y-6">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-white">
                  Giriş başarılı!
                </h1>
                <p className="text-lg text-purple-200">
                  Seansınız başlatıldı. İyi çalışmalar!
                </p>
                <p className="text-sm text-purple-300">
                  3 saniye sonra yönlendirileceksiniz...
                </p>
              </div>
            </div>
          ) : (
            /* Main Check-in State */
            <div className="space-y-8">
              {/* Welcome Section */}
              <div className="space-y-6">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
                  <User className="h-12 w-12 text-white" />
                </div>
                
                <div className="space-y-3">
                  <h1 className="text-3xl font-bold text-white">
                    Hoş Geldiniz!
                  </h1>
                  <p className="text-2xl font-semibold text-purple-200">
                    {client.name}
                  </p>
                </div>
              </div>

              {/* Sessions Info */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <Calendar className="h-6 w-6 text-purple-200" />
                  <span className="text-lg font-semibold text-white">Kalan Ders</span>
                </div>
                <div className="text-5xl font-bold text-white mb-2">
                  {client.remaining_sessions}
                </div>
                <p className="text-base text-purple-200">
                  {client.remaining_sessions > 0 ? 'ders kaldı' : 'ders kalmadı'}
                </p>
              </div>

              {/* Check-in Button */}
              <div className="space-y-4">
                {client.remaining_sessions <= 0 ? (
                  <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-6 w-6 text-yellow-400 flex-shrink-0" />
                      <span className="text-base text-yellow-200">
                        Ders hakkınız bulunmamaktadır
                      </span>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                    className="w-full h-16 text-xl font-bold bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg"
                  >
                    {checkingIn ? (
                      <div className="flex items-center space-x-3">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Giriş yapılıyor...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-8 w-8" />
                        <span>Giriş Yap</span>
                      </div>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 