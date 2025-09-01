'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { isValidEmail } from '@/lib/types'

interface FormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    let score = 0
    if (password.length >= 8) score++
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    
    if (score <= 1) return { strength: 'zayıf', color: 'bg-red-500', width: 'w-1/5' }
    if (score <= 2) return { strength: 'orta', color: 'bg-orange-500', width: 'w-2/5' }
    if (score <= 3) return { strength: 'iyi', color: 'bg-yellow-500', width: 'w-3/5' }
    if (score <= 4) return { strength: 'güçlü', color: 'bg-blue-500', width: 'w-4/5' }
    return { strength: 'çok güçlü', color: 'bg-green-500', width: 'w-full' }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Ad Soyad gerekli'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Ad Soyad en az 2 karakter olmalı'
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'E-posta gerekli'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Lütfen geçerli bir e-posta adresi girin'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Şifre gerekli'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Şifre en az 8 karakter olmalı'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Lütfen şifrenizi tekrar girin'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Lütfen formdaki hataları düzeltin')
      return
    }

    setLoading(true)
    const loadingToast = toast.loading('Hesabınız oluşturuluyor...')

    try {
      const supabase = createBrowserSupabaseClient()

      // Step 1: Create user with Supabase Auth
      console.log('Step 1: Creating user with Supabase Auth...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
        },
      })

      if (authError) {
        console.error('Auth Error:', authError)
        throw new Error(`Authentication failed: ${authError.message}`)
      }

      if (!authData.user) {
        console.error('No user returned from auth signup')
        throw new Error('User creation failed: No user data returned')
      }

      console.log('User created successfully:', authData.user.id)

      // Step 2: Insert trainer record
      console.log('Step 2: Inserting trainer record...')
      const { error: trainerError } = await supabase
        .from('trainers')
        .insert([
          {
            user_id: authData.user.id, // Use user_id from auth.users
            email: formData.email,
            name: formData.name,
          }
        ])

      if (trainerError) {
        console.error('Trainer Insert Error:', trainerError)
        
        // If trainer insert fails, we should clean up the auth user
        console.log('Cleaning up auth user due to trainer insert failure...')
        try {
          const { error: deleteError } = await supabase.auth.admin.deleteUser(authData.user.id)
          if (deleteError) {
            console.error('Failed to clean up auth user:', deleteError)
          }
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError)
        }
        
        throw new Error(`Trainer profile creation failed: ${trainerError.message}`)
      }

      console.log('Trainer record created successfully')

      // Step 3: Automatically sign in the user
      // TODO: Remove auto-login in production - this bypasses email verification for development
      console.log('Step 3: Automatically signing in user...')
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (signInError) {
        console.error('Auto sign-in error:', signInError)
        // Don't throw error here, just log it and continue
        // User can still sign in manually later
        toast.dismiss(loadingToast)
        toast.success('Hesap başarıyla oluşturuldu!', {
          description: 'Lütfen yeni bilgilerinizle giriş yapın.'
        })
        router.push('/login')
        return
      }

      if (signInData.user) {
        console.log('User automatically signed in:', signInData.user.email)
        
        // All operations succeeded
        toast.dismiss(loadingToast)
        toast.success('Kayıt başarılı!', {
          description: 'FitClient\'e hoş geldiniz! Dashboard\'a yönlendiriliyorsunuz...'
        })

        // TODO: Remove auto-login in production - redirect to dashboard immediately
        router.push('/dashboard')
      }

    } catch (error: any) {
      toast.dismiss(loadingToast)
      
      console.error('Registration Error Details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error
      })

      // Show specific error messages based on error type
      let errorMessage = 'Kayıt başarısız'
      let errorDescription = 'Bir şeyler yanlış gitti. Lütfen tekrar deneyin.'

      if (error.message.includes('Authentication failed')) {
        errorMessage = 'Hesap oluşturma başarısız'
        errorDescription = error.message.replace('Authentication failed: ', '')
      } else if (error.message.includes('Trainer profile creation failed')) {
        errorMessage = 'Profil kurulumu başarısız'
        errorDescription = error.message.replace('Trainer profile creation failed: ', '')
      } else if (error.message.includes('User creation failed')) {
        errorMessage = 'Kullanıcı oluşturma başarısız'
        errorDescription = 'Kullanıcı hesabı oluşturulamadı. Lütfen tekrar deneyin.'
      } else if (error.message.includes('Email already registered')) {
        errorMessage = 'E-posta zaten mevcut'
        errorDescription = 'Bu e-posta ile zaten bir hesap var. Lütfen giriş yapın.'
      } else if (error.message.includes('Password')) {
        errorMessage = 'Şifre sorunu'
        errorDescription = 'Lütfen şifrenizin gereksinimleri karşıladığından emin olun.'
      }

      toast.error(errorMessage, {
        description: errorDescription
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Hesap Oluştur
        </h2>
        <p className="text-gray-600 text-sm">
          Fitness işletmenizi bugün yönetmeye başlayın
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name">Ad Soyad</Label>
          <Input
            id="name"
            type="text"
            placeholder="Adınızı ve soyadınızı girin"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={errors.name ? 'border-red-500' : ''}
            disabled={loading}
          />
          {errors.name && (
            <p className="text-red-500 text-xs animate-in slide-in-from-top-1">
              {errors.name}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">E-posta Adresi</Label>
          <Input
            id="email"
            type="email"
            placeholder="E-posta adresinizi girin"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={errors.email ? 'border-red-500' : ''}
            disabled={loading}
          />
          {errors.email && (
            <p className="text-red-500 text-xs animate-in slide-in-from-top-1">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            type="password"
            placeholder="Güçlü bir şifre oluşturun"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={errors.password ? 'border-red-500' : ''}
            disabled={loading}
          />
          {formData.password && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Şifre gücü:</span>
                <span className={`font-medium ${
                  passwordStrength.strength === 'zayıf' ? 'text-red-500' :
                  passwordStrength.strength === 'orta' ? 'text-orange-500' :
                  passwordStrength.strength === 'iyi' ? 'text-yellow-500' :
                  passwordStrength.strength === 'güçlü' ? 'text-blue-500' :
                  'text-green-500'
                }`}>
                  {passwordStrength.strength}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.width}`}
                ></div>
              </div>
            </div>
          )}
          {errors.password && (
            <p className="text-red-500 text-xs animate-in slide-in-from-top-1">
              {errors.password}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Şifrenizi tekrar girin"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            className={errors.confirmPassword ? 'border-red-500' : ''}
            disabled={loading}
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs animate-in slide-in-from-top-1">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Hesap oluşturuluyor...</span>
            </div>
          ) : (
            'Hesap Oluştur'
          )}
        </Button>
      </form>

      {/* Login Link */}
      <div className="text-center mt-6">
        <p className="text-gray-600 text-sm">
          Zaten hesabınız var mı?{' '}
          <Link 
            href="/login" 
            className="font-medium text-purple-600 hover:text-purple-500 transition-colors duration-200"
          >
            Giriş yapın
          </Link>
        </p>
      </div>
    </div>
  )
} 