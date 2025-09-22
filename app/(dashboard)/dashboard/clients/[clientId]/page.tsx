'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Package, 
  Clock, 
  QrCode, 
  UserCheck, 
  Trash2, 
  Edit3, 
  Save, 
  X,
  Plus,
  Eye,
  BarChart3,
  StickyNote,
  TrendingUp,
  CalendarDays
} from 'lucide-react'
import { toast } from 'sonner'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
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
  notes?: string
}

interface Purchase {
  id: string
  client_id: string
  package_id: string
  remaining_sessions: number
  purchase_date: string
  created_at: string
  package_name?: string
  original_sessions?: number
  package_price?: number
}

interface Session {
  id: string
  client_id: string
  trainer_id: string
  check_in_time: string
  created_at: string
}

interface Package {
  id: string
  name: string
  session_count: number
  price: number
}

interface ClientStats {
  totalSessions: number
  averageSessionsPerMonth: number
  lastVisitDate: string | null
  memberSince: string
  sessionsByMonth: Array<{
    month: string
    sessions: number
  }>
}

export default function ClientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string

  // State
  const [client, setClient] = useState<Client | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<{ field: string; value: string } | null>(null)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (clientId) {
      fetchClientData()
    }
  }, [clientId])

  const fetchClientData = async () => {
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
      const { data: trainer, error: trainerError } = await supabase
        .from('trainers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (trainerError || !trainer) {
        toast.error('Eğitmen profili alınırken hata oluştu')
        return
      }

      // Fetch client data
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('trainer_id', trainer.id)
        .is('deleted_at', null)
        .single()

      if (clientError || !clientData) {
        toast.error('Üye bulunamadı')
        router.push('/dashboard/clients')
        return
      }

      setClient(clientData)
      setNotes(clientData.notes || '')

      // Fetch purchases with package details
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select(`
          *,
          packages:package_id (
            name,
            session_count,
            price
          )
        `)
        .eq('client_id', clientId)
        .order('purchase_date', { ascending: false })

      if (purchasesError) {
        console.error('Error fetching purchases:', purchasesError)
      } else {
        const formattedPurchases = purchasesData?.map(purchase => ({
          ...purchase,
          package_name: (purchase.packages as any)?.name,
          original_sessions: (purchase.packages as any)?.session_count,
          package_price: (purchase.packages as any)?.price
        })) || []
        setPurchases(formattedPurchases)
      }

      // Fetch all sessions for statistics
      const { data: allSessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('client_id', clientId)
        .order('check_in_time', { ascending: false })

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError)
      } else {
        const allSessions = allSessionsData || []
        setSessions(allSessions.slice(0, 10)) // Keep only last 10 for display
        
        // Calculate statistics
        const stats = calculateClientStats(allSessions, clientData.created_at)
        setStats(stats)
      }

    } catch (error) {
      console.error('Error fetching client data:', error)
      toast.error('Üye bilgileri yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const calculateClientStats = (sessions: Session[], memberSince: string): ClientStats => {
    const totalSessions = sessions.length
    
    // Calculate average sessions per month
    const memberDate = new Date(memberSince)
    const now = new Date()
    const monthsDiff = (now.getFullYear() - memberDate.getFullYear()) * 12 + 
                      (now.getMonth() - memberDate.getMonth())
    const averageSessionsPerMonth = monthsDiff > 0 ? totalSessions / monthsDiff : totalSessions

    // Get last visit date
    const lastVisitDate = sessions.length > 0 ? sessions[0].check_in_time : null

    // Calculate sessions by month for the last 6 months
    const sessionsByMonth = []
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = `${monthNames[date.getMonth()]} ${date.getFullYear()}`
      
      const monthSessions = sessions.filter(session => {
        const sessionDate = new Date(session.check_in_time)
        return sessionDate.getFullYear() === date.getFullYear() && 
               sessionDate.getMonth() === date.getMonth()
      }).length

      sessionsByMonth.push({
        month: monthName,
        sessions: monthSessions
      })
    }

    return {
      totalSessions,
      averageSessionsPerMonth: Math.round(averageSessionsPerMonth * 10) / 10,
      lastVisitDate,
      memberSince,
      sessionsByMonth
    }
  }

  const handleEdit = (field: string, currentValue: string) => {
    setEditing({ field, value: currentValue })
  }

  const handleSave = async () => {
    if (!editing || !client) return

    try {
      const supabase = createBrowserSupabaseClient()
      
      const { error } = await supabase
        .from('clients')
        .update({ 
          [editing.field]: editing.value,
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id)

      if (error) {
        toast.error('Güncelleme sırasında hata oluştu')
        return
      }

      setClient(prev => prev ? { ...prev, [editing.field]: editing.value } : null)
      setEditing(null)
      toast.success('Üye bilgileri güncellendi')
    } catch (error) {
      console.error('Error updating client:', error)
      toast.error('Güncelleme sırasında hata oluştu')
    }
  }

  const handleCancel = () => {
    setEditing(null)
  }

  const handleNotesSave = async () => {
    if (!client) return

    try {
      const supabase = createBrowserSupabaseClient()
      
      const { error } = await supabase
        .from('clients')
        .update({ 
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id)

      if (error) {
        toast.error('Notlar kaydedilirken hata oluştu')
        return
      }

      setClient(prev => prev ? { ...prev, notes } : null)
      setEditingNotes(false)
      toast.success('Notlar kaydedildi')
    } catch (error) {
      console.error('Error saving notes:', error)
      toast.error('Notlar kaydedilirken hata oluştu')
    }
  }

  const handleDelete = async () => {
    if (!client) return

    try {
      setDeleting(true)
      const supabase = createBrowserSupabaseClient()

      const { error } = await supabase
        .from('clients')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id)

      if (error) {
        toast.error('Üye silinirken hata oluştu')
        return
      }

      toast.success('Üye başarıyla silindi')
      router.push('/dashboard/clients')
    } catch (error) {
      console.error('Error deleting client:', error)
      toast.error('Üye silinirken hata oluştu')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleManualCheckIn = () => {
    router.push(`/dashboard/scan?clientId=${clientId}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} dakika önce`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `${hours} saat önce`
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return `${days} gün önce`
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Üye bilgileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Üye bulunamadı</p>
        <Button onClick={() => router.push('/dashboard/clients')} className="mt-4">
          Üye Listesine Dön
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/clients')}
              className="flex items-center gap-2 h-10 w-10 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{client.name}</h1>
              <p className="text-sm text-gray-600">Üye Detayları</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Statistics Cards - Mobile Optimized */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-medium text-gray-600">Toplam Seans</span>
              </div>
              <div className="text-xl font-bold text-purple-600">{stats.totalSessions}</div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-gray-600">Aylık Ort.</span>
              </div>
              <div className="text-xl font-bold text-green-600">{stats.averageSessionsPerMonth}</div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-gray-600">Son Ziyaret</span>
              </div>
              <div className="text-sm font-bold text-blue-600">
                {stats.lastVisitDate ? formatTimeAgo(stats.lastVisitDate) : 'Henüz yok'}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-orange-600" />
                <span className="text-xs font-medium text-gray-600">Üyelik</span>
              </div>
              <div className="text-sm font-bold text-orange-600">
                {formatDate(stats.memberSince)}
              </div>
            </Card>
          </div>
        )}

        {/* Client Info Card - Mobile Optimized */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-purple-600" />
              Üye Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Ad Soyad</span>
              </div>
              {editing?.field === 'name' ? (
                <div className="space-y-2">
                  <Input
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                    className="h-12 text-base"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} className="flex-1 h-10">
                      <Save className="h-4 w-4 mr-2" />
                      Kaydet
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel} className="flex-1 h-10">
                      <X className="h-4 w-4 mr-2" />
                      İptal
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-900 font-medium">{client.name}</span>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit('name', client.name)} className="h-8 w-8 p-0">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Telefon</span>
              </div>
              {editing?.field === 'phone' ? (
                <div className="space-y-2">
                  <Input
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                    className="h-12 text-base"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} className="flex-1 h-10">
                      <Save className="h-4 w-4 mr-2" />
                      Kaydet
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel} className="flex-1 h-10">
                      <X className="h-4 w-4 mr-2" />
                      İptal
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-900">{client.phone || 'Belirtilmemiş'}</span>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit('phone', client.phone || '')} className="h-8 w-8 p-0">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">E-posta</span>
              </div>
              {editing?.field === 'email' ? (
                <div className="space-y-2">
                  <Input
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                    className="h-12 text-base"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} className="flex-1 h-10">
                      <Save className="h-4 w-4 mr-2" />
                      Kaydet
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel} className="flex-1 h-10">
                      <X className="h-4 w-4 mr-2" />
                      İptal
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-900">{client.email || 'Belirtilmemiş'}</span>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit('email', client.email || '')} className="h-8 w-8 p-0">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Registration Date */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Kayıt Tarihi</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-900">{formatDate(client.created_at)}</span>
              </div>
            </div>

            {/* Total Sessions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Toplam Seans</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <Badge variant="secondary" className="text-sm">{stats?.totalSessions || 0} seans</Badge>
              </div>
            </div>

            {/* Remaining Sessions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Kalan Seans</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <Badge 
                  variant={client.remaining_sessions > 0 ? "default" : "secondary"}
                  className={client.remaining_sessions > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                >
                  {client.remaining_sessions} seans
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Frequency Chart - Mobile Optimized */}
        {stats && stats.sessionsByMonth.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Son 6 Ay Seans Frekansı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.sessionsByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="sessions" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes Section - Mobile Optimized */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-purple-600" />
                Üye Notları
              </div>
              {!editingNotes && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingNotes(true)}
                  className="h-8"
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Düzenle
                </Button>
              )}
            </CardTitle>
            <CardDescription className="text-sm">
              Özel gereksinimler, sağlık durumu, notlar...
            </CardDescription>
          </CardHeader>
          <CardContent>
            {editingNotes ? (
              <div className="space-y-3">
                <Textarea
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  placeholder="Üye hakkında notlarınızı buraya yazın..."
                  className="min-h-[120px] text-base"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleNotesSave} className="flex-1 h-10">
                    <Save className="h-4 w-4 mr-2" />
                    Kaydet
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setEditingNotes(false)
                      setNotes(client.notes || '')
                    }}
                    className="flex-1 h-10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    İptal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="min-h-[120px] p-3 bg-gray-50 rounded-lg">
                {notes ? (
                  <p className="text-gray-700 whitespace-pre-wrap text-sm">{notes}</p>
                ) : (
                  <p className="text-gray-500 italic text-sm">Henüz not eklenmemiş</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase History - Mobile Optimized */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                Satın Alma Geçmişi
              </div>
              <Button 
                onClick={() => router.push(`/dashboard/clients/${clientId}/purchase`)}
                size="sm"
                className="h-8"
              >
                <Plus className="h-4 w-4 mr-1" />
                Yeni Paket
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {purchases.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Henüz paket satın alınmamış</p>
            ) : (
              <div className="space-y-3">
                {purchases.map((purchase) => (
                  <div key={purchase.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{purchase.package_name}</h4>
                      <Badge 
                        variant={purchase.remaining_sessions > 0 ? "default" : "secondary"}
                        className={purchase.remaining_sessions > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                      >
                        {purchase.remaining_sessions} kalan
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {formatDate(purchase.purchase_date)} • {purchase.original_sessions} seans
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session History - Mobile Optimized */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Son Girişler
              </div>
              <Button 
                onClick={() => router.push(`/dashboard/clients/${clientId}/sessions`)}
                size="sm"
                variant="outline"
                className="h-8"
              >
                <Eye className="h-4 w-4 mr-1" />
                Tümünü Gör
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Henüz giriş yapılmamış</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{formatDate(session.check_in_time)}</p>
                        <p className="text-xs text-gray-600">{formatTimeAgo(session.check_in_time)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fixed Action Buttons at Bottom - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3 lg:hidden">
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={() => router.push(`/dashboard/clients/${clientId}/qr`)}
            className="h-12 text-sm"
            variant="outline"
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR Kodu
          </Button>
          
          <Button 
            onClick={handleManualCheckIn}
            className="h-12 text-sm"
            variant="outline"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Giriş Yap
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={() => router.push(`/dashboard/clients/${clientId}/purchase`)}
            className="h-12 text-sm"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Paket Sat
          </Button>
          
          <Button 
            onClick={() => setDeleteDialogOpen(true)}
            className="h-12 text-sm"
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Üyeyi Sil
          </Button>
        </div>
      </div>

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
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              İptal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Siliniyor...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 