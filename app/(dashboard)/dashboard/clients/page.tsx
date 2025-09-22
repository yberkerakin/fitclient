'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, QrCode, Phone, Mail, User, Package, RefreshCw, Trash2, Eye, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import QRCodeModal from '@/components/dashboard/QRCodeModal'
import SellPackageModal from '@/components/dashboard/SellPackageModal'

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
  deleted_at?: string
}

interface CreateClientData {
  trainer_id: string
  name: string
  phone?: string | null
  email?: string | null
  qr_code?: string
}

interface AddClientForm {
  name: string
  phone: string
  email: string
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState<AddClientForm>({
    name: '',
    phone: '',
    email: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [sellModalOpen, setSellModalOpen] = useState(false)
  const [clientForSale, setClientForSale] = useState<Client | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)
  const [deleteConfirmations, setDeleteConfirmations] = useState<Record<string, { confirmed: boolean; timestamp: number }>>({})
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)

  useEffect(() => {
    console.log('🚀 ClientsPage mounted, starting data fetch...')
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      setLoading(true)
      console.log('🔄 Starting to fetch clients...')
      console.log('📊 Current clients state:', clients)
      
      const supabase = createBrowserSupabaseClient()
      console.log('🔧 Supabase client created')

      // Get current user
      console.log('🔍 Fetching current user...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('❌ Error getting user:', userError)
        console.error('❌ User error details:', {
          message: userError.message,
          status: userError.status,
          name: userError.name
        })
        toast.error('Kullanıcı bilgisi alınırken hata oluştu')
        return
      }
      
      if (!user) {
        console.error('❌ No user found - user object is null/undefined')
        console.error('❌ Auth response:', { user, userError })
        toast.error('Kullanıcı bilgisi bulunamadı')
        return
      }

      console.log('👤 Current user found:', { 
        id: user.id, 
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      })

      // Get trainer record
      console.log('🔍 Fetching trainer record for user_id:', user.id)
      const trainerQuery = supabase
        .from('trainers')
        .select('id, name, email, user_id')
        .eq('user_id', user.id)
        .single()
      
      console.log('🔍 Trainer query:', trainerQuery)
      
      const { data: trainer, error: trainerError } = await trainerQuery

      if (trainerError) {
        console.error('❌ Error getting trainer:', trainerError)
        console.error('❌ Trainer error details:', {
          message: trainerError.message,
          code: trainerError.code,
          details: trainerError.details,
          hint: trainerError.hint
        })
        console.error('❌ Trainer query details:', {
          user_id: user.id,
          table: 'trainers',
          query: 'SELECT id, name, email, user_id FROM trainers WHERE user_id = ?'
        })
        toast.error('Eğitmen profili alınırken hata oluştu')
        return
      }

      if (!trainer) {
        console.error('❌ No trainer found for user:', user.id)
        console.error('❌ Trainer query returned null/undefined')
        console.error('❌ Checking if trainers table exists and has data...')
        
        // Let's check if the trainers table has any data
        const { data: allTrainers, error: allTrainersError } = await supabase
          .from('trainers')
          .select('*')
          .limit(5)
        
        console.log('🔍 All trainers in table:', allTrainers)
        console.log('🔍 All trainers error:', allTrainersError)
        
        toast.error('Eğitmen profili bulunamadı')
        return
      }

      console.log('🏋️ Trainer data found:', trainer)
      console.log('🏋️ Trainer ID for client query:', trainer.id)

      // Fetch clients for this trainer from clients table
      console.log('🔍 Fetching clients for trainer_id:', trainer.id)
      
      const clientsQuery = supabase
        .from('clients')
        .select('*')
        .eq('trainer_id', trainer.id)
        .is('deleted_at', null)  // Only fetch non-deleted clients
        .order('created_at', { ascending: false })
      
      console.log('🔍 Clients query from clients table:', clientsQuery)
      
      const { data: clientsData, error: clientsError } = await clientsQuery

      if (clientsError) {
        console.error('❌ Error fetching clients:', clientsError)
        console.error('❌ Clients error details:', {
          message: clientsError.message,
          code: clientsError.code,
          details: clientsError.details,
          hint: clientsError.hint
        })
        console.error('❌ Clients query details:', {
          trainer_id: trainer.id,
          table: 'clients',
          query: 'SELECT * FROM clients WHERE trainer_id = ? ORDER BY created_at DESC'
        })
        toast.error('Üyeler yüklenirken hata oluştu')
        return
      }

      console.log('📋 Raw clients data:', clientsData)
      console.log('📋 Clients data type:', typeof clientsData)
      console.log('📋 Clients data length:', clientsData?.length || 0)
      
      // Log remaining sessions for each client
      if (clientsData && clientsData.length > 0) {
        console.log('📊 Remaining sessions data:')
        clientsData.forEach((client, index) => {
          console.log(`   Client ${index + 1}: ${client.name} - ${client.remaining_sessions || 0} sessions`)
        })
      }
      
      // Let's also check if the clients table exists and has any data
      if (!clientsData || clientsData.length === 0) {
        console.log('🔍 No clients found, checking if clients table exists...')
        
        const { data: allClients, error: allClientsError } = await supabase
          .from('clients')
          .select('*')
          .limit(5)
        
        console.log('🔍 All clients in table:', allClients)
        console.log('🔍 All clients error:', allClientsError)
        console.log('🔍 Checking table structure...')
        
        // Let's also check the table structure
        const { data: tableInfo, error: tableError } = await supabase
          .from('clients')
          .select('trainer_id')
          .limit(1)
        
        console.log('🔍 Table structure check:', tableInfo)
        console.log('🔍 Table structure error:', tableError)
      }

      // Use the actual remaining_sessions from the database
      const clientsWithSessions = clientsData?.map(client => ({
        ...client,
        remaining_sessions: client.remaining_sessions || 0 // Use actual value from database, default to 0
      })) || []

      console.log('✅ Processed clients:', clientsWithSessions)
      console.log('✅ Final clients array length:', clientsWithSessions.length)
      console.log('✅ Setting clients state with:', clientsWithSessions)
      
      setClients(clientsWithSessions)
      
      console.log('✅ Clients state updated, current state will be:', clientsWithSessions)
      
    } catch (error) {
      console.error('❌ Unexpected error fetching clients:', error)
      toast.error('Üyeler yüklenirken beklenmeyen hata oluştu')
    } finally {
      setLoading(false)
      console.log('🏁 Finished fetching clients')
    }
  }

