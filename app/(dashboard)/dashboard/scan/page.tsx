'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, User, CheckCircle, AlertCircle, Users, Calendar, Clock, Filter, TrendingUp, Activity } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Client {
  id: string
  name: string
  phone: string
  remaining_sessions: number
  trainer_id: string
  created_at: string
}

interface Trainer {
  id: string
  name: string
}

interface CheckInStats {
  today: number
  thisWeek: number
}

interface RecentCheckIn {
  id: string
  client_name: string
  check_in_time: string
  time_ago: string
}

type FilterType = 'all' | 'today' | 'no_sessions'

export default function ManualCheckInPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [trainer, setTrainer] = useState<Trainer | null>(null)
  const [checkInStats, setCheckInStats] = useState<CheckInStats>({ today: 0, thisWeek: 0 })
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([])
  const [selectedClientIndex, setSelectedClientIndex] = useState<number>(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchTrainerAndClients()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [clients, searchTerm, activeFilter])

  useEffect(() => {
    if (trainer?.id) {
      fetchCheckInStats()
      fetchRecentCheckIns()
    }
  }, [trainer?.id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchTerm('')
        setSelectedClientIndex(-1)
        searchInputRef.current?.focus()
      } else if (e.key === 'Enter' && selectedClientIndex >= 0 && filteredClients[selectedClientIndex]) {
        e.preventDefault()
        handleCheckIn(filteredClients[selectedClientIndex])
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedClientIndex(prev => 
          prev < filteredClients.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedClientIndex(prev => prev > 0 ? prev - 1 : -1)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [filteredClients, selectedClientIndex])

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

      // Fetch all clients for this trainer with phone numbers
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, phone, remaining_sessions, trainer_id, created_at')
        .eq('trainer_id', trainerData.id)
        .order('name')

      if (clientsError) {
        toast.error('Üyeler yüklenirken hata oluştu')
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

  const fetchCheckInStats = async () => {
    if (!trainer?.id) return

    try {
      const supabase = createBrowserSupabaseClient()
      
      // Get today's check-ins
      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      
      const { count: todayCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', trainer.id)
        .gte('check_in_time', todayStart.toISOString())
        .lt('check_in_time', todayEnd.toISOString())

      // Get this week's check-ins
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      weekStart.setHours(0, 0, 0, 0)
      
      const { count: weekCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', trainer.id)
        .gte('check_in_time', weekStart.toISOString())

      setCheckInStats({
        today: todayCount || 0,
        thisWeek: weekCount || 0
      })
    } catch (error) {
      console.error('Error fetching check-in stats:', error)
    }
  }

  const fetchRecentCheckIns = async () => {
    if (!trainer?.id) return

    try {
      const supabase = createBrowserSupabaseClient()
      
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          id,
          check_in_time,
          clients!inner(name)
        `)
        .eq('trainer_id', trainer.id)
        .order('check_in_time', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching recent check-ins:', error)
        return
      }

      const formattedSessions: RecentCheckIn[] = sessions.map(session => ({
        id: session.id,
        client_name: (session.clients as any).name,
        check_in_time: session.check_in_time,
        time_ago: formatTimeAgo(session.check_in_time)
      }))

      setRecentCheckIns(formattedSessions)
    } catch (error) {
      console.error('Error fetching recent check-ins:', error)
    }
  }

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date()
    const checkInTime = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) {
      return 'Az önce'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} dakika önce`
    } else {
      const diffInHours = Math.floor(diffInMinutes / 60)
      if (diffInHours < 24) {
        return `${diffInHours} saat önce`
      } else {
        const diffInDays = Math.floor(diffInHours / 24)
        return `${diffInDays} gün önce`
      }
    }
  }

  const applyFilters = () => {
    let filtered = [...clients]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm) ||
        client.phone.slice(-4).includes(searchTerm) // Search by last 4 digits
      )
    }

    // Apply quick filters
    switch (activeFilter) {
      case 'today':
        const today = new Date()
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        
        filtered = filtered.filter(client => {
          const clientDate = new Date(client.created_at)
          return clientDate >= todayStart && clientDate < todayEnd
        })
        break
      
      case 'no_sessions':
        filtered = filtered.filter(client => client.remaining_sessions === 0)
        break
      
      case 'all':
      default:
        // No additional filtering
        break
    }

    setFilteredClients(filtered)
    setSelectedClientIndex(-1) // Reset selection when filters change
  }

  const handleCheckIn = async (client: Client) => {
    if (client.remaining_sessions <= 0) {
      toast.error('Üyenin kalan seansı bulunmamaktadır')
      return
    }

    try {
      setCheckingIn(client.id)
      console.log('🔄 Processing check-in for client:', client.name)

      const supabase = createBrowserSupabaseClient()

      // Create session record
      const sessionData = {
        client_id: client.id,
        trainer_id: client.trainer_id,
        check_in_time: new Date().toISOString(),
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
      toast.success(`${client.name} başarıyla check-in yaptı! Kalan seans: ${newRemainingSessions}`)

      // Refresh stats and recent check-ins
      fetchCheckInStats()
      fetchRecentCheckIns()

    } catch (error) {
      console.error('❌ Unexpected error during check-in:', error)
      toast.error('Check-in sırasında beklenmeyen hata oluştu')
    } finally {
      setCheckingIn(null)
    }
  }

  const getFilterCount = (filterType: FilterType) => {
    switch (filterType) {
      case 'today':
        const today = new Date()
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        return clients.filter(client => {
          const clientDate = new Date(client.created_at)
          return clientDate >= todayStart && clientDate < todayEnd
        }).length
      
      case 'no_sessions':
        return clients.filter(client => client.remaining_sessions === 0).length
      
      case 'all':
      default:
        return clients.length
    }
  }

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
      {/* Page Header with Today's Counter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manuel Giriş</h1>
          <p className="text-gray-600 mt-1">
            Üye check-in işlemlerini manuel olarak yönetin
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-purple-600">{checkInStats.today}</div>
          <div className="text-sm text-gray-500">Bugünkü Giriş</div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Bugün</p>
                  <p className="text-2xl font-bold text-gray-900">{checkInStats.today} giriş</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Bu Hafta</p>
                  <p className="text-2xl font-bold text-gray-900">{checkInStats.thisWeek} giriş</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Üye Ara
            </div>
            <div className="text-xs text-gray-500">
              📱 Telefon son 4 hanesi • ⬆️⬇️ Navigasyon • ↵ Giriş • Esc Temizle
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            ref={searchInputRef}
            placeholder="Üye adı veya telefon son 4 hanesi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Recent Check-ins */}
      {recentCheckIns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Son Girişler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentCheckIns.map((checkIn) => (
                <div key={checkIn.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{checkIn.client_name}</p>
                      <p className="text-sm text-gray-500">{checkIn.time_ago}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {new Date(checkIn.check_in_time).toLocaleString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Hızlı Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setActiveFilter('all')}
              className="flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>Tüm Üyeler</span>
              <Badge variant="secondary" className="ml-1">
                {getFilterCount('all')}
              </Badge>
            </Button>
            
            <Button
              variant={activeFilter === 'today' ? 'default' : 'outline'}
              onClick={() => setActiveFilter('today')}
              className="flex items-center space-x-2"
            >
              <Calendar className="h-4 w-4" />
              <span>Bugün Gelen Üyeler</span>
              <Badge variant="secondary" className="ml-1">
                {getFilterCount('today')}
              </Badge>
            </Button>
            
            <Button
              variant={activeFilter === 'no_sessions' ? 'default' : 'outline'}
              onClick={() => setActiveFilter('no_sessions')}
              className="flex items-center space-x-2"
            >
              <AlertCircle className="h-4 w-4" />
              <span>Dersi Biten Üyeler</span>
              <Badge variant="secondary" className="ml-1">
                {getFilterCount('no_sessions')}
              </Badge>
            </Button>
          </div>
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
                  {searchTerm || activeFilter !== 'all' 
                    ? 'Arama sonucu bulunamadı' 
                    : 'Henüz üye yok'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredClients.map((client, index) => (
            <Card 
              key={client.id} 
              className={`hover:shadow-md transition-all duration-200 cursor-pointer ${
                index === selectedClientIndex 
                  ? 'ring-2 ring-purple-500 shadow-lg bg-purple-50' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedClientIndex(index)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {client.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {client.phone}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant={client.remaining_sessions > 0 ? "default" : "secondary"}
                          className={`text-xs ${
                            client.remaining_sessions > 0 
                              ? 'bg-green-100 text-green-700 border-green-200' 
                              : 'bg-red-100 text-red-700 border-red-200'
                          }`}
                        >
                          Kalan: {client.remaining_sessions} ders
                        </Badge>
                        {client.remaining_sessions === 0 && (
                          <span className="text-xs text-red-500">Seans yok</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {index === selectedClientIndex && (
                      <div className="text-xs text-purple-600 font-medium">
                        ↵ Enter ile giriş
                      </div>
                    )}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCheckIn(client)
                      }}
                      disabled={checkingIn === client.id || client.remaining_sessions <= 0}
                      size="sm"
                      className={
                        client.remaining_sessions > 0
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }
                    >
                      {checkingIn === client.id ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>İşleniyor...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4" />
                          <span>Giriş Yap</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 