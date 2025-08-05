'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { 
  Users, 
  Package, 
  Calendar, 
  TrendingUp,
  Activity,
  Clock,
  Target,
  QrCode,
  User,
  CheckCircle,
  UserCheck
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Trainer {
  id: string
  user_id: string
  email: string
  name: string
  created_at: string
  updated_at: string
}

interface DashboardStats {
  totalClients: number
  totalPackages: number
  activeSessions: number
  monthlyRevenue: number
  sessionsThisMonth: number
  averageRating: number
  upcomingSessions: number
  completionRate: number
}

interface RecentSession {
  id: string
  client_name: string
  check_in_time: string
  time_ago: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [trainer, setTrainer] = useState<Trainer | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
    
    // Auto-refresh recent sessions every 30 seconds
    const interval = setInterval(() => {
      if (trainer?.id) {
        fetchRecentSessions(trainer.id)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [trainer?.id])

  // Quick action handlers
  const handleAddClient = () => {
    router.push('/dashboard/clients')
  }

  const handleCreatePackage = () => {
    router.push('/dashboard/packages')
  }

  const handleScheduleSession = () => {
    // For now, navigate to clients page where they can select a client to schedule
    router.push('/dashboard/clients')
    toast.info('Müşteri seçtikten sonra seans planlayabilirsiniz')
  }

  const handleManualCheckIn = () => {
    router.push('/dashboard/scan')
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const supabase = createBrowserSupabaseClient()

      // Step 1: Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Error fetching user:', userError)
        throw new Error('Failed to get user information')
      }

      if (!user) {
        throw new Error('No authenticated user found')
      }

      console.log('Current user:', user.email)

      // Step 2: Fetch trainer record using user_id
      const { data: trainerData, error: trainerError } = await supabase
        .from('trainers')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (trainerError) {
        console.error('Error fetching trainer:', trainerError)
        throw new Error('Failed to fetch trainer profile')
      }

      if (!trainerData) {
        throw new Error('Trainer profile not found')
      }

      console.log('Trainer data:', trainerData)
      setTrainer(trainerData)

      // Step 3: Fetch dashboard statistics
      await fetchStats(supabase, trainerData.id)

    } catch (error: any) {
      console.error('Dashboard data fetch error:', error)
      setError(error.message || 'Failed to load dashboard data')
      toast.error('Failed to load dashboard', {
        description: error.message || 'Please try refreshing the page'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async (supabase: any, trainerId: string) => {
    try {
      // Fetch basic counts
      const [clientsResult, packagesResult, sessionsResult] = await Promise.all([
        supabase
          .from('clients')
          .select('id', { count: 'exact' })
          .eq('trainer_id', trainerId),
        supabase
          .from('packages')
          .select('id', { count: 'exact' })
          .eq('trainer_id', trainerId),
        supabase
          .from('sessions')
          .select('id', { count: 'exact' })
          .eq('trainer_id', trainerId)
      ])

      // Mock statistics for now (in a real app, you'd calculate these from actual data)
      const mockStats: DashboardStats = {
        totalClients: clientsResult.count || 0,
        totalPackages: packagesResult.count || 0,
        activeSessions: sessionsResult.count || 0,
        monthlyRevenue: 2450,
        sessionsThisMonth: 12,
        averageRating: 4.8,
        upcomingSessions: 3,
        completionRate: 87
      }

      setStats(mockStats)
      console.log('Dashboard stats:', mockStats)

      // Fetch recent sessions
      await fetchRecentSessions(trainerId)

    } catch (error) {
      console.error('Error fetching stats:', error)
      // Don't throw here, just log the error and continue with mock data
    }
  }

  const fetchRecentSessions = async (trainerId: string) => {
    try {
      const supabase = createBrowserSupabaseClient()
      
      // Fetch last 5 sessions with client names
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          id,
          check_in_time,
          clients!inner(name)
        `)
        .eq('trainer_id', trainerId)
        .order('check_in_time', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching recent sessions:', error)
        return
      }

      // Format the sessions with time ago
      const formattedSessions: RecentSession[] = sessions.map(session => ({
        id: session.id,
        client_name: (session.clients as any).name,
        check_in_time: session.check_in_time,
        time_ago: formatTimeAgo(session.check_in_time)
      }))

      setRecentSessions(formattedSessions)
      console.log('Recent sessions:', formattedSessions)

    } catch (error) {
      console.error('Error fetching recent sessions:', error)
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

  const retryFetch = () => {
    fetchDashboardData()
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Dashboard yükleniyor...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Dashboard Yüklenemedi</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={retryFetch} variant="outline">
              Tekrar Dene
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Main dashboard content
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Hoş geldiniz, {trainer?.name || 'Eğitmen'}! 👋
            </h1>
            <p className="text-purple-100">
              Fitness işletmenizin bugünkü durumu.
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <span className="text-2xl">💪</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Müşteri</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              Sistemdeki aktif müşteriler
            </p>
          </CardContent>
        </Card>

        {/* Total Packages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Paket</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPackages || 0}</div>
            <p className="text-xs text-muted-foreground">
              Mevcut antrenman paketleri
            </p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aylık Gelir</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺{stats?.monthlyRevenue?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Bu ayki gelir
            </p>
          </CardContent>
        </Card>

        {/* Sessions This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bu Ayki Seanslar</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sessionsThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">
              Tamamlanan seanslar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Average Rating */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Puan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageRating || 0}/5.0</div>
            <p className="text-xs text-muted-foreground">
              Müşteri memnuniyet puanı
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yaklaşan Seanslar</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Bu hafta planlanmış
            </p>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlanma Oranı</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Seans tamamlanma oranı
            </p>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Seanslar</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Şu anda aktif seanslar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Hızlı İşlemler</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button 
            onClick={handleAddClient} 
            variant="outline" 
            className="h-24 p-4 flex flex-col items-center justify-center space-y-3 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group shadow-md hover:shadow-lg border-2 hover:border-purple-300 bg-gradient-to-br from-purple-50 to-white hover:from-purple-100 hover:to-purple-50"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors duration-200">
              <Users className="h-6 w-6 text-purple-600 group-hover:scale-110 transition-transform duration-200" />
            </div>
            <span className="font-medium text-gray-900 group-hover:text-purple-700 transition-colors duration-200">Yeni Müşteri Ekle</span>
          </Button>
          <Button 
            onClick={handleCreatePackage} 
            variant="outline" 
            className="h-24 p-4 flex flex-col items-center justify-center space-y-3 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group shadow-md hover:shadow-lg border-2 hover:border-blue-300 bg-gradient-to-br from-blue-50 to-white hover:from-blue-100 hover:to-blue-50"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
              <Package className="h-6 w-6 text-blue-600 group-hover:scale-110 transition-transform duration-200" />
            </div>
            <span className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors duration-200">Paket Oluştur</span>
          </Button>
          <Button 
            onClick={handleScheduleSession} 
            variant="outline" 
            className="h-24 p-4 flex flex-col items-center justify-center space-y-3 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group shadow-md hover:shadow-lg border-2 hover:border-green-300 bg-gradient-to-br from-green-50 to-white hover:from-green-100 hover:to-green-50"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors duration-200">
              <Calendar className="h-6 w-6 text-green-600 group-hover:scale-110 transition-transform duration-200" />
            </div>
            <span className="font-medium text-gray-900 group-hover:text-green-700 transition-colors duration-200">Seans Planla</span>
          </Button>
          <Button 
            onClick={handleManualCheckIn} 
            variant="outline" 
            className="h-24 p-4 flex flex-col items-center justify-center space-y-3 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group shadow-md hover:shadow-lg border-2 hover:border-orange-300 bg-gradient-to-br from-orange-50 to-white hover:from-orange-100 hover:to-orange-50"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors duration-200">
              <UserCheck className="h-6 w-6 text-orange-600 group-hover:scale-110 transition-transform duration-200" />
            </div>
            <span className="font-medium text-gray-900 group-hover:text-orange-700 transition-colors duration-200">Manuel Giriş</span>
          </Button>
        </div>
      </div>

      {/* Recent Check-ins */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Son Girişler</h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Canlı</span>
          </div>
        </div>
        
        {recentSessions.length > 0 ? (
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{session.client_name}</p>
                    <p className="text-sm text-gray-500">{session.time_ago}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    {new Date(session.check_in_time).toLocaleString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500">Henüz giriş yapılmamış</p>
            <p className="text-sm text-gray-400 mt-1">İlk giriş yapıldığında burada görünecek</p>
          </div>
        )}
      </div>
    </div>
  )
} 