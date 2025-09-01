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
  monthlyRevenue: number
  averageRating: number
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
      const [clientsResult, packagesResult] = await Promise.all([
        supabase
          .from('clients')
          .select('id', { count: 'exact' })
          .eq('trainer_id', trainerId)
          .is('deleted_at', null), // Only count active clients
        supabase
          .from('packages')
          .select('id', { count: 'exact' })
          .eq('trainer_id', trainerId)
      ])

      // Calculate monthly revenue from actual purchases data
      const currentMonth = new Date()
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('amount')
        .eq('trainer_id', trainerId)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())

      if (purchasesError) {
        console.error('Error fetching purchases:', purchasesError)
      }

      // Calculate total monthly revenue
      const monthlyRevenue = purchasesData?.reduce((total: number, purchase: { amount: number | null }) => total + (purchase.amount ?? 0), 0) ?? 0

      // Create stats object with actual data and proper defaults
      const dashboardStats: DashboardStats = {
        totalClients: clientsResult.count ?? 0,
        totalPackages: packagesResult.count ?? 0,
        monthlyRevenue: monthlyRevenue,
        averageRating: 5.0 // Default rating for new trainers
      }

      setStats(dashboardStats)
      console.log('Dashboard stats:', dashboardStats)

      // Fetch recent sessions
      await fetchRecentSessions(trainerId)

    } catch (error) {
      console.error('Error fetching stats:', error)
      // Set default stats if there's an error
      const defaultStats: DashboardStats = {
        totalClients: 0,
        totalPackages: 0,
        monthlyRevenue: 0,
        averageRating: 5.0
      }
      setStats(defaultStats)
    }
  }

  const fetchRecentSessions = async (trainerId: string) => {
    try {
      const supabase = createBrowserSupabaseClient()
      
      // Fetch last 5 check-ins with client names, ordered by most recent
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
        console.error('Error fetching recent check-ins:', error)
        setRecentSessions([])
        return
      }

      // Format the sessions with time ago and ensure proper ordering
      const formattedSessions: RecentSession[] = (sessions ?? [])
        .sort((a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime())
        .map(session => ({
          id: session.id,
          client_name: (session.clients as any).name,
          check_in_time: session.check_in_time,
          time_ago: formatTimeAgo(session.check_in_time)
        }))

      setRecentSessions(formattedSessions)
      console.log('Recent check-ins:', formattedSessions)

    } catch (error) {
      console.error('Error fetching recent check-ins:', error)
      setRecentSessions([])
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
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-3">
              Hoş geldiniz, {trainer?.name || 'Eğitmen'}! 👋
            </h1>
            <p className="text-purple-100 text-lg">
              Fitness işletmenizin bugünkü durumu.
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <span className="text-3xl">💪</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid - Top Row with 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {/* Total Clients */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Toplam Müşteri</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.totalClients ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sistemdeki aktif müşteriler
            </p>
          </CardContent>
        </Card>

        {/* Total Packages */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Toplam Paket</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.totalPackages ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Mevcut antrenman paketleri
            </p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Aylık Gelir</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">₺{stats?.monthlyRevenue?.toLocaleString() ?? '0'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Bu ayki gelir
            </p>
          </CardContent>
        </Card>

        {/* Average Rating - moved to 4th position */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Ortalama Puan</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats?.averageRating?.toFixed(1) ?? '5.0'}/5.0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Müşteri memnuniyet puanı
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TODO: Premium features - coming soon */}
      {/* Removed cards:
        - Yaklaşan Seanslar (Upcoming Sessions)
        - Bu Ayki Seanslar (Sessions This Month) 
        - Tamamlanma Oranı (Completion Rate)
        - Aktif Seanslar (Active Sessions)
      */}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border p-8 shadow-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Hızlı İşlemler</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Button 
            onClick={handleAddClient} 
            variant="outline" 
            className="h-28 p-6 flex flex-col items-center justify-center space-y-4 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group shadow-lg hover:shadow-xl border-2 hover:border-purple-400 bg-gradient-to-br from-purple-50 to-white hover:from-purple-100 hover:to-purple-50 rounded-xl"
          >
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors duration-200">
              <Users className="h-7 w-7 text-purple-600 group-hover:scale-110 transition-transform duration-200" />
            </div>
            <span className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors duration-200 text-center">Yeni Müşteri Ekle</span>
          </Button>
          <Button 
            onClick={handleCreatePackage} 
            variant="outline" 
            className="h-28 p-6 flex flex-col items-center justify-center space-y-4 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group shadow-lg hover:shadow-xl border-2 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-white hover:from-blue-100 hover:to-blue-50 rounded-xl"
          >
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
              <Package className="h-7 w-7 text-blue-600 group-hover:scale-110 transition-transform duration-200" />
            </div>
            <span className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200 text-center">Paket Oluştur</span>
          </Button>
          <Button 
            onClick={handleScheduleSession} 
            variant="outline" 
            className="h-28 p-6 flex flex-col items-center justify-center space-y-4 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group shadow-lg hover:shadow-xl border-2 hover:border-green-400 bg-gradient-to-br from-green-50 to-white hover:from-green-100 hover:to-green-50 rounded-xl"
          >
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors duration-200">
              <Calendar className="h-7 w-7 text-green-600 group-hover:scale-110 transition-transform duration-200" />
            </div>
            <span className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors duration-200 text-center">Seans Planla</span>
          </Button>
          <Button 
            onClick={handleManualCheckIn} 
            variant="outline" 
            className="h-28 p-6 flex flex-col items-center justify-center space-y-4 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group shadow-lg hover:shadow-xl border-2 hover:border-orange-400 bg-gradient-to-br from-orange-50 to-white hover:from-orange-100 hover:to-orange-50 rounded-xl"
          >
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors duration-200">
              <UserCheck className="h-7 w-7 text-orange-600 group-hover:scale-110 transition-transform duration-200" />
            </div>
            <span className="font-semibold text-gray-900 group-hover:text-orange-700 transition-colors duration-200 text-center">Manuel Giriş</span>
          </Button>
        </div>
      </div>

      {/* Recent Check-ins */}
      <div className="bg-white rounded-xl border p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Son Girişler</h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Canlı</span>
          </div>
        </div>
        
        {recentSessions.length > 0 ? (
          <div className="space-y-4">
            {recentSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{session.client_name}</p>
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
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <UserCheck className="h-10 w-10 text-gray-400" />
            </div>
            <p className="text-gray-500 font-semibold text-lg">Henüz giriş kaydı yok</p>
            <p className="text-sm text-gray-400 mt-2">İlk giriş yapıldığında burada görünecek</p>
          </div>
        )}
      </div>
    </div>
  )
} 