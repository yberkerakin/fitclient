'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { createBrowserSupabaseClient } from '@/lib/supabase-client'
import { isValidEmail } from '@/lib/types'

interface FormData {
  email: string
  password: string
  rememberMe: boolean
}

interface FormErrors {
  email?: string
  password?: string
}

export default function LoginPage() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    rememberMe: false
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setLoading(true)
    const loadingToast = toast.loading('Signing you in...')

    try {
      const supabase = createBrowserSupabaseClient()

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        throw error
      }

      if (data.user) {
        toast.dismiss(loadingToast)
        toast.success('Welcome back!', {
          description: 'Successfully signed in. Redirecting to dashboard...'
        })

        // Redirect to dashboard immediately
        router.push('/dashboard')
      }
    } catch (error: any) {
      toast.dismiss(loadingToast)
      
      // Handle specific error cases
      let errorMessage = 'Sign in failed. Please try again.'
      
      if (error.message.includes('Invalid login credentials') || error.message.includes('Invalid email or password')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and confirm your account before signing in.'
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'Too many sign-in attempts. Please wait a few minutes and try again.'
      } else if (error.message.includes('User not found')) {
        errorMessage = 'No account found with this email address. Please check your email or create a new account.'
      } else if (error.message.includes('Password')) {
        errorMessage = 'Incorrect password. Please try again.'
      }

      toast.error('Sign in failed', {
        description: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back
        </h2>
        <p className="text-gray-600 text-sm">
          Sign in to your FitClient account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className={errors.password ? 'border-red-500' : ''}
            disabled={loading}
          />
          {errors.password && (
            <p className="text-red-500 text-xs animate-in slide-in-from-top-1">
              {errors.password}
            </p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              checked={formData.rememberMe}
              onCheckedChange={(checked: boolean | 'indeterminate') => handleInputChange('rememberMe', checked === true)}
              disabled={loading}
            />
            <Label 
              htmlFor="rememberMe" 
              className="text-sm text-gray-600 cursor-pointer"
            >
              Remember me
            </Label>
          </div>
          <Link
            href="/forgot-password"
            className="text-sm text-purple-600 hover:text-purple-500 transition-colors duration-200"
          >
            Forgot password?
          </Link>
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
              <span>Signing in...</span>
            </div>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      {/* Register Link */}
      <div className="text-center mt-6">
        <p className="text-gray-600 text-sm">
          Don't have an account?{' '}
          <Link 
            href="/register" 
            className="font-medium text-purple-600 hover:text-purple-500 transition-colors duration-200 underline"
          >
            Register here
          </Link>
        </p>
      </div>


    </div>
  )
} 