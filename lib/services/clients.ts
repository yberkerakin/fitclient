import { createBrowserSupabaseClient } from '@/lib/supabase-client'

export interface Client {
  id: string
  name: string
  remaining_sessions: number
  trainer_id: string
  email?: string
  phone?: string
  qr_code?: string
  created_at: string
  updated_at?: string
  deleted_at?: string
}

export interface Trainer {
  id: string
  name: string
  email: string
}

export interface CheckInResult {
  success: boolean
  message: string
  remainingSessions?: number
  error?: string
}

export interface Purchase {
  id: string
  client_id: string
  package_id: string
  remaining_sessions: number
  purchase_date: string
}

export interface Session {
  id: string
  client_id: string
  trainer_id: string
  check_in_time: string
}

/**
 * Get all clients for a trainer with calculated remaining sessions
 * Works without authentication for public access
 */
export async function getClientsByTrainer(trainerId: string): Promise<Client[]> {
  try {
    console.log(`🔍 Fetching clients for trainer: ${trainerId}`)
    const supabase = createBrowserSupabaseClient()

    // Get all clients for the trainer
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, trainer_id, email, phone, qr_code, created_at')
      .eq('trainer_id', trainerId)
      .is('deleted_at', null)  // Only fetch non-deleted clients
      .order('name')

    if (clientsError) {
      console.error('❌ Error fetching trainer clients:', clientsError)
      throw new Error('Müşteriler yüklenirken hata oluştu')
    }

    if (!clientsData || clientsData.length === 0) {
      console.log('ℹ️ No clients found for trainer:', trainerId)
      return []
    }

    console.log(`✅ Found ${clientsData.length} clients for trainer`)

    // Calculate remaining sessions for each client
    const clientsWithSessions = await Promise.all(
      clientsData.map(async (client) => {
        const remainingSessions = await calculateRemainingSessions(client.id)
        return {
          ...client,
          remaining_sessions: remainingSessions
        }
      })
    )

    console.log(`✅ Calculated sessions for ${clientsWithSessions.length} clients`)
    return clientsWithSessions

  } catch (error) {
    console.error('❌ Error getting trainer clients:', error)
    throw error
  }
}

/**
 * Calculate remaining sessions for a client
 * Uses clients.remaining_sessions (automatically kept in sync by database triggers)
 * Works without authentication for public access
 */
export async function calculateRemainingSessions(clientId: string): Promise<number> {
  const calcId = Math.random().toString(36).substr(2, 9) // Unique calculation identifier
  
  try {
    console.log(`📊 [${calcId}] ===== CALCULATING REMAINING SESSIONS =====`)
    console.log(`📊 [${calcId}] Client ID: ${clientId}`)
    console.log(`📊 [${calcId}] Timestamp: ${new Date().toISOString()}`)
    console.log(`📊 [${calcId}] NOTE: Using clients.remaining_sessions (automatically synced by database triggers)`)
    
    const supabase = createBrowserSupabaseClient()

    // Get client's remaining_sessions (automatically kept in sync by database triggers)
    console.log(`👤 [${calcId}] Fetching client remaining_sessions...`)
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, name, remaining_sessions')
      .eq('id', clientId)
      .single()

    if (clientError || !clientData) {
      console.error(`❌ [${calcId}] Error fetching client:`, clientError)
      throw new Error('Müşteri bilgileri alınırken hata oluştu')
    }

    const remainingSessions = clientData.remaining_sessions || 0

    console.log(`📊 [${calcId}] ===== CALCULATION SUMMARY =====`)
    console.log(`📊 [${calcId}] Client: ${clientData.name} (ID: ${clientData.id})`)
    console.log(`📊 [${calcId}] Client.remaining_sessions: ${remainingSessions}`)
    console.log(`📊 [${calcId}] NOTE: This value is automatically kept in sync by database triggers`)
    console.log(`📊 [${calcId}] ===== END CALCULATION =====`)

    return remainingSessions

  } catch (error) {
    console.error(`❌ [${calcId}] Error calculating remaining sessions:`, error)
    throw error
  }
}

/**
 * Check for recent check-ins within the last 30 seconds
 * Prevents duplicate check-ins
 */
