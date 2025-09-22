'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Building, Shield, BarChart3, CreditCard, Edit, Save, X, Eye, EyeOff, Upload, Download, Palette, Frame, QrCode, TrendingUp, Users, Clock, PieChart, Bell, Mail, Smartphone, FileText, Calendar, FileSpreadsheet, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { QRCodeSVG } from 'qrcode.react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar } from 'recharts'

interface Trainer {
  id: string
  name: string
  email: string
  phone?: string
  business_name?: string
  address?: string
  working_hours?: string
  qr_settings?: {
    logo_url?: string
    color?: string
    frame_style?: string
  }
  notification_preferences?: NotificationPreferences
}

interface Statistics {
  totalClients: number
  activePackages: number
  monthlyRevenue: number
  monthlySessions: number
}

interface QRCodeSettings {
  logo_url: string
  color: string
  frame_style: string
}

interface NotificationPreferences {
  email: {
    newClientRegistration: boolean
    lowPackageSessions: boolean
    dailySummary: boolean
  }
  push: {
    enabled: boolean
    newClientRegistration: boolean
    lowPackageSessions: boolean
  }
  sms: {
    enabled: boolean
    newClientRegistration: boolean
    lowPackageSessions: boolean
  }
}

interface AnalyticsData {
  monthlyRevenue: Array<{ month: string; revenue: number }>
  popularPackages: Array<{ name: string; value: number; color: string }>
  peakHours: Array<{ hour: string; sessions: number }>
  clientRetention: number
}

