'use client'

import { useEffect, useState } from 'react'
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
  QrCode
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

export default function DashboardPage() {
  const [trainer, setTrainer] = useState<Trainer | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

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

    } catch (error) {
      console.error('Error fetching stats:', error)
      // Don't throw here, just log the error and continue with mock data
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
            <p className="text-gray-600">Loading your dashboard...</p>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={retryFetch} variant="outline">
              Try Again
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
              Welcome back, {trainer?.name || 'Trainer'}! 👋
            </h1>
            <p className="text-purple-100">
              Here's what's happening with your fitness business today.
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
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active clients in your system
            </p>
          </CardContent>
        </Card>

        {/* Total Packages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPackages || 0}</div>
            <p className="text-xs text-muted-foreground">
              Available training packages
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
            <CardTitle className="text-sm font-medium">Sessions This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sessionsThisMonth || 0}</div>
            <p className="text-xs text-muted-foreground">
              Completed sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Average Rating */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageRating || 0}/5.0</div>
            <p className="text-xs text-muted-foreground">
              Client satisfaction score
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled for this week
            </p>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Session completion rate
            </p>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently active sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
            <Users className="h-6 w-6" />
            <span>Add New Client</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
            <Package className="h-6 w-6" />
            <span>Create Package</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
            <Calendar className="h-6 w-6" />
            <span>Schedule Session</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
            <QrCode className="h-6 w-6" />
            <span>Scan QR Code</span>
          </Button>
        </div>
      </div>
    </div>
  )
} 