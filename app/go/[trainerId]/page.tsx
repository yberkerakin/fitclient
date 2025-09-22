'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import Head from 'next/head'

export default function GoPage() {
  const params = useParams()
  const trainerId = params.trainerId as string

  useEffect(() => {
    if (!trainerId) return

    const targetUrl = `/trainer-checkin/${trainerId}`
    
    // Detect user agent for platform-specific handling
    const userAgent = navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(userAgent)
    const isAndroid = /android/.test(userAgent)
    
    // Multiple redirect attempts for maximum compatibility
    const attemptRedirect = () => {
      try {
        // Method 1: window.location.replace (cleanest, no back button)
        if (typeof window !== 'undefined' && window.location.replace) {
          window.location.replace(targetUrl)
          return
        }
      } catch (e) {
        console.log('Redirect method 1 failed:', e)
      }
      
      try {
        // Method 2: window.location.href (standard redirect)
        if (typeof window !== 'undefined' && window.location.href) {
          window.location.href = targetUrl
          return
        }
      } catch (e) {
        console.log('Redirect method 2 failed:', e)
      }
      
      try {
        // Method 3: window.location.assign (explicit redirect)
        if (typeof window !== 'undefined' && window.location.assign) {
          window.location.assign(targetUrl)
          return
        }
      } catch (e) {
        console.log('Redirect method 3 failed:', e)
      }
      
      // Method 4: iOS-specific handling
      if (isIOS && typeof window !== 'undefined' && window.open) {
        try {
          const newWindow = window.open(targetUrl, '_self')
          if (newWindow) return
        } catch (e) {
          console.log('iOS redirect failed:', e)
        }
      }
      
      // Method 5: Android-specific handling with intent URL
      if (isAndroid && typeof window !== 'undefined') {
        try {
          // Try to use Android intent URL as fallback
          const intentUrl = `intent://${window.location.host}${targetUrl}#Intent;scheme=https;package=com.android.chrome;end`
          window.location.href = intentUrl
          return
        } catch (e) {
          console.log('Android intent redirect failed:', e)
        }
      }
      
      // Final fallback: try basic href again
      if (typeof window !== 'undefined') {
        window.location.href = targetUrl
      }
    }

    // Execute redirect immediately
    attemptRedirect()
    
    // Backup redirect after a short delay
    const backupRedirect = setTimeout(() => {
      if (typeof window !== 'undefined' && window.location.pathname !== targetUrl) {
        attemptRedirect()
      }
    }, 100)

    return () => clearTimeout(backupRedirect)
  }, [trainerId])

  return (
    <>
      <Head>
        {/* Meta refresh as backup redirect method */}
        <meta httpEquiv="refresh" content={`0; url=/trainer-checkin/${trainerId}`} />
        <title>Yönlendiriliyor...</title>
      </Head>
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-blue-600">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg font-medium mb-2">Yönlendiriliyorsunuz...</p>
          <p className="text-sm opacity-80">Eğer otomatik yönlendirme çalışmazsa, lütfen bekleyin</p>
          
          {/* Manual redirect button as final fallback */}
          <button 
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = `/trainer-checkin/${trainerId}`
              }
            }}
            className="mt-4 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all duration-200 text-sm"
          >
            Manuel Yönlendir
          </button>
        </div>
      </div>
    </>
  )
}
