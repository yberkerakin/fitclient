'use client'

import { useState, useEffect } from 'react'
import { Package, Calendar, Check, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Client {
  id: string
  trainer_id: string
  name: string
  phone?: string
  email?: string
  qr_code?: string
  remaining_sessions: number
  created_at: string
  updated_at?: string
}

interface Package {
  id: string
  trainer_id: string
  name: string
  session_count: number
  price: number
  created_at: string
  updated_at?: string
}

interface SellPackageModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client | null
  onPackageSold: (updatedClient?: Client) => void
}

export default function SellPackageModal({ isOpen, onClose, client, onPackageSold }: SellPackageModalProps) {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(false)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && client) {
      fetchPackages()
    }
  }, [isOpen, client])

  const fetchPackages = async () => {
    try {
      setLoading(true)
      const supabase = createBrowserSupabaseClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Kullanıcı bilgisi bulunamadı')
        return
      }

      const { data: trainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!trainer) {
        toast.error('Eğitmen profili bulunamadı')
        return
      }

      const { data: packagesData, error } = await supabase
        .from('packages')
        .select('*')
        .eq('trainer_id', trainer.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching packages:', error)
        toast.error('Paketler yüklenirken hata oluştu')
        return
      }

      setPackages(packagesData || [])
    } catch (error) {
      console.error('Error fetching packages:', error)
      toast.error('Paketler yüklenirken beklenmeyen hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (pkg: Package) => {
    if (!client) {
      console.error('❌ No client selected for purchase')
      return
    }

    try {
      setPurchasing(pkg.id)
      
      // ============================================================================
      // COMPREHENSIVE DEBUGGING - PACKAGE SALE PROCESS
      // ============================================================================
      
      console.log('🔄 ===== STARTING PACKAGE PURCHASE PROCESS =====')
      console.log('📅 Timestamp:', new Date().toISOString())
      console.log('💳 TRANSACTION SUMMARY:')
      console.log('   - Client:', client.name, `(ID: ${client.id})`)
      console.log('   - Package:', pkg.name, `(ID: ${pkg.id})`)
      console.log('   - Sessions to add:', pkg.session_count)
      console.log('   - Current remaining sessions:', client.remaining_sessions || 0)
      console.log('   - New total will be:', (client.remaining_sessions || 0) + pkg.session_count)
      
      // 1. Log selected package data
      console.log('📦 SELECTED PACKAGE DATA:')
      console.log('   - Package ID:', pkg.id)
      console.log('   - Package Name:', pkg.name)
      console.log('   - Session Count:', pkg.session_count)
      console.log('   - Price:', pkg.price)
      console.log('   - Trainer ID:', pkg.trainer_id)
      console.log('   - Created At:', pkg.created_at)
      console.log('   - Full Package Object:', JSON.stringify(pkg, null, 2))
      
      // 2. Log client data
      console.log('👤 CLIENT DATA:')
      console.log('   - Client ID:', client.id)
      console.log('   - Client Name:', client.name)
      console.log('   - Client Email:', client.email)
      console.log('   - Client Phone:', client.phone)
      console.log('   - Trainer ID:', client.trainer_id)
      console.log('   - Current Remaining Sessions:', client.remaining_sessions)
      console.log('   - QR Code:', client.qr_code)
      console.log('   - Created At:', client.created_at)
      console.log('   - Full Client Object:', JSON.stringify(client, null, 2))
      
      const supabase = createBrowserSupabaseClient()
      console.log('🔧 Supabase client created successfully')
      
      // 3. Get current user with detailed logging
      console.log('🔍 STEP 1: Getting current user...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('❌ USER ERROR DETAILS:')
        console.error('   - Error Message:', userError.message)
        console.error('   - Error Status:', userError.status)
        console.error('   - Error Name:', userError.name)
        console.error('   - Full Error Object:', JSON.stringify(userError, null, 2))
        toast.error('Kullanıcı bilgisi alınırken hata oluştu')
        return
      }
      
      if (!user) {
        console.error('❌ NO USER FOUND:')
        console.error('   - User object is null/undefined')
        console.error('   - Auth response:', { user, userError })
        toast.error('Kullanıcı bilgisi bulunamadı')
        return
      }
      
      console.log('✅ USER FOUND:')
      console.log('   - User ID:', user.id)
      console.log('   - User Email:', user.email)
      console.log('   - User Created At:', user.created_at)
      console.log('   - Last Sign In:', user.last_sign_in_at)
      console.log('   - Full User Object:', JSON.stringify(user, null, 2))

      // 4. Get trainer record with detailed logging
      console.log('🔍 STEP 2: Getting trainer record...')
      console.log('   - Looking for trainer with user_id:', user.id)
      
      const trainerQuery = supabase
        .from('trainers')
        .select('id, name, email, user_id')
        .eq('user_id', user.id)
        .single()
      
      console.log('   - Trainer query:', trainerQuery)
      
      const { data: trainer, error: trainerError } = await trainerQuery

      if (trainerError) {
        console.error('❌ TRAINER ERROR DETAILS:')
        console.error('   - Error Message:', trainerError.message)
        console.error('   - Error Code:', trainerError.code)
        console.error('   - Error Details:', trainerError.details)
        console.error('   - Error Hint:', trainerError.hint)
        console.error('   - Full Error Object:', JSON.stringify(trainerError, null, 2))
        console.error('   - Query Details:')
        console.error('     * Table: trainers')
        console.error('     * Filter: user_id =', user.id)
        console.error('     * Query: SELECT id, name, email, user_id FROM trainers WHERE user_id = ?')
        toast.error('Eğitmen profili alınırken hata oluştu')
        return
      }
      
      if (!trainer) {
        console.error('❌ NO TRAINER FOUND:')
        console.error('   - Trainer query returned null/undefined')
        console.error('   - User ID being searched:', user.id)
        console.error('   - Checking if trainers table has data...')
        
        // Let's check if the trainers table has any data
        const { data: allTrainers, error: allTrainersError } = await supabase
          .from('trainers')
          .select('*')
          .limit(5)
        
        console.log('🔍 DEBUG: All trainers in table:', allTrainers)
        console.log('🔍 DEBUG: All trainers error:', allTrainersError)
        
        toast.error('Eğitmen profili bulunamadı')
        return
      }
      
      console.log('✅ TRAINER FOUND:')
      console.log('   - Trainer ID:', trainer.id)
      console.log('   - Trainer Name:', trainer.name)
      console.log('   - Trainer Email:', trainer.email)
      console.log('   - Trainer User ID:', trainer.user_id)
      console.log('   - Full Trainer Object:', JSON.stringify(trainer, null, 2))

      // 5. Prepare purchase data with detailed logging
      console.log('🔍 STEP 3: Preparing purchase data...')
      const purchaseData = {
        client_id: client.id,
        package_id: pkg.id,
        remaining_sessions: pkg.session_count,
        purchase_date: new Date().toISOString()
      }
      
      console.log('📝 PURCHASE DATA TO INSERT:')
      console.log('   - Client ID:', purchaseData.client_id)
      console.log('   - Package ID:', purchaseData.package_id)
      console.log('   - Remaining Sessions:', purchaseData.remaining_sessions)
      console.log('   - Purchase Date:', purchaseData.purchase_date)
      console.log('   - Full Purchase Data Object:', JSON.stringify(purchaseData, null, 2))
      
      console.log('📋 DATABASE SCHEMA REQUIREMENTS:')
      console.log('   - Required fields: client_id, package_id, remaining_sessions, purchase_date')
      console.log('   - All required fields present:', 
        purchaseData.client_id && 
        purchaseData.package_id && 
        purchaseData.remaining_sessions && 
        purchaseData.purchase_date
      )

      // 6. Create purchase record with detailed logging
      console.log('🔄 STEP 4: Creating purchase record...')
      console.log('   - Table: purchases')
      console.log('   - Inserting data:', JSON.stringify([purchaseData], null, 2))
      
      const purchaseQuery = supabase
        .from('purchases')
        .insert([purchaseData])
        .select()
        .single()
      
      console.log('   - Purchase query:', purchaseQuery)
      
      const { data: purchase, error: purchaseError } = await purchaseQuery

      if (purchaseError) {
        console.error('❌ PURCHASE CREATION ERROR DETAILS:')
        console.error('   - Error Message:', purchaseError.message)
        console.error('   - Error Code:', purchaseError.code)
        console.error('   - Error Details:', purchaseError.details)
        console.error('   - Error Hint:', purchaseError.hint)
        console.error('   - Full Error Object:', JSON.stringify(purchaseError, null, 2))
        console.error('   - Query Details:')
        console.error('     * Table: purchases')
        console.error('     * Insert Data:', JSON.stringify([purchaseData], null, 2))
        console.error('     * Query: INSERT INTO purchases (client_id, package_id, remaining_sessions, purchase_date) VALUES (?, ?, ?, ?)')
        
        // Additional debugging for common issues
        console.error('🔍 ADDITIONAL DEBUGGING:')
        console.error('   - Client ID type:', typeof purchaseData.client_id)
        console.error('   - Package ID type:', typeof purchaseData.package_id)
        console.error('   - Remaining Sessions type:', typeof purchaseData.remaining_sessions)
        console.error('   - Purchase Date type:', typeof purchaseData.purchase_date)
        console.error('   - Client ID valid UUID:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(purchaseData.client_id))
        console.error('   - Package ID valid UUID:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(purchaseData.package_id))
        
        toast.error('Paket satışı başarısız oldu')
        return
      }
      
      console.log('✅ PURCHASE CREATED SUCCESSFULLY:')
      console.log('   - Purchase ID:', purchase.id)
      console.log('   - Client ID:', purchase.client_id)
      console.log('   - Package ID:', purchase.package_id)
      console.log('   - Remaining Sessions:', purchase.remaining_sessions)
      console.log('   - Purchase Date:', purchase.purchase_date)
      console.log('   - Created At:', purchase.created_at)
      console.log('   - Full Purchase Object:', JSON.stringify(purchase, null, 2))
      
      // Verify purchase was created in database
      console.log('🔍 VERIFYING PURCHASE IN DATABASE:')
      console.log('   - Purchase should be visible in Supabase dashboard')
      console.log('   - Table: purchases')
      console.log('   - Look for record with ID:', purchase.id)
      console.log('   - Check remaining_sessions value:', purchase.remaining_sessions)

      // 8. Update client's remaining_sessions
      console.log('🔄 STEP 5: Updating client remaining sessions...')
      console.log('   - Current client remaining sessions:', client.remaining_sessions || 0)
      console.log('   - Package session count to add:', pkg.session_count)
      console.log('   - New total remaining sessions:', (client.remaining_sessions || 0) + pkg.session_count)
      
      const newRemainingSessions = (client.remaining_sessions || 0) + pkg.session_count
      
      const { data: updatedClient, error: clientUpdateError } = await supabase
        .from('clients')
        .update({ 
          remaining_sessions: newRemainingSessions,
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id)
        .select()
        .single()

      if (clientUpdateError) {
        console.error('❌ CLIENT UPDATE ERROR DETAILS:')
        console.error('   - Error Message:', clientUpdateError.message)
        console.error('   - Error Code:', clientUpdateError.code)
        console.error('   - Error Details:', clientUpdateError.details)
        console.error('   - Error Hint:', clientUpdateError.hint)
        console.error('   - Full Error Object:', JSON.stringify(clientUpdateError, null, 2))
        console.error('   - Update Details:')
        console.error('     * Table: clients')
        console.error('     * Client ID:', client.id)
        console.error('     * New Remaining Sessions:', newRemainingSessions)
        console.error('     * Query: UPDATE clients SET remaining_sessions = ?, updated_at = ? WHERE id = ?')
        
        toast.error('Paket satıldı fakat müşteri bilgileri güncellenemedi')
        return
      }
      
      console.log('✅ CLIENT UPDATED SUCCESSFULLY:')
      console.log('   - Updated Client ID:', updatedClient.id)
      console.log('   - Previous Remaining Sessions:', client.remaining_sessions || 0)
      console.log('   - New Remaining Sessions:', updatedClient.remaining_sessions)
      console.log('   - Sessions Added:', pkg.session_count)
      console.log('   - Updated At:', updatedClient.updated_at)
      console.log('   - Full Updated Client Object:', JSON.stringify(updatedClient, null, 2))
      
      // Verify client was updated in database
      console.log('🔍 VERIFYING CLIENT UPDATE IN DATABASE:')
      console.log('   - Client should be visible in Supabase dashboard')
      console.log('   - Table: clients')
      console.log('   - Look for client with ID:', updatedClient.id)
      console.log('   - Check remaining_sessions value:', updatedClient.remaining_sessions)
      console.log('   - Previous value was:', client.remaining_sessions || 0)
      console.log('   - New value should be:', (client.remaining_sessions || 0) + pkg.session_count)

      // 9. Success logging
      console.log('ℹ️ TRANSACTION SUMMARY:')
      console.log('   - Purchase record created with ID:', purchase.id)
      console.log('   - Client remaining sessions updated from', client.remaining_sessions || 0, 'to', updatedClient.remaining_sessions)
      console.log('   - Total sessions added:', pkg.session_count)
      console.log('   - Package name:', pkg.name)
      console.log('   - Package price:', pkg.price)

      console.log('✅ ===== PACKAGE PURCHASE PROCESS COMPLETED SUCCESSFULLY =====')
      
      toast.success(`Paket başarıyla satıldı! ${pkg.session_count} seans eklendi.`)
      onPackageSold(updatedClient)
      onClose()
      
    } catch (error: any) {
      console.error('❌ UNEXPECTED ERROR IN PURCHASE PROCESS:')
      console.error('   - Error Type:', typeof error)
      console.error('   - Error Name:', error?.name)
      console.error('   - Error Message:', error?.message)
      console.error('   - Error Stack:', error?.stack)
      console.error('   - Full Error Object:', JSON.stringify(error, null, 2))
      console.error('   - Error occurred at:', new Date().toISOString())
      toast.error('Paket satışı sırasında beklenmeyen hata oluştu')
    } finally {
      setPurchasing(null)
      console.log('🔄 Purchase process completed, purchasing state reset')
    }
  }

  const formatPrice = (price: number) => {
    return `₺${price.toLocaleString('tr-TR')}`
  }

  if (!client) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl mx-auto p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Paket Sat - {client.name}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Müşteri için uygun paketi seçin. Mevcut seanslar: {client.remaining_sessions || 0}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Paketler yükleniyor...</p>
              </div>
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Henüz paket yok
              </h3>
              <p className="text-gray-600">
                Satış yapabilmek için önce paket oluşturmanız gerekiyor.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {pkg.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                        <Calendar className="h-3 w-3 mr-1" />
                        {pkg.session_count} ders
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatPrice(pkg.price)}
                    </div>
                    <p className="text-sm text-gray-500">
                      Ders başına {formatPrice(pkg.price / pkg.session_count)}
                    </p>
                    <Button
                      onClick={() => handlePurchase(pkg)}
                      disabled={purchasing === pkg.id}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    >
                      {purchasing === pkg.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          İşleniyor...
                        </>
                                             ) : (
                         <>
                           <ShoppingCart className="h-4 w-4 mr-2" />
                           Sat
                         </>
                       )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 