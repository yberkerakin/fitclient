'use client'

import { useState, useEffect } from 'react'
import { Plus, Package, Edit, Trash2, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

interface Package {
  id: string
  trainer_id: string
  name: string
  session_count: number
  price: number
  created_at: string
  updated_at?: string
}

interface CreatePackageData {
  trainer_id: string
  name: string
  session_count: number
  price: number
}

interface PackageForm {
  name: string
  session_count: string
  price: string
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [formData, setFormData] = useState<PackageForm>({
    name: '',
    session_count: '',
    price: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    console.log('🚀 PackagesPage mounted, starting data fetch...')
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    try {
      setLoading(true)
      console.log('🔄 Starting to fetch packages...')
      
      const supabase = createBrowserSupabaseClient()
      console.log('🔧 Supabase client created')

      // Get current user
      console.log('🔍 Fetching current user...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('❌ Error getting user:', userError)
        toast.error('Kullanıcı bilgisi alınırken hata oluştu')
        return
      }
      
      if (!user) {
        console.error('❌ No user found')
        toast.error('Kullanıcı bilgisi bulunamadı')
        return
      }

      console.log('👤 Current user found:', { id: user.id, email: user.email })

      // Get trainer record
      console.log('🔍 Fetching trainer record for user_id:', user.id)
      const { data: trainer, error: trainerError } = await supabase
        .from('trainers')
        .select('id, name, email')
        .eq('user_id', user.id)
        .single()

      if (trainerError) {
        console.error('❌ Error getting trainer:', trainerError)
        toast.error('Eğitmen profili alınırken hata oluştu')
        return
      }

      if (!trainer) {
        console.error('❌ No trainer found for user:', user.id)
        toast.error('Eğitmen profili bulunamadı')
        return
      }

      console.log('🏋️ Trainer data found:', trainer)

      // Fetch packages for this trainer
      console.log('🔍 Fetching packages for trainer_id:', trainer.id)
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .eq('trainer_id', trainer.id)
        .order('created_at', { ascending: false })

      if (packagesError) {
        console.error('❌ Error fetching packages:', packagesError)
        toast.error('Paketler yüklenirken hata oluştu')
        return
      }

      console.log('📦 Raw packages data:', packagesData)
      setPackages(packagesData || [])
      
    } catch (error) {
      console.error('❌ Unexpected error fetching packages:', error)
      toast.error('Paketler yüklenirken beklenmeyen hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      session_count: '',
      price: ''
    })
    setEditingPackage(null)
  }

  const openCreateModal = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditModal = (pkg: Package) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      session_count: pkg.session_count.toString(),
      price: pkg.price.toString()
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Paket adı zorunludur')
      return
    }

    const sessionCount = parseInt(formData.session_count)
    if (isNaN(sessionCount) || sessionCount < 1) {
      toast.error('Ders sayısı en az 1 olmalıdır')
      return
    }

    const price = parseFloat(formData.price)
    if (isNaN(price) || price <= 0) {
      toast.error('Geçerli bir fiyat giriniz')
      return
    }

    try {
      setSubmitting(true)
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

      const packageData: CreatePackageData = {
        trainer_id: trainer.id,
        name: formData.name.trim(),
        session_count: sessionCount,
        price: price
      }

      if (editingPackage) {
        // Update existing package
        const { data: updatedPackage, error } = await supabase
          .from('packages')
          .update(packageData)
          .eq('id', editingPackage.id)
          .select()
          .single()

        if (error) throw error

        setPackages(prev => prev.map(pkg => 
          pkg.id === editingPackage.id ? updatedPackage : pkg
        ))
        toast.success('Paket başarıyla güncellendi')
      } else {
        // Create new package
        const { data: newPackage, error } = await supabase
          .from('packages')
          .insert([packageData])
          .select()
          .single()

        if (error) throw error

        setPackages(prev => [newPackage, ...prev])
        toast.success('Paket başarıyla oluşturuldu')
      }

      setDialogOpen(false)
      resetForm()
      
    } catch (error: any) {
      console.error('Error saving package:', error)
      toast.error(editingPackage ? 'Paket güncellenirken hata oluştu' : 'Paket oluşturulurken hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (pkg: Package) => {
    try {
      const supabase = createBrowserSupabaseClient()
      
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', pkg.id)

      if (error) throw error

      setPackages(prev => prev.filter(p => p.id !== pkg.id))
      toast.success('Paket başarıyla silindi')
      
    } catch (error: any) {
      console.error('Error deleting package:', error)
      toast.error('Paket silinirken hata oluştu')
    }
  }

  const formatPrice = (price: number) => {
    return `₺${price.toLocaleString('tr-TR')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Paketler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paketler</h1>
          <p className="text-gray-600 mt-1">{packages.length} paket</p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni Paket Oluştur
        </Button>
      </div>

      {/* Empty State */}
      {packages.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Henüz paket yok
          </h3>
          <p className="text-gray-600 mb-6">
            İlk paketinizi oluşturun
          </p>
          <Button
            onClick={openCreateModal}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            İlk Paketi Oluştur
          </Button>
        </div>
      )}

      {/* Packages Grid */}
      {packages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                      {pkg.name}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      {pkg.session_count} ders
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(pkg)}
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Paketi Sil</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bu paketi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(pkg)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Sil
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {formatPrice(pkg.price)}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Ders başına {formatPrice(pkg.price / pkg.session_count)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Package Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md mx-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingPackage ? 'Paketi Düzenle' : 'Yeni Paket Oluştur'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editingPackage ? 'Paket bilgilerini güncelleyin' : 'Yeni paket bilgilerini girin'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Paket Adı *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Örn: 10 Ders Paketi"
                disabled={submitting}
                className="h-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="session_count" className="text-sm font-medium text-gray-700">
                Ders Sayısı *
              </Label>
              <Input
                id="session_count"
                type="number"
                min="1"
                value={formData.session_count}
                onChange={(e) => setFormData(prev => ({ ...prev, session_count: e.target.value }))}
                placeholder="10"
                disabled={submitting}
                className="h-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-medium text-gray-700">
                Fiyat (₺) *
              </Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="1000"
                disabled={submitting}
                className="h-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
          
          <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              İptal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !formData.name.trim() || !formData.session_count || !formData.price}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {submitting ? 'Kaydediliyor...' : (editingPackage ? 'Güncelle' : 'Oluştur')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 