async function checkRecentCheckIns(clientId: string): Promise<boolean> {
  try {
    console.log(`🔍 Checking for recent check-ins for client: ${clientId}`)
    const supabase = createBrowserSupabaseClient()

    // Query for sessions in the last 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString()
    
    const { data: recentSessions, error } = await supabase
      .from('sessions')
      .select('id, check_in_time')
      .eq('client_id', clientId)
      .gte('check_in_time', thirtySecondsAgo)
      .order('check_in_time', { ascending: false })

    if (error) {
      console.error('❌ Error checking recent check-ins:', error)
      throw new Error('Son girişler kontrol edilirken hata oluştu')
    }

    const hasRecentCheckIn = recentSessions && recentSessions.length > 0
    
    if (hasRecentCheckIn) {
      console.log(`⚠️ Recent check-in found for client ${clientId}:`, recentSessions[0])
    } else {
      console.log(`✅ No recent check-ins found for client ${clientId}`)
    }

    return hasRecentCheckIn

  } catch (error) {
    console.error('❌ Error checking recent check-ins:', error)
    throw error
  }
}

/**
 * Record a check-in for a client with duplicate prevention
 * Creates session record and lets database triggers handle the rest
 * Works without authentication for public access
 */
export async function recordCheckIn(
  clientId: string,
  trainerId: string
): Promise<CheckInResult> {
  let sessionId: string | null = null
  const callId = Math.random().toString(36).substr(2, 9) // Unique call identifier

  try {
    console.log(`🔄 [${callId}] ===== RECORD CHECK-IN STARTED =====`)
    console.log(`🔄 [${callId}] Client ID: ${clientId}`)
    console.log(`🔄 [${callId}] Trainer ID: ${trainerId}`)
    console.log(`🔄 [${callId}] Timestamp: ${new Date().toISOString()}`)
    console.log(`🔄 [${callId}] Function called from:`, new Error().stack?.split('\n')[2] || 'Unknown')
    console.log(`🔄 [${callId}] NOTE: Using database triggers to handle purchase updates`)

    const supabase = createBrowserSupabaseClient()

    // 1. Check for recent check-ins (duplicate prevention)
    console.log(`🔍 [${callId}] Step 1: Checking for recent check-ins...`)
    const hasRecentCheckIn = await checkRecentCheckIns(clientId)
    
    if (hasRecentCheckIn) {
      console.log(`❌ [${callId}] Recent check-in detected, preventing duplicate`)
      return {
        success: false,
        message: 'Yakın zamanda giriş yapıldı. Lütfen 30 saniye bekleyin.',
        error: 'RECENT_CHECK_IN'
      }
    }
    console.log(`✅ [${callId}] No recent check-ins found`)

    // 2. Check if client has any remaining sessions in purchases
    console.log(`💰 [${callId}] Step 2: Checking if client has remaining sessions...`)
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .select('id, remaining_sessions, purchase_date')
      .eq('client_id', clientId)
      .gt('remaining_sessions', 0)
      .order('purchase_date', { ascending: false })
      .limit(1)
      .single()

    if (purchaseError || !purchaseData) {
      console.log(`❌ [${callId}] No purchases with remaining sessions found`)
      return {
        success: false,
        message: 'Ders hakkınız kalmamış',
        error: 'NO_SESSIONS_LEFT'
      }
    }

    console.log(`💰 [${callId}] Found purchase with remaining sessions:`, purchaseData)
    console.log(`💰 [${callId}] Current purchase remaining sessions: ${purchaseData.remaining_sessions}`)

    if (purchaseData.remaining_sessions <= 0) {
      console.log(`❌ [${callId}] Purchase has no remaining sessions`)
      return {
        success: false,
        message: 'Ders hakkınız kalmamış',
        error: 'NO_SESSIONS_LEFT'
      }
    }

    console.log(`✅ [${callId}] Client has ${purchaseData.remaining_sessions} remaining sessions`)

    // 3. Create session record (this will trigger database updates automatically)
    console.log(`📝 [${callId}] Step 3: Creating session record...`)
    console.log(`📝 [${callId}] NOTE: Database trigger will automatically update purchase and client remaining_sessions`)
    
    const sessionDataToInsert = {
      client_id: clientId,
      trainer_id: trainerId
    }
    console.log(`📝 [${callId}] Session data to insert:`, sessionDataToInsert)

    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .insert([sessionDataToInsert])
      .select()
      .single()

    if (sessionError) {
      console.error(`❌ [${callId}] Error creating session:`, sessionError)
      return {
        success: false,
        message: 'Giriş işlemi başarısız oldu',
        error: 'SESSION_CREATION_FAILED'
      }
    }

    sessionId = sessionData.id
    console.log(`✅ [${callId}] Session record created successfully`)
    console.log(`📝 [${callId}] Session ID: ${sessionId}`)
    console.log(`📝 [${callId}] Session data:`, sessionData)
    console.log(`📝 [${callId}] Database trigger should have updated purchase and client remaining_sessions`)

    // 4. Get updated client data to return current remaining sessions
    console.log(`👤 [${callId}] Step 4: Getting updated client data...`)
    const { data: updatedClient, error: clientError } = await supabase
      .from('clients')
      .select('id, name, remaining_sessions')
      .eq('id', clientId)
      .single()

    if (clientError || !updatedClient) {
      console.error(`❌ [${callId}] Error fetching updated client:`, clientError)
      // Don't fail the check-in, just log the warning
      console.warn(`⚠️ [${callId}] Could not fetch updated client data, but check-in was successful`)
    } else {
      console.log(`✅ [${callId}] Updated client data:`, updatedClient)
      console.log(`👤 [${callId}] Client remaining sessions after check-in: ${updatedClient.remaining_sessions}`)
    }

    console.log(`✅ [${callId}] ===== CHECK-IN COMPLETED SUCCESSFULLY =====`)
    console.log(`✅ [${callId}] Final summary:`)
    console.log(`   - Client: ${clientId}`)
    console.log(`   - Trainer: ${trainerId}`)
    console.log(`   - Session ID: ${sessionId}`)
    console.log(`   - Purchase ID: ${purchaseData.id}`)
    console.log(`   - Initial purchase remaining sessions: ${purchaseData.remaining_sessions}`)
    console.log(`   - Final client remaining sessions: ${updatedClient?.remaining_sessions || 'unknown'}`)
    console.log(`   - Sessions deducted: 1 (via database trigger)`)
    console.log(`   - Database trigger handled: purchase update + client update`)

    return {
      success: true,
      message: 'Giriş başarılı!',
      remainingSessions: updatedClient?.remaining_sessions || 0
    }

  } catch (error) {
    console.error(`❌ [${callId}] ===== CHECK-IN ERROR =====`)
    console.error(`❌ [${callId}] Error details:`, error)
    console.error(`❌ [${callId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
    
    // Rollback session creation if it was created
    if (sessionId) {
      try {
        console.log(`🔄 [${callId}] Rolling back session creation due to error...`)
        const supabase = createBrowserSupabaseClient()
        await supabase
          .from('sessions')
          .delete()
          .eq('id', sessionId)
        console.log(`🔄 [${callId}] Session creation rolled back due to error`)
      } catch (rollbackError) {
        console.error(`❌ [${callId}] Error during rollback:`, rollbackError)
      }
    }
    
    // Handle different types of errors
    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('connection')) {
        return {
          success: false,
          message: 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.',
          error: 'NETWORK_ERROR'
        }
      }
      
      if (error.message.includes('timeout')) {
        return {
          success: false,
          message: 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.',
          error: 'TIMEOUT_ERROR'
        }
      }
    }

    return {
      success: false,
      message: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
      error: 'UNKNOWN_ERROR'
    }
  }
}

/**
 * Get client with calculated remaining sessions
 * Works without authentication for public access
 */
export async function getClientWithSessions(clientId: string): Promise<Client | null> {
  try {
    console.log(`🔍 Getting client with sessions: ${clientId}`)
    const supabase = createBrowserSupabaseClient()

    // Get client basic info
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, name, trainer_id, email, phone, qr_code, created_at')
      .eq('id', clientId)
      .single()

    if (clientError || !clientData) {
      console.error('❌ Error fetching client:', clientError)
      return null
    }

    // Calculate remaining sessions
    const remainingSessions = await calculateRemainingSessions(clientId)

    const clientWithSessions = {
      ...clientData,
      remaining_sessions: remainingSessions
    }

    console.log(`✅ Client retrieved: ${clientWithSessions.name} (${remainingSessions} sessions)`)
    return clientWithSessions

  } catch (error) {
    console.error('❌ Error getting client with sessions:', error)
    return null
  }
}

/**
 * Get trainer information
 * Works without authentication for public access
 */
export async function getTrainer(trainerId: string): Promise<Trainer | null> {
  try {
    console.log(`🔍 Getting trainer: ${trainerId}`)
    const supabase = createBrowserSupabaseClient()

    const { data: trainerData, error: trainerError } = await supabase
      .from('trainers')
      .select('id, name, email')
      .eq('id', trainerId)
      .single()

    if (trainerError || !trainerData) {
      console.error('❌ Error fetching trainer:', trainerError)
      return null
    }

    console.log(`✅ Trainer retrieved: ${trainerData.name}`)
    return trainerData

  } catch (error) {
    console.error('❌ Error getting trainer:', error)
    return null
  }
}

/**
 * Check if a client can check in
 * Validates recent check-ins and remaining sessions
 * Works without authentication for public access
 */
export async function canClientCheckIn(clientId: string): Promise<{
  canCheckIn: boolean
  remainingSessions: number
  message?: string
}> {
  try {
    console.log(`🔍 Validating check-in for client: ${clientId}`)
    
    // Check for recent check-ins first
    const hasRecentCheckIn = await checkRecentCheckIns(clientId)
    
    if (hasRecentCheckIn) {
      return {
        canCheckIn: false,
        remainingSessions: 0,
        message: 'Yakın zamanda giriş yapıldı. Lütfen 30 saniye bekleyin.'
      }
    }
    
    // Check if client has any remaining sessions in purchases
    const supabase = createBrowserSupabaseClient()
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .select('id, remaining_sessions, purchase_date')
      .eq('client_id', clientId)
      .gt('remaining_sessions', 0)
      .order('purchase_date', { ascending: false })
      .limit(1)
      .single()

    if (purchaseError || !purchaseData) {
      console.log(`❌ No purchases with remaining sessions found for client: ${clientId}`)
      return {
        canCheckIn: false,
        remainingSessions: 0,
        message: 'Ders hakkınız kalmamış'
      }
    }

    const remainingSessions = purchaseData.remaining_sessions
    
    const result = {
      canCheckIn: remainingSessions > 0,
      remainingSessions,
      message: remainingSessions > 0 
        ? undefined 
        : 'Ders hakkınız kalmamış'
    }

    console.log(`✅ Check-in validation: ${result.canCheckIn} (${remainingSessions} sessions from purchase ${purchaseData.id})`)
    return result

  } catch (error) {
    console.error('❌ Error validating client check-in:', error)
    return {
      canCheckIn: false,
      remainingSessions: 0,
      message: 'Doğrulama sırasında hata oluştu'
    }
  }
}

/**
 * Get client purchase history
 * Works without authentication for public access
 */
export async function getClientPurchases(clientId: string): Promise<Purchase[]> {
  try {
    console.log(`🔍 Getting purchases for client: ${clientId}`)
    const supabase = createBrowserSupabaseClient()

    const { data: purchasesData, error: purchasesError } = await supabase
      .from('purchases')
      .select(`
        id,
        client_id,
        package_id,
        remaining_sessions,
        purchase_date,
        packages(name, session_count, price)
      `)
      .eq('client_id', clientId)
      .order('purchase_date', { ascending: false })

    if (purchasesError) {
      console.error('❌ Error fetching purchases:', purchasesError)
      return []
    }

    console.log(`✅ Found ${purchasesData?.length || 0} purchases for client`)
    return purchasesData || []

  } catch (error) {
    console.error('❌ Error getting client purchases:', error)
    return []
  }
}

/**
 * Get client session history
 * Works without authentication for public access
 */
export async function getClientSessions(clientId: string): Promise<Session[]> {
  try {
    console.log(`🔍 Getting sessions for client: ${clientId}`)
    const supabase = createBrowserSupabaseClient()

    const { data: sessionsData, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, client_id, trainer_id, check_in_time')
      .eq('client_id', clientId)
      .order('check_in_time', { ascending: false })

    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError)
      return []
    }

    console.log(`✅ Found ${sessionsData?.length || 0} sessions for client`)
    return sessionsData || []

  } catch (error) {
    console.error('❌ Error getting client sessions:', error)
    return []
  }
} 

/**
 * Get detailed client information for debugging
 * Shows purchases, sessions, and calculation details
 * Works without authentication for public access
 */
export async function getClientDebugInfo(clientId: string): Promise<{
  client: Client | null
  purchases: Purchase[]
  sessions: Session[]
  calculatedRemaining: number
  debugInfo: string[]
}> {
  const debugId = Math.random().toString(36).substr(2, 9)
  const debugInfo: string[] = []
  
  try {
    console.log(`🔍 [${debugId}] ===== CLIENT DEBUG INFO =====`)
    console.log(`🔍 [${debugId}] Client ID: ${clientId}`)
    
    const supabase = createBrowserSupabaseClient()

    // Get client info
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, name, trainer_id, email, phone, qr_code, created_at, remaining_sessions')
      .eq('id', clientId)
      .single()

    if (clientError || !clientData) {
      debugInfo.push(`❌ Error fetching client: ${clientError?.message || 'Client not found'}`)
      return {
        client: null,
        purchases: [],
        sessions: [],
        calculatedRemaining: 0,
        debugInfo
      }
    }

    const client: Client = clientData
    debugInfo.push(`✅ Client: ${client.name} (ID: ${client.id})`)
    debugInfo.push(`📊 Client.remaining_sessions: ${client.remaining_sessions}`)

    // Get purchases
    const { data: purchasesData, error: purchasesError } = await supabase
      .from('purchases')
      .select('id, client_id, package_id, remaining_sessions, purchase_date')
      .eq('client_id', clientId)
      .order('purchase_date', { ascending: false })

    if (purchasesError) {
      debugInfo.push(`❌ Error fetching purchases: ${purchasesError.message}`)
      return {
        client,
        purchases: [],
        sessions: [],
        calculatedRemaining: 0,
        debugInfo
      }
    }

    const purchases: Purchase[] = purchasesData || []
    debugInfo.push(`💰 Purchases found: ${purchases.length}`)
    
    let totalPurchaseRemaining = 0
    purchases.forEach((purchase, index) => {
      totalPurchaseRemaining += purchase.remaining_sessions
      debugInfo.push(`   Purchase ${index + 1}: ID=${purchase.id}, remaining=${purchase.remaining_sessions}, date=${purchase.purchase_date}`)
    })
    
    debugInfo.push(`📊 Total purchase remaining_sessions: ${totalPurchaseRemaining}`)

    // Get sessions
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, client_id, trainer_id, check_in_time')
      .eq('client_id', clientId)
      .order('check_in_time', { ascending: false })

    if (sessionsError) {
      debugInfo.push(`❌ Error fetching sessions: ${sessionsError.message}`)
      return {
        client,
        purchases,
        sessions: [],
        calculatedRemaining: totalPurchaseRemaining,
        debugInfo
      }
    }

    const sessions: Session[] = sessionsData || []
    debugInfo.push(`📝 Sessions found: ${sessions.length}`)
    
    sessions.forEach((session, index) => {
      debugInfo.push(`   Session ${index + 1}: ID=${session.id}, time=${session.check_in_time}`)
    })

    // Calculate remaining sessions (correct way)
    const calculatedRemaining = totalPurchaseRemaining
    
    debugInfo.push(`📊 ===== CALCULATION SUMMARY =====`)
    debugInfo.push(`📊 Client.remaining_sessions: ${client.remaining_sessions}`)
    debugInfo.push(`📊 Calculated remaining (SUM purchases): ${calculatedRemaining}`)
    debugInfo.push(`📊 Sessions count: ${sessions.length}`)
    debugInfo.push(`📊 Match: ${client.remaining_sessions === calculatedRemaining ? '✅ YES' : '❌ NO'}`)
    
    if (client.remaining_sessions !== calculatedRemaining) {
      debugInfo.push(`⚠️ MISMATCH: Client shows ${client.remaining_sessions} but calculation shows ${calculatedRemaining}`)
    }

    console.log(`🔍 [${debugId}] Debug info:`, debugInfo.join('\n'))
    console.log(`🔍 [${debugId}] ===== END CLIENT DEBUG INFO =====`)

    return {
      client,
      purchases,
      sessions,
      calculatedRemaining,
      debugInfo
    }

  } catch (error) {
    console.error(`❌ [${debugId}] Error getting client debug info:`, error)
    debugInfo.push(`❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return {
      client: null,
      purchases: [],
      sessions: [],
      calculatedRemaining: 0,
      debugInfo
    }
  }
}