export default function ProfilePage() {
  console.log('👤 ===== PROFILE PAGE LOADED =====')
  console.log('📅 Timestamp:', new Date().toISOString())
  console.log('🔗 Component: ProfilePage')
  console.log('👤 ===== END PROFILE PAGE LOAD =====')

  const [trainer, setTrainer] = useState<Trainer | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statistics, setStatistics] = useState<Statistics>({
    totalClients: 0,
    activePackages: 0,
    monthlyRevenue: 0,
    monthlySessions: 0
  })
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    monthlyRevenue: [],
    popularPackages: [],
    peakHours: [],
    clientRetention: 0
  })

  // Form states
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    phone: ''
  })
  const [businessInfo, setBusinessInfo] = useState({
    business_name: '',
    address: '',
    working_hours: ''
  })

  // Edit modes
  const [editingPersonal, setEditingPersonal] = useState(false)
  const [editingBusiness, setEditingBusiness] = useState(false)

  // Password change modal
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  // QR Code customization
  const [qrSettings, setQrSettings] = useState<QRCodeSettings>({
    logo_url: '',
    color: '#000000',
    frame_style: 'none'
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const qrRef = useRef<HTMLDivElement>(null)

  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    email: {
      newClientRegistration: true,
      lowPackageSessions: true,
      dailySummary: false
    },
    push: {
      enabled: false,
      newClientRegistration: true,
      lowPackageSessions: true
    },
    sms: {
      enabled: false,
      newClientRegistration: false,
      lowPackageSessions: false
    }
  })

  // Export functionality
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [exporting, setExporting] = useState(false)

  const supabase = createBrowserSupabaseClient()

  // QR Code options
  const qrColors = [
    { name: 'Siyah', value: '#000000' },
    { name: 'Mavi', value: '#2563eb' },
    { name: 'Yeşil', value: '#16a34a' },
    { name: 'Kırmızı', value: '#dc2626' },
    { name: 'Mor', value: '#7c3aed' },
    { name: 'Turuncu', value: '#ea580c' }
  ]

  const frameStyles = [
    { name: 'Çerçeve Yok', value: 'none' },
    { name: 'Yuvarlak', value: 'rounded' },
    { name: 'Kare', value: 'square' },
    { name: 'Diamond', value: 'diamond' }
  ]

  // Chart colors
  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']

  useEffect(() => {
    fetchTrainerData()
    fetchStatistics()
    fetchAnalytics()
  }, [])

  const fetchTrainerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Kullanıcı bilgileri alınamadı')
        return
      }

      const { data: trainerData, error } = await supabase
        .from('trainers')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching trainer:', error)
        toast.error('Profil bilgileri yüklenirken hata oluştu')
        return
      }

      setTrainer(trainerData)
      setPersonalInfo({
        name: trainerData.name || '',
        phone: trainerData.phone || ''
      })
      setBusinessInfo({
        business_name: trainerData.business_name || '',
        address: trainerData.address || '',
        working_hours: trainerData.working_hours || ''
      })

      // Set QR settings
      if (trainerData.qr_settings) {
        setQrSettings({
          logo_url: trainerData.qr_settings.logo_url || '',
          color: trainerData.qr_settings.color || '#000000',
          frame_style: trainerData.qr_settings.frame_style || 'none'
        })
        if (trainerData.qr_settings.logo_url) {
          setLogoPreview(trainerData.qr_settings.logo_url)
        }
      }

      // Set notification preferences
      if (trainerData.notification_preferences) {
        setNotificationPrefs(trainerData.notification_preferences)
      }
    } catch (error) {
      console.error('Error fetching trainer data:', error)
      toast.error('Profil bilgileri yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get total clients
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', user.id)

      // Get active packages
      const { count: packagesCount } = await supabase
        .from('packages')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', user.id)
        .eq('is_active', true)

      // Get this month's revenue (from purchases)
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: purchases } = await supabase
        .from('purchases')
        .select(`
          price,
          packages!inner(trainer_id)
        `)
        .eq('packages.trainer_id', user.id)
        .gte('created_at', startOfMonth.toISOString())

      const monthlyRevenue = purchases?.reduce((sum, purchase) => sum + (purchase.price || 0), 0) || 0

      // Get this month's sessions
      const { count: sessionsCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', user.id)
        .gte('created_at', startOfMonth.toISOString())

      setStatistics({
        totalClients: clientsCount || 0,
        activePackages: packagesCount || 0,
        monthlyRevenue,
        monthlySessions: sessionsCount || 0
      })
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get monthly revenue data (last 6 months)
      const monthlyRevenue = []
      const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        const { data: purchases } = await supabase
          .from('purchases')
          .select(`
            price,
            packages!inner(trainer_id)
          `)
          .eq('packages.trainer_id', user.id)
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString())

        const revenue = purchases?.reduce((sum, purchase) => sum + (purchase.price || 0), 0) || 0
        monthlyRevenue.push({
          month: months[date.getMonth()],
          revenue
        })
      }

      // Get popular packages
      const { data: packages } = await supabase
        .from('packages')
        .select(`
          name,
          purchases(count)
        `)
        .eq('trainer_id', user.id)
        .eq('is_active', true)

      const popularPackages = packages?.slice(0, 5).map((pkg, index) => ({
        name: pkg.name,
        value: pkg.purchases?.[0]?.count || 0,
        color: chartColors[index % chartColors.length]
      })) || []

      // Get peak hours (sessions by hour)
      const { data: sessions } = await supabase
        .from('sessions')
        .select('created_at')
        .eq('trainer_id', user.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      const hourCounts = new Array(24).fill(0)
      sessions?.forEach(session => {
        const hour = new Date(session.created_at).getHours()
        hourCounts[hour]++
      })

      const peakHours = hourCounts.map((count, hour) => ({
        hour: `${hour}:00`,
        sessions: count
      })).filter(item => item.sessions > 0)

      // Calculate client retention rate
      const { data: allClients } = await supabase
        .from('clients')
        .select('created_at')
        .eq('trainer_id', user.id)

      const { data: activeClients } = await supabase
        .from('sessions')
        .select('client_id')
        .eq('trainer_id', user.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      const uniqueActiveClients = new Set(activeClients?.map(s => s.client_id) || []).size
      const totalClients = allClients?.length || 0
      const retentionRate = totalClients > 0 ? Math.round((uniqueActiveClients / totalClients) * 100) : 0

      setAnalytics({
        monthlyRevenue,
        popularPackages,
        peakHours,
        clientRetention: retentionRate
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  const handlePersonalInfoSave = async () => {
    if (!trainer) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('trainers')
        .update({
          name: personalInfo.name,
          phone: personalInfo.phone
        })
        .eq('id', trainer.id)

      if (error) {
        throw error
      }

      setTrainer(prev => prev ? { ...prev, ...personalInfo } : null)
      setEditingPersonal(false)
      toast.success('Kişisel bilgiler güncellendi')
    } catch (error) {
      console.error('Error updating personal info:', error)
      toast.error('Kişisel bilgiler güncellenirken hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleBusinessInfoSave = async () => {
    if (!trainer) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('trainers')
        .update({
          business_name: businessInfo.business_name,
          address: businessInfo.address,
          working_hours: businessInfo.working_hours
        })
        .eq('id', trainer.id)

      if (error) {
        throw error
      }

      setTrainer(prev => prev ? { ...prev, ...businessInfo } : null)
      setEditingBusiness(false)
      toast.success('İşletme bilgileri güncellendi')
    } catch (error) {
      console.error('Error updating business info:', error)
      toast.error('İşletme bilgileri güncellenirken hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) {
        throw error
      }

      setShowPasswordModal(false)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      toast.success('Şifre başarıyla değiştirildi')
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error('Şifre değiştirilirken hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.error('Logo dosyası 2MB\'dan küçük olmalıdır')
        return
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Sadece resim dosyaları yüklenebilir')
        return
      }

      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadLogoToStorage = async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/qr-logo-${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('trainer-assets')
      .upload(fileName, file)

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from('trainer-assets')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const handleQRSave = async () => {
    if (!trainer) return

    setSaving(true)
    try {
      let logoUrl = qrSettings.logo_url

      // Upload new logo if selected
      if (logoFile) {
        logoUrl = await uploadLogoToStorage(logoFile)
      }

      const updatedQRSettings = {
        logo_url: logoUrl,
        color: qrSettings.color,
        frame_style: qrSettings.frame_style
      }

      const { error } = await supabase
        .from('trainers')
        .update({
          qr_settings: updatedQRSettings
        })
        .eq('id', trainer.id)

      if (error) {
        throw error
      }

      setQrSettings(updatedQRSettings)
      setLogoFile(null)
      toast.success('QR kod ayarları kaydedildi')
    } catch (error) {
      console.error('Error saving QR settings:', error)
      toast.error('QR kod ayarları kaydedilirken hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationPrefsSave = async () => {
    if (!trainer) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('trainers')
        .update({
          notification_preferences: notificationPrefs
        })
        .eq('id', trainer.id)

      if (error) {
        throw error
      }

      toast.success('Bildirim ayarları kaydedildi')
    } catch (error) {
      console.error('Error saving notification preferences:', error)
      toast.error('Bildirim ayarları kaydedilirken hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const exportClientList = async () => {
    if (!trainer) return

    setExporting(true)
    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          email,
          phone,
          remaining_sessions,
          created_at,
          packages(name)
        `)
        .eq('trainer_id', trainer.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Create CSV content
      const headers = ['ID', 'Ad Soyad', 'E-posta', 'Telefon', 'Kalan Seans', 'Kayıt Tarihi', 'Aktif Paket']
      const csvContent = [
        headers.join(','),
        ...clients?.map(client => [
          client.id,
          `"${client.name}"`,
          `"${client.email || ''}"`,
          `"${client.phone || ''}"`,
          client.remaining_sessions,
          new Date(client.created_at).toLocaleDateString('tr-TR'),
          `"${(client.packages as any)?.name || ''}"`
        ].join(',')) || []
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `musteri-listesi-${new Date().toISOString().split('T')[0]}.csv`
      link.click()

      toast.success('Üye listesi dışa aktarıldı')
    } catch (error) {
      console.error('Error exporting client list:', error)
      toast.error('Üye listesi dışa aktarılırken hata oluştu')
    } finally {
      setExporting(false)
    }
  }

  const exportRevenueReport = async () => {
    if (!trainer) return

    setExporting(true)
    try {
      const startDate = exportDateRange.startDate ? new Date(exportDateRange.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const endDate = exportDateRange.endDate ? new Date(exportDateRange.endDate) : new Date()

      const { data: purchases, error } = await supabase
        .from('purchases')
        .select(`
          id,
          price,
          created_at,
          packages(name),
          clients(name)
        `)
        .eq('packages.trainer_id', trainer.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      // Create simple HTML report (can be enhanced with proper PDF generation)
      const totalRevenue = purchases?.reduce((sum, purchase) => sum + (purchase.price || 0), 0) || 0
      const reportContent = `
        <html>
          <head>
            <title>Gelir Raporu</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .header { text-align: center; margin-bottom: 30px; }
              .summary { margin: 20px 0; padding: 15px; background-color: #f9f9f9; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Gelir Raporu</h1>
              <p>${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}</p>
            </div>
            <div class="summary">
              <h3>Özet</h3>
              <p>Toplam Gelir: ₺${totalRevenue.toLocaleString()}</p>
              <p>Toplam Satış: ${purchases?.length || 0}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Üye</th>
                  <th>Paket</th>
                  <th>Tutar</th>
                </tr>
              </thead>
              <tbody>
                ${purchases?.map(purchase => `
                  <tr>
                    <td>${new Date(purchase.created_at).toLocaleDateString('tr-TR')}</td>
                    <td>${(purchase.clients as any)?.name || 'Bilinmiyor'}</td>
                    <td>${(purchase.packages as any)?.name || 'Bilinmiyor'}</td>
                    <td>₺${purchase.price?.toLocaleString() || 0}</td>
                  </tr>
                `).join('') || ''}
              </tbody>
            </table>
          </body>
        </html>
      `

      // Download HTML report (can be converted to PDF by user)
      const blob = new Blob([reportContent], { type: 'text/html;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `gelir-raporu-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.html`
      link.click()

      toast.success('Gelir raporu dışa aktarıldı')
    } catch (error) {
      console.error('Error exporting revenue report:', error)
      toast.error('Gelir raporu dışa aktarılırken hata oluştu')
    } finally {
      setExporting(false)
    }
  }

  const exportSessionHistory = async () => {
    if (!trainer) return

    setExporting(true)
    try {
      const startDate = exportDateRange.startDate ? new Date(exportDateRange.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const endDate = exportDateRange.endDate ? new Date(exportDateRange.endDate) : new Date()

      const { data: sessions, error } = await supabase
        .from('sessions')
        .select(`
          id,
          created_at,
          clients(name),
          packages(name)
        `)
        .eq('trainer_id', trainer.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      // Create Excel-like CSV content
      const headers = ['ID', 'Tarih', 'Saat', 'Üye', 'Paket']
      const csvContent = [
        headers.join(','),
        ...sessions?.map(session => [
          session.id,
          new Date(session.created_at).toLocaleDateString('tr-TR'),
          new Date(session.created_at).toLocaleTimeString('tr-TR'),
          `"${(session.clients as any)?.name || 'Bilinmiyor'}"`,
          `"${(session.packages as any)?.name || 'Bilinmiyor'}"`
        ].join(',')) || []
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `seans-gecmisi-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.csv`
      link.click()

      toast.success('Seans geçmişi dışa aktarıldı')
    } catch (error) {
      console.error('Error exporting session history:', error)
      toast.error('Seans geçmişi dışa aktarılırken hata oluştu')
    } finally {
      setExporting(false)
    }
  }

  const downloadQR = () => {
    if (qrRef.current) {
      const canvas = qrRef.current.querySelector('canvas')
      if (canvas) {
        const link = document.createElement('a')
        link.download = `${trainer?.business_name || 'qr-code'}.png`
        link.href = canvas.toDataURL()
        link.click()
      }
    }
  }

  const getQRCodeUrl = () => {
    if (!trainer) return ''
    return `${window.location.origin}/trainer-checkin/${trainer.id}`
  }

  const getFrameStyle = () => {
    switch (qrSettings.frame_style) {
      case 'rounded':
        return 'rounded-lg'
      case 'square':
        return 'border-4 border-gray-300'
      case 'diamond':
        return 'transform rotate-45 border-4 border-gray-300'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profilim</h1>
        <p className="text-gray-600 mt-2">Hesap bilgilerinizi ve istatistiklerinizi yönetin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Kişisel Bilgiler
              </CardTitle>
              <CardDescription>
                Kişisel bilgilerinizi güncelleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Soyad
                  </label>
                  {editingPersonal ? (
                    <Input
                      value={personalInfo.name}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Adınız ve soyadınız"
                    />
                  ) : (
                    <p className="text-gray-900">{trainer?.name || 'Belirtilmemiş'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <p className="text-gray-900">{trainer?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  {editingPersonal ? (
                    <Input
                      value={personalInfo.phone}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Telefon numaranız"
                    />
                  ) : (
                    <p className="text-gray-900">{trainer?.phone || 'Belirtilmemiş'}</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                {editingPersonal ? (
                  <>
                    <Button onClick={handlePersonalInfoSave} disabled={saving}>
                      {saving ? 'Kaydediliyor...' : 'Bilgileri Güncelle'}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingPersonal(false)}>
                      İptal
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setEditingPersonal(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Düzenle
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Business Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                İşletme Bilgileri
              </CardTitle>
              <CardDescription>
                İşletme bilgilerinizi güncelleyin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    İşletme Adı
                  </label>
                  {editingBusiness ? (
                    <Input
                      value={businessInfo.business_name}
                      onChange={(e) => setBusinessInfo(prev => ({ ...prev, business_name: e.target.value }))}
                      placeholder="İşletme adınız"
                    />
                  ) : (
                    <p className="text-gray-900">{trainer?.business_name || 'Belirtilmemiş'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adres
                  </label>
                  {editingBusiness ? (
                    <Input
                      value={businessInfo.address}
                      onChange={(e) => setBusinessInfo(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="İşletme adresiniz"
                    />
                  ) : (
                    <p className="text-gray-900">{trainer?.address || 'Belirtilmemiş'}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Çalışma Saatleri
                  </label>
                  {editingBusiness ? (
                    <Input
                      value={businessInfo.working_hours}
                      onChange={(e) => setBusinessInfo(prev => ({ ...prev, working_hours: e.target.value }))}
                      placeholder="Örn: Pazartesi-Cuma 09:00-18:00"
                    />
                  ) : (
                    <p className="text-gray-900">{trainer?.working_hours || 'Belirtilmemiş'}</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                {editingBusiness ? (
                  <>
                    <Button onClick={handleBusinessInfoSave} disabled={saving}>
                      {saving ? 'Kaydediliyor...' : 'Bilgileri Güncelle'}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingBusiness(false)}>
                      İptal
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setEditingBusiness(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Düzenle
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Analytics Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Analitik
              </CardTitle>
              <CardDescription>
                İşletmenizin performans analizi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Monthly Revenue Chart */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Aylık Gelir</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₺${value}`, 'Gelir']} />
                      <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Popular Packages and Peak Hours */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Popular Packages */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Popüler Paketler</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={analytics.popularPackages}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {analytics.popularPackages.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} satış`, 'Paket']} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Peak Hours */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Yoğun Saatler</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.peakHours}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} seans`, 'Seans']} />
                        <Bar dataKey="sessions" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Client Retention Rate */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Üye Sadakati</h3>
                    <p className="text-gray-600">Son 30 günde aktif üye oranı</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-purple-600">{analytics.clientRetention}%</div>
                    <div className="text-sm text-gray-500">Aktif Üye</div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${analytics.clientRetention}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                QR Kod Ayarları
              </CardTitle>
              <CardDescription>
                QR kodunuzu özelleştirin ve indirin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Settings */}
                <div className="space-y-4">
                  {/* Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      İşletme Logosu
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label
                          htmlFor="logo-upload"
                          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          Logo Yükle
                        </label>
                      </div>
                      {logoPreview && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Maksimum 2MB, PNG, JPG veya SVG
                    </p>
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      QR Kod Rengi
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {qrColors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setQrSettings(prev => ({ ...prev, color: color.value }))}
                          className={`
                            p-3 rounded-lg border-2 transition-all
                            ${qrSettings.color === color.value
                              ? 'border-purple-600 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          <div
                            className="w-6 h-6 rounded mx-auto"
                            style={{ backgroundColor: color.value }}
                          />
                          <p className="text-xs mt-1 text-gray-700">{color.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frame Style */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Çerçeve Stili
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {frameStyles.map((style) => (
                        <button
                          key={style.value}
                          onClick={() => setQrSettings(prev => ({ ...prev, frame_style: style.value }))}
                          className={`
                            p-3 rounded-lg border-2 transition-all text-sm
                            ${qrSettings.frame_style === style.value
                              ? 'border-purple-600 bg-purple-50 text-purple-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }
                          `}
                        >
                          {style.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* QR Preview */}
                <div className="flex flex-col items-center justify-center">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Önizleme</h3>
                  </div>
                  <div
                    ref={qrRef}
                    className={`p-4 bg-white ${getFrameStyle()}`}
                  >
                    <QRCodeSVG
                      value={getQRCodeUrl()}
                      size={200}
                      fgColor={qrSettings.color}
                      bgColor="#ffffff"
                      level="H"
                      includeMargin={true}
                      imageSettings={
                        logoPreview
                          ? {
                              src: logoPreview,
                              x: undefined,
                              y: undefined,
                              height: 40,
                              width: 40,
                              excavate: true,
                            }
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Save and Download */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleQRSave} disabled={saving} className="flex-1">
                  {saving ? 'Kaydediliyor...' : 'Kaydet ve İndir'}
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadQR}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Sadece İndir
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Güvenlik
              </CardTitle>
              <CardDescription>
                Hesap güvenliğinizi yönetin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowPasswordModal(true)}>
                <Shield className="w-4 h-4 mr-2" />
                Şifre Değiştir
              </Button>
            </CardContent>
          </Card>

          {/* Notification Preferences Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Bildirim Ayarları
              </CardTitle>
              <CardDescription>
                Bildirim tercihlerinizi yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">E-posta Bildirimleri</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Yeni Üye Kaydı</p>
                      <p className="text-sm text-gray-600">Yeni üye kayıt olduğunda bildirim al</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.email.newClientRegistration}
                        onChange={(e) => setNotificationPrefs(prev => ({
                          ...prev,
                          email: {
                            ...prev.email,
                            newClientRegistration: e.target.checked
                          }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Düşük Paket Seansları</p>
                      <p className="text-sm text-gray-600">Üye seansları azaldığında bildirim al</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.email.lowPackageSessions}
                        onChange={(e) => setNotificationPrefs(prev => ({
                          ...prev,
                          email: {
                            ...prev.email,
                            lowPackageSessions: e.target.checked
                          }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Günlük Özet</p>
                      <p className="text-sm text-gray-600">Her gün işletme performans özeti al</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.email.dailySummary}
                        onChange={(e) => setNotificationPrefs(prev => ({
                          ...prev,
                          email: {
                            ...prev.email,
                            dailySummary: e.target.checked
                          }
                        }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Push Notifications (Future) */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Push Bildirimleri</h3>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Yakında</span>
                </div>
                <div className="space-y-3 opacity-60">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Push Bildirimleri</p>
                      <p className="text-sm text-gray-600">Tarayıcı push bildirimleri al</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.push.enabled}
                        disabled
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Yeni Üye Kaydı</p>
                      <p className="text-sm text-gray-600">Yeni üye kayıt olduğunda bildirim al</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.push.newClientRegistration}
                        disabled
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Düşük Paket Seansları</p>
                      <p className="text-sm text-gray-600">Üye seansları azaldığında bildirim al</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.push.lowPackageSessions}
                        disabled
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* SMS Notifications (Future) */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">SMS Bildirimleri</h3>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Yakında</span>
                </div>
                <div className="space-y-3 opacity-60">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">SMS Bildirimleri</p>
                      <p className="text-sm text-gray-600">Telefon numaranıza SMS al</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.sms.enabled}
                        disabled
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Yeni Üye Kaydı</p>
                      <p className="text-sm text-gray-600">Yeni üye kayıt olduğunda SMS al</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.sms.newClientRegistration}
                        disabled
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Düşük Paket Seansları</p>
                      <p className="text-sm text-gray-600">Üye seansları azaldığında SMS al</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs.sms.lowPackageSessions}
                        disabled
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t">
                <Button onClick={handleNotificationPrefsSave} disabled={saving} className="w-full">
                  {saving ? 'Kaydediliyor...' : 'Bildirim Ayarlarını Kaydet'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Export Data Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="w-5 h-5" />
                Verileri Dışa Aktar
              </CardTitle>
              <CardDescription>
                İşletme verilerinizi farklı formatlarda dışa aktarın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Range Selector */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tarih Aralığı</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Başlangıç Tarihi
                    </label>
                    <Input
                      type="date"
                      value={exportDateRange.startDate}
                      onChange={(e) => setExportDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bitiş Tarihi
                    </label>
                    <Input
                      type="date"
                      value={exportDateRange.endDate}
                      onChange={(e) => setExportDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Tarih seçilmezse son 30 günlük veriler dışa aktarılır
                </p>
              </div>

              {/* Export Options */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Dışa Aktarma Seçenekleri</h3>
                <div className="space-y-4">
                  {/* Client List Export */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">Üye Listesi</h4>
                        <p className="text-sm text-gray-600">Tüm üye bilgilerini CSV formatında dışa aktar</p>
                      </div>
                    </div>
                    <Button
                      onClick={exportClientList}
                      disabled={exporting}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {exporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          İşleniyor...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          CSV İndir
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Revenue Report Export */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileDown className="w-8 h-8 text-green-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">Gelir Raporu</h4>
                        <p className="text-sm text-gray-600">Seçilen tarih aralığındaki gelir raporunu HTML formatında dışa aktar</p>
                      </div>
                    </div>
                    <Button
                      onClick={exportRevenueReport}
                      disabled={exporting}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {exporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          İşleniyor...
                        </>
                      ) : (
                        <>
                          <FileDown className="w-4 h-4" />
                          HTML İndir
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Session History Export */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-purple-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">Seans Geçmişi</h4>
                        <p className="text-sm text-gray-600">Seçilen tarih aralığındaki seans geçmişini CSV formatında dışa aktar</p>
                      </div>
                    </div>
                    <Button
                      onClick={exportSessionHistory}
                      disabled={exporting}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {exporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                          İşleniyor...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-4 h-4" />
                          CSV İndir
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Export Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">💡 Dışa Aktarma İpuçları</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• CSV dosyaları Excel'de açılabilir</li>
                  <li>• HTML raporları tarayıcıda PDF olarak yazdırılabilir</li>
                  <li>• Büyük veri setleri için tarih aralığını sınırlayın</li>
                  <li>• Dosyalar otomatik olarak indirilir</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Statistics & Subscription */}
        <div className="space-y-6">
          {/* Statistics Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                İstatistikler
              </CardTitle>
              <CardDescription>
                Bu ayki performansınız
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{statistics.totalClients}</div>
                  <div className="text-sm text-gray-600">Toplam Üye</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{statistics.activePackages}</div>
                  <div className="text-sm text-gray-600">Aktif Paket</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">₺{statistics.monthlyRevenue.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Bu Ay Gelir</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{statistics.monthlySessions}</div>
                  <div className="text-sm text-gray-600">Bu Ay Seans</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Abonelik Durumu
              </CardTitle>
              <CardDescription>
                Mevcut planınız ve kullanım limitleri
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Mevcut Plan:</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  Free
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Üye Limiti:</span>
                  <span className="font-medium">50 üye</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Paket Limiti:</span>
                  <span className="font-medium">10 paket</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Aylık Seans:</span>
                  <span className="font-medium">Sınırsız</span>
                </div>
              </div>
              <Button className="w-full" variant="outline">
                Pro Plan'a Yükselt
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Şifre Değiştir</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPasswordModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mevcut Şifre
                </label>
                <div className="relative">
                  <Input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Mevcut şifrenizi girin"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yeni Şifre
                </label>
                <div className="relative">
                  <Input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Yeni şifrenizi girin"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yeni Şifre (Tekrar)
                </label>
                <div className="relative">
                  <Input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Yeni şifrenizi tekrar girin"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button onClick={handlePasswordChange} disabled={saving} className="flex-1">
                {saving ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPasswordModal(false)}
                className="flex-1"
              >
                İptal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 