  const generateQRCode = async (clientId: string) => {
    try {
      // Get base URL from environment variable or fallback
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://172.20.10.15:3000'
      const checkinUrl = `${baseUrl}/checkin/${clientId}`
      
      // Log the full URL being encoded in QR
      console.log('🔗 ===== QR CODE URL DEBUG (CLIENTS PAGE) =====')
      console.log('📱 Full URL being encoded in QR:', checkinUrl)
      console.log('🌐 Base URL used:', baseUrl)
      console.log('🔧 Environment variable NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'not set')
      console.log('👤 Client ID:', clientId)
      console.log('🔗 ===== END QR CODE URL DEBUG =====')
      
      // Generate QR code using the full URL
      return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkinUrl)}`
    } catch (error) {
      console.error('Error generating QR code:', error)
      // Fallback to localhost if IP detection fails
      const fallbackUrl = `http://localhost:3000/checkin/${clientId}`
      return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fallbackUrl)}`
    }
  }

  const handleAddClient = async () => {
    if (!formData.name.trim()) {
      toast.error('Ad Soyad alanı zorunludur')
      return
    }

    // Validate phone number if provided
    if (formData.phone.trim()) {
      const phoneValidationError = validatePhoneNumber(formData.phone)
      if (phoneValidationError) {
        setPhoneError(phoneValidationError)
        toast.error(phoneValidationError)
        return
      }
    }

    try {
      setSubmitting(true)
      console.log('🔄 Starting to add client...')
      console.log('📝 Form data:', formData)
      
      const supabase = createBrowserSupabaseClient()

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('❌ Error getting user:', userError)
        toast.error('Kullanıcı bilgisi alınırken hata oluştu')
        return
      }

      // Get trainer record
      const { data: trainer, error: trainerError } = await supabase
        .from('trainers')
        .select('id, name, email')
        .eq('user_id', user.id)
        .single()

      if (trainerError || !trainer) {
        console.error('❌ Error getting trainer:', trainerError)
        toast.error('Eğitmen profili alınırken hata oluştu')
        return
      }

      console.log('🏋️ Trainer found:', trainer)

      // Prepare client data
      const clientData: CreateClientData = {
        trainer_id: trainer.id,
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        qr_code: '' // Will be generated after client creation with actual client ID
      }

      console.log('📝 Client data to insert:', clientData)

      // Create client
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single()

      if (clientError) {
        console.error('❌ Error creating client:', clientError)
        console.error('❌ Client error details:', {
          message: clientError.message,
          code: clientError.code,
          details: clientError.details,
          hint: clientError.hint
        })
        toast.error('Üye eklenirken hata oluştu')
        return
      }

      console.log('✅ Client created successfully:', newClient)

      // Generate QR code with actual client ID
      const qrCodeUrl = await generateQRCode(newClient.id)
      
      // Update client with QR code
      const { error: qrUpdateError } = await supabase
        .from('clients')
        .update({ qr_code: qrCodeUrl })
        .eq('id', newClient.id)

      if (qrUpdateError) {
        console.error('❌ Error updating QR code:', qrUpdateError)
        // Don't fail the whole operation, just log the error
      } else {
        console.log('✅ QR code generated and updated:', qrCodeUrl)
      }

      // Reset form
      setFormData({ name: '', phone: '', email: '' })
      setPhoneError(null)
      setDialogOpen(false)

      // Add to clients list optimistically with QR code
      const clientWithSessions = {
        ...newClient,
        qr_code: qrCodeUrl,
        remaining_sessions: 0 // New clients start with 0 sessions
      }
      
      setClients(prevClients => [clientWithSessions, ...prevClients])

      toast.success('Üye başarıyla eklendi!')
      
    } catch (error) {
      console.error('❌ Unexpected error adding client:', error)
      toast.error('Üye eklenirken beklenmeyen hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '')
    
    // Handle Turkish mobile numbers (5XX XXX XX XX)
    if (cleaned.length === 10 && cleaned.startsWith('5')) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
    }
    
    // Handle numbers starting with 0 (05XX XXX XX XX)
    if (cleaned.length === 11 && cleaned.startsWith('05')) {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
    }
    
    // For other formats, just format as we type
    const limited = cleaned.slice(0, 10)
    if (limited.length <= 3) return `(${limited}`
    if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`
    if (limited.length <= 8) return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)} ${limited.slice(6)}`
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)} ${limited.slice(6, 8)} ${limited.slice(8)}`
  }

  const formatPhoneInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    return formatPhoneNumber(cleaned)
  }

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneInput(value)
    setFormData(prev => ({ ...prev, phone: formatted }))
  }

  const validatePhoneNumber = (phone: string) => {
    if (!phone.trim()) return null // Phone is optional
    
    const cleaned = phone.replace(/\D/g, '')
    
    if (cleaned.length !== 10) {
      return 'Telefon numarası 10 haneli olmalıdır'
    }
    
    if (!cleaned.startsWith('5')) {
      return 'Telefon numarası 5 ile başlamalıdır'
    }
    
    return null
  }

  const handleClientAdded = (newClient: Client) => {
    console.log('✅ Client added successfully:', newClient)
    setClients(prevClients => [newClient, ...prevClients])
    setFormData({ name: '', phone: '', email: '' })
    setPhoneError(null)
    setDialogOpen(false)
    toast.success('Üye başarıyla eklendi!')
  }

  const handleClientAddError = (error: any) => {
    console.error('❌ Error adding client:', error)
    toast.error('Üye eklenirken hata oluştu')
  }

  const handleQRCodeClick = (client: Client) => {
    setSelectedClient(client)
    setQrModalOpen(true)
  }

  const handleSellPackageClick = (client: Client) => {
    setClientForSale(client)
    setSellModalOpen(true)
  }

  const handlePackageSold = (updatedClient?: Client) => {
    console.log('🔄 handlePackageSold called with:', updatedClient)
    
    if (updatedClient) {
      // Optimistically update the client in the list for immediate UI feedback
      setClients(prevClients => {
        const newClients = prevClients.map(client => 
          client.id === updatedClient.id ? updatedClient : client
        )
        console.log('✅ Client updated optimistically:', {
          clientId: updatedClient.id,
          clientName: updatedClient.name,
          oldSessions: prevClients.find(c => c.id === updatedClient.id)?.remaining_sessions || 0,
          newSessions: updatedClient.remaining_sessions
        })
        return newClients
      })
    }
    
    // Also refresh all client data to ensure consistency
    console.log('🔄 Refreshing all client data...')
    fetchClients()
  }

  const handleDeleteClient = async (client: Client) => {
    const now = Date.now()
    const confirmationKey = client.id
    const existingConfirmation = deleteConfirmations[confirmationKey]

    // Check if this is the first click
    if (!existingConfirmation || now - existingConfirmation.timestamp > 3000) {
      // First click - show confirmation message
      setDeleteConfirmations(prev => ({
        ...prev,
        [confirmationKey]: { confirmed: false, timestamp: now }
      }))
      
      // Auto-clear confirmation after 3 seconds
      setTimeout(() => {
        setDeleteConfirmations(prev => {
          const newState = { ...prev }
          delete newState[confirmationKey]
          return newState
        })
      }, 3000)
      
      toast.info('Silmek için tekrar tıklayın', { duration: 3000 })
      return
    }

    // Second click within 3 seconds - proceed with deletion
    setDeleteConfirmations(prev => {
      const newState = { ...prev }
      delete newState[confirmationKey]
      return newState
    })
    
    setClientToDelete(client)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return

    try {
      setDeletingClientId(clientToDelete.id)
      console.log('🔄 Starting to soft delete client...')
      console.log('📝 Client to delete:', clientToDelete)
      
      const supabase = createBrowserSupabaseClient()

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('❌ Error getting user:', userError)
        toast.error('Kullanıcı bilgisi alınırken hata oluştu')
        return
      }

      // Get trainer record
      const { data: trainer, error: trainerError } = await supabase
        .from('trainers')
        .select('id, name, email')
        .eq('user_id', user.id)
        .single()

      if (trainerError || !trainer) {
        console.error('❌ Error getting trainer:', trainerError)
        toast.error('Eğitmen profili alınırken hata oluştu')
        return
      }

      console.log('🏋️ Trainer found:', trainer)

      // Soft delete client by setting deleted_at timestamp
      const { error: deleteError } = await supabase
        .from('clients')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', clientToDelete.id)

      if (deleteError) {
        console.error('❌ Error soft deleting client:', deleteError)
        console.error('❌ Delete error details:', {
          message: deleteError.message,
          code: deleteError.code,
          details: deleteError.details,
          hint: deleteError.hint
        })
        toast.error('Üye silinirken hata oluştu')
        return
      }

      console.log('✅ Client soft deleted successfully:', clientToDelete)

      // Refresh clients list
      fetchClients()
      toast.success('Üye başarıyla silindi!')
      
    } catch (error) {
      console.error('❌ Unexpected error soft deleting client:', error)
      toast.error('Üye silinirken beklenmeyen hata oluştu')
    } finally {
      setDeletingClientId(null)
      setSubmitting(false)
      setDeleteDialogOpen(false)
      setClientToDelete(null)
    }
  }

  // Debug function to verify purchase flow
  const debugPurchaseFlow = async () => {
    console.log('🔍 DEBUG: Checking purchase flow...')
    console.log('📊 Current clients state:', clients)
    
    const supabase = createBrowserSupabaseClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ No user found for debug')
      return
    }
    
    // Get trainer
    const { data: trainer } = await supabase
      .from('trainers')
      .select('id, name')
      .eq('user_id', user.id)
      .single()
    
    if (!trainer) {
      console.error('❌ No trainer found for debug')
      return
    }
    
    console.log('🏋️ Trainer for debug:', trainer)
    
    // Check recent purchases
    const { data: recentPurchases } = await supabase
      .from('purchases')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log('📦 Recent purchases:', recentPurchases)
    
    // Check client sessions
    const { data: clientSessions } = await supabase
      .from('clients')
      .select('id, name, remaining_sessions')
      .eq('trainer_id', trainer.id)
    
    console.log('👤 Client sessions:', clientSessions)
  }

  const handleViewDetails = (client: Client) => {
    router.push(`/dashboard/clients/${client.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Üyeler yükleniyor...</p>
          <p className="text-gray-400 text-sm mt-2">Lütfen bekleyin</p>
        </div>
      </div>
    )
  }

  // Debug render info
  console.log('🎨 Rendering clients page with:', {
    clientsLength: clients.length,
    clients: clients,
    loading: loading,
    dialogOpen: dialogOpen
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Üyeler</h1>
          <p className="text-gray-600 mt-1">
            {clients.length} üye
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Debug Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('🔄 Manual refresh triggered by debug button')
              toast.info('Manuel yenileme başlatıldı...')
              fetchClients()
            }}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Debug: Yenile
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('🔍 Debug purchase flow triggered')
              toast.info('Satış akışı kontrol ediliyor...')
              debugPurchaseFlow()
            }}
            className="text-xs"
          >
            <Package className="h-3 w-3 mr-1" />
            Debug: Satış
          </Button>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Yeni Üye Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6 m-2 sm:m-0">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-lg">Yeni Üye Ekle</DialogTitle>
                <DialogDescription className="text-sm">
                  Üye bilgilerini girin. Sadece ad soyad zorunludur.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">Ad Soyad *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Üye adı ve soyadı"
                    disabled={submitting}
                    className="h-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder:text-gray-400"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      handlePhoneChange(e.target.value)
                      const error = validatePhoneNumber(e.target.value)
                      setPhoneError(error)
                    }}
                    onBlur={() => {
                      const error = validatePhoneNumber(formData.phone)
                      setPhoneError(error)
                    }}
                    placeholder="(5XX) XXX XX XX"
                    disabled={submitting}
                    className={`h-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder:text-gray-400 ${
                      phoneError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                    }`}
                  />
                  {phoneError && (
                    <p className="text-red-500 text-xs animate-in slide-in-from-top-1">
                      {phoneError}
                    </p>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="musteri@email.com"
                    disabled={submitting}
                    className="h-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder:text-gray-400"
                  />
                </div>
              </div>
              
              <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                  size="sm"
                  className="w-full sm:w-auto hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  İptal
                </Button>
                <Button
                  onClick={handleAddClient}
                  disabled={submitting || !formData.name.trim()}
                  className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-all duration-200 hover:shadow-md"
                  size="sm"
                >
                  {submitting ? 'Ekleniyor...' : 'Ekle'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Empty State */}
      {clients.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Henüz üye yok
          </h3>
          <p className="text-gray-600 mb-6">
            İlk üyenizi ekleyin
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              İlk Üyeyi Ekle
            </Button>
            <div>
              <Button
                variant="outline"
                onClick={fetchClients}
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                Yenile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clients List */}
      {clients.length > 0 && (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {clients.map((client) => (
              <Card 
                key={client.id}
                className="cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-2 hover:border-purple-200"
                onClick={() => handleViewDetails(client)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <User className="h-5 w-5 mr-2 text-purple-600" />
                      {client.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewDetails(client)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detaylar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSellPackageClick(client)
                        }}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Paket Sat
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleQRCodeClick(client)
                        }}
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        QR Kod
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClient(client)
                        }}
                        disabled={deletingClientId === client.id}
                        className={`transition-all duration-200 ${
                          deleteConfirmations[client.id] 
                            ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100' 
                            : 'hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                        }`}
                      >
                        {deletingClientId === client.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                            Siliniyor...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3 mr-1" />
                            {deleteConfirmations[client.id] ? 'Tekrar Tıkla' : 'Sil'}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      {formatPhoneNumber(client.phone)}
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {client.email}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-gray-500">Kalan Seans</span>
                    <div className="flex items-center gap-2">
                      {client.remaining_sessions === 0 && (
                        <span className="text-xs text-red-500 font-medium">Seans yok!</span>
                      )}
                      <Badge 
                        variant={client.remaining_sessions > 0 ? "default" : "secondary"}
                        className={`font-bold text-sm ${
                          client.remaining_sessions > 0 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {client.remaining_sessions || 0} seans
                      </Badge>
                    </div>
                  </div>
                  {/* Visual indicator for clickable card */}
                  <div className="flex items-center justify-end pt-2">
                    <div className="flex items-center text-sm text-purple-600 font-medium">
                      <span>Detayları Gör</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Üye</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>E-posta</TableHead>
                    <TableHead>Kalan Seans</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow 
                      key={client.id}
                      className="cursor-pointer hover:bg-purple-50 transition-colors duration-200"
                      onClick={() => handleViewDetails(client)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-purple-600" />
                          {client.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.phone ? formatPhoneNumber(client.phone) : '-'}
                      </TableCell>
                      <TableCell>
                        {client.email || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {client.remaining_sessions === 0 && (
                            <span className="text-xs text-red-500 font-medium">Seans yok!</span>
                          )}
                          <Badge 
                            variant={client.remaining_sessions > 0 ? "default" : "secondary"}
                            className={`font-bold ${
                              client.remaining_sessions > 0 
                                ? 'bg-green-100 text-green-700 border-green-200' 
                                : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}
                          >
                            {client.remaining_sessions || 0} seans
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 group">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDetails(client)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Detaylar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSellPackageClick(client)
                            }}
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Paket Sat
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleQRCodeClick(client)
                            }}
                          >
                            <QrCode className="h-4 w-4 mr-1" />
                            QR Kod
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClient(client)
                            }}
                            disabled={deletingClientId === client.id}
                            className={`opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                              deleteConfirmations[client.id] 
                                ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100' 
                                : 'hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                            }`}
                          >
                            {deletingClientId === client.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                                Siliniyor...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-3 w-3 mr-1" />
                                {deleteConfirmations[client.id] ? 'Tekrar Tıkla' : 'Sil'}
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </>
      )}

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => {
          setQrModalOpen(false)
          setSelectedClient(null)
        }}
        client={selectedClient}
      />

      {/* Sell Package Modal */}
      <SellPackageModal
        isOpen={sellModalOpen}
        onClose={() => {
          setSellModalOpen(false)
          setClientForSale(null)
        }}
        client={clientForSale}
        onPackageSold={handlePackageSold}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Üyeyi Sil</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Bu üyeyi silmek istediğinize emin misiniz?</p>
              <p className="text-red-600 font-medium">⚠️ Dikkat: Üyenin tüm ders kayıtları da silinecektir!</p>
              <p className="text-sm text-gray-600">Not: Üye verileri kalıcı olarak silinmeyecek, sadece gizlenecektir.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)} disabled={deletingClientId !== null}>
              İptal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteClient} 
              disabled={deletingClientId !== null}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingClientId !== null ? 'Siliniyor...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 