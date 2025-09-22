'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Users, 
  Package, 
  QrCode, 
  LogOut, 
  User,
  Menu,
  FileText,
  Scan,
  UserCheck
} from 'lucide-react'
import { toast } from 'sonner'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface DashboardLayoutProps {
  children: ReactNode
}

interface User {
  id: string
  email?: string
  user_metadata?: {
    name?: string
  }
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  console.log('🏗️ ===== DASHBOARD LAYOUT LOADED =====')
  console.log('🔗 Current pathname:', pathname)
  console.log('🔗 Is trainer-checkin route:', pathname?.startsWith('/trainer-checkin'))
  console.log('🔗 Is checkin route:', pathname?.startsWith('/checkin'))
  console.log('🏗️ ===== END DASHBOARD LAYOUT LOAD =====')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    console.log('🔐 ===== DASHBOARD LAYOUT AUTH CHECK =====')
    console.log('🔗 Pathname in auth check:', pathname)
    console.log('🔗 Should skip auth for public routes:', pathname?.startsWith('/trainer-checkin') || pathname?.startsWith('/checkin'))
    
    // Skip auth check for public routes
    if (pathname?.startsWith('/trainer-checkin') || pathname?.startsWith('/checkin')) {
      console.log('✅ Skipping auth check for public route:', pathname)
      setLoading(false)
      return
    }
    
    console.log('🔐 Proceeding with auth check for protected route:', pathname)
    checkAuth()
  }, [pathname])

  const checkAuth = async () => {
    console.log('🔐 ===== CHECK AUTH FUNCTION STARTED =====')
    console.log('🔗 Pathname in checkAuth:', pathname)
    
    try {
      const supabase = createBrowserSupabaseClient()
      console.log('🔧 Supabase client created')
      
      // Get current session
      console.log('🔍 Getting current session...')
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Auth check error:', error)
        console.error('❌ Error details:', JSON.stringify(error, null, 2))
        toast.error('Authentication error')
        console.log('🔄 Redirecting to login due to auth error')
        router.push('/login')
        return
      }

      if (!session?.user) {
        console.log('❌ No session found, redirecting to login')
        console.log('🔄 Redirecting to login due to no session')
        router.push('/login')
        return
      }

      console.log('✅ User authenticated:', session.user.email)
      console.log('👤 User ID:', session.user.id)
      setUser(session.user)
      
    } catch (error) {
      console.error('❌ Auth check failed:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      toast.error('Failed to verify authentication')
      console.log('🔄 Redirecting to login due to auth failure')
      router.push('/login')
    } finally {
      console.log('🔐 ===== CHECK AUTH FUNCTION COMPLETED =====')
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Logout error:', error)
        toast.error('Failed to logout')
        return
      }

      toast.success('Logged out successfully')
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      toast.error('Failed to logout')
    }
  }

  // Navigation items
  const navigationItems = [
    {
      name: 'Ana Sayfa',
      href: '/dashboard',
      icon: Home,
      current: pathname === '/dashboard'
    },
    {
      name: 'QR Kodum',
      href: '/dashboard/trainer-qr',
      icon: QrCode,
      current: pathname === '/dashboard/trainer-qr'
    },
    {
      name: 'Üyeler',
      href: '/dashboard/clients',
      icon: Users,
      current: pathname === '/dashboard/clients'
    },
    {
      name: 'Paketler',
      href: '/dashboard/packages',
      icon: Package,
      current: pathname === '/dashboard/packages'
    },
    {
      name: 'Manuel Giriş',
      href: '/dashboard/scan',
      icon: UserCheck,
      current: pathname === '/dashboard/scan'
    },
    {
      name: 'Profilim',
      href: '/dashboard/profile',
      icon: User,
      current: pathname === '/dashboard/profile'
    }
  ]

  // Debug navigation items
  console.log('🧭 ===== NAVIGATION ITEMS DEBUG =====')
  console.log('🔗 Current pathname:', pathname)
  console.log('📋 Navigation items array:', navigationItems)
  console.log('🔍 Profile item found:', navigationItems.find(item => item.name === 'Profilim'))
  console.log('🔍 Profile item current state:', navigationItems.find(item => item.href === '/dashboard/profile')?.current)
  console.log('🧭 ===== END NAVIGATION DEBUG =====')

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Dashboard yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar - Fixed on left */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50 lg:bg-white lg:shadow-lg">
        {/* Sidebar Container with flex-col */}
        <div className="flex flex-col h-full">
          {/* Header/Brand Section */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-lg">💪</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">FitClient</h1>
            </div>
          </div>

          {/* Navigation Section - Takes remaining space */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <div className="space-y-1">
              {navigationItems.map((item, index) => {
                const Icon = item.icon
                return (
                  <div key={item.name}>
                    <Link
                      href={item.href}
                      className={`
                        group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 h-12 w-full
                        ${item.current
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                        }
                      `}
                    >
                      <Icon className={`
                        mr-3 h-5 w-5 flex-shrink-0
                        ${item.current ? 'text-white' : 'text-gray-500 group-hover:text-purple-600'}
                      `} />
                      <span className="font-medium truncate">{item.name}</span>
                    </Link>
                    {index < navigationItems.length - 1 && (
                      <div className="mx-4 my-1 border-t border-gray-100"></div>
                    )}
                  </div>
                )
              })}
            </div>
          </nav>

          {/* User Section - Fixed at bottom */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <User className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.user_metadata?.name || 'Eğitmen'}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-full justify-start text-gray-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50 h-10 transition-all duration-200"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Çıkış Yap
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar - Sheet Component */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          {/* Sidebar Container with flex-col */}
          <div className="flex flex-col h-full">
            {/* Header/Brand Section */}
            <SheetHeader className="flex items-center h-16 px-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-lg">💪</span>
                </div>
                <SheetTitle className="text-xl font-bold text-gray-900">FitClient</SheetTitle>
              </div>
            </SheetHeader>

            {/* Navigation Section - Takes remaining space */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              <div className="space-y-1">
                {navigationItems.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div key={item.name}>
                      <Link
                        href={item.href}
                        className={`
                          group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 h-12 w-full
                          ${item.current
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                          }
                        `}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon className={`
                          mr-3 h-5 w-5 flex-shrink-0
                          ${item.current ? 'text-white' : 'text-gray-500 group-hover:text-purple-600'}
                        `} />
                        <span className="font-medium truncate">{item.name}</span>
                      </Link>
                      {index < navigationItems.length - 1 && (
                        <div className="mx-4 my-1 border-t border-gray-100"></div>
                      )}
                    </div>
                  )
                })}
              </div>
            </nav>

            {/* User Section - Fixed at bottom */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user.user_metadata?.name || 'Eğitmen'}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {user.email}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-gray-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50 h-10 transition-all duration-200"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Çıkış Yap
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 lg:pl-64">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              {/* Mobile Hamburger Menu */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <button className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <Menu className="h-6 w-6" />
                  </button>
                </SheetTrigger>
              </Sheet>
              <h2 className="ml-2 lg:ml-0 text-lg font-semibold text-gray-900">
                {navigationItems.find(item => item.current)?.name || 'Ana Sayfa'}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-sm text-gray-600">
                Hoş geldin, <span className="font-medium">{user.user_metadata?.name || 'Eğitmen'}</span>
              </div>
              <div className="text-sm text-gray-500">
                {user.email}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
} 