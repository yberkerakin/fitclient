import { createBrowserSupabaseClient } from '@/lib/supabase-client'

export interface Client {
  id: string
  name: string
  remaining_sessions: number
  trainer_id: string
}

export interface CheckInResult {
  success: boolean
  message: string
  remainingSessions?: number
  error?: string
}

/**
 * Calculate remaining sessions for a client
 * Sums all purchases and subtracts total sessions attended
 */
export async function calculateRemainingSessions(clientId: string): Promise<number> {
  try {
    const supabase = createBrowserSupabaseClient()

    // Get total sessions purchased (sum of all purchases)
    const { data: purchasesData, error: purchasesError } = await supabase
      .from('purchases')
      .select('remaining_sessions')
      .eq('client_id', clientId)

    if (purchasesError) {
      console.error('Error fetching purchases:', purchasesError)
      throw new Error('Satın alımlar alınırken hata oluştu')
    }

    // Get total sessions attended
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('sessions')
      .select('id')
      .eq('client_id', clientId)

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      throw new Error('Seanslar alınırken hata oluştu')
    }

    // Calculate remaining sessions
    const totalPurchased = purchasesData?.reduce((sum, purchase) => sum + purchase.remaining_sessions, 0) || 0
    const totalAttended = sessionsData?.length || 0
    const remainingSessions = Math.max(0, totalPurchased - totalAttended)

    console.log(`📊 Session calculation for client ${clientId}:`)
    console.log(`   - Total purchased: ${totalPurchased}`)
    console.log(`   - Total attended: ${totalAttended}`)
    console.log(`   - Remaining: ${remainingSessions}`)

    return remainingSessions

  } catch (error) {
    console.error('Error calculating remaining sessions:', error)
    throw error
  }
}

/**
 * Record a check-in for a client
 * Creates session record and updates remaining sessions
 */
export async function recordCheckIn(
  clientId: string, 
  trainerId: string
): Promise<CheckInResult> {
  try {
    const supabase = createBrowserSupabaseClient()

    console.log(`🔄 Starting check-in process for client ${clientId}`)

    // First, calculate current remaining sessions
    const currentRemaining = await calculateRemainingSessions(clientId)

    // Check if client has sessions left
    if (currentRemaining <= 0) {
      return {
        success: false,
        message: 'Ders hakkınız kalmamış',
        error: 'NO_SESSIONS_LEFT'
      }
    }

    // Start a transaction-like process
    // 1. Create session record
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .insert([{
        client_id: clientId,
        trainer_id: trainerId
      }])
      .select()
      .single()

    if (sessionError) {
      console.error('❌ Error creating session:', sessionError)
      return {
        success: false,
        message: 'Giriş işlemi başarısız oldu',
        error: 'SESSION_CREATION_FAILED'
      }
    }

    console.log('✅ Session record created:', sessionData.id)

    // 2. Update the most recent purchase with remaining sessions
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .select('id, remaining_sessions')
      .eq('client_id', clientId)
      .gt('remaining_sessions', 0)
      .order('purchase_date', { ascending: false })
      .limit(1)
      .single()

    if (purchaseError || !purchaseData) {
      console.error('❌ Error finding purchase to update:', purchaseError)
      // Try to rollback session creation
      await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionData.id)
      
      return {
        success: false,
        message: 'Seans güncellenirken hata oluştu',
        error: 'PURCHASE_UPDATE_FAILED'
      }
    }

    // Update the purchase with decremented remaining sessions
    const newRemainingSessions = Math.max(0, purchaseData.remaining_sessions - 1)
    
    const { error: updateError } = await supabase
      .from('purchases')
      .update({ remaining_sessions: newRemainingSessions })
      .eq('id', purchaseData.id)

    if (updateError) {
      console.error('❌ Error updating purchase:', updateError)
      // Try to rollback session creation
      await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionData.id)
      
      return {
        success: false,
        message: 'Seans güncellenirken hata oluştu',
        error: 'PURCHASE_UPDATE_FAILED'
      }
    }

    console.log('✅ Purchase updated, remaining sessions:', newRemainingSessions)

    // 3. Update client's total remaining sessions
    const totalRemaining = await calculateRemainingSessions(clientId)
    
    const { error: clientUpdateError } = await supabase
      .from('clients')
      .update({ remaining_sessions: totalRemaining })
      .eq('id', clientId)

    if (clientUpdateError) {
      console.error('❌ Error updating client:', clientUpdateError)
      // Don't rollback here as the main transaction succeeded
      console.warn('⚠️ Client update failed, but check-in was successful')
    }

    console.log('✅ Check-in completed successfully')
    console.log(`   - Client: ${clientId}`)
    console.log(`   - Trainer: ${trainerId}`)
    console.log(`   - Session ID: ${sessionData.id}`)
    console.log(`   - Remaining sessions: ${totalRemaining}`)

    return {
      success: true,
      message: 'Giriş başarılı!',
      remainingSessions: totalRemaining
    }

  } catch (error) {
    console.error('❌ Check-in error:', error)
    
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
 */
export async function getClientWithSessions(clientId: string): Promise<Client | null> {
  try {
    const supabase = createBrowserSupabaseClient()

    // Get client basic info
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, name, trainer_id')
      .eq('id', clientId)
      .single()

    if (clientError || !clientData) {
      console.error('Error fetching client:', clientError)
      return null
    }

    // Calculate remaining sessions
    const remainingSessions = await calculateRemainingSessions(clientId)

    return {
      ...clientData,
      remaining_sessions: remainingSessions
    }

  } catch (error) {
    console.error('Error getting client with sessions:', error)
    return null
  }
}

/**
 * Get all clients for a trainer with calculated remaining sessions
 */
export async function getTrainerClients(trainerId: string): Promise<Client[]> {
  try {
    const supabase = createBrowserSupabaseClient()

    // Get all clients for the trainer
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, trainer_id')
      .eq('trainer_id', trainerId)
      .order('name')

    if (clientsError) {
      console.error('Error fetching trainer clients:', clientsError)
      return []
    }

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

    return clientsWithSessions

  } catch (error) {
    console.error('Error getting trainer clients:', error)
    return []
  }
}

/**
 * Validate if a client can check in
 */
export async function canClientCheckIn(clientId: string): Promise<{
  canCheckIn: boolean
  remainingSessions: number
  message?: string
}> {
  try {
    const remainingSessions = await calculateRemainingSessions(clientId)
    
    return {
      canCheckIn: remainingSessions > 0,
      remainingSessions,
      message: remainingSessions > 0 
        ? undefined 
        : 'Ders hakkınız kalmamış'
    }
  } catch (error) {
    console.error('Error validating client check-in:', error)
    return {
      canCheckIn: false,
      remainingSessions: 0,
      message: 'Doğrulama sırasında hata oluştu'
    }
  }
} 