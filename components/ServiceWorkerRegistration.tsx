'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          console.log('🛠️ Registering Service Worker...')
          
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          })
          
          console.log('✅ Service Worker registered successfully:', registration)
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            console.log('🔄 Service Worker update found')
            const newWorker = registration.installing
            
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🆕 New Service Worker installed, reload to update')
                  // Optionally show update notification to user
                  if (confirm('Yeni güncelleme mevcut. Şimdi yenilemek ister misiniz?')) {
                    window.location.reload()
                  }
                }
              })
            }
          })
          
          // Handle service worker errors
          registration.addEventListener('error', (error) => {
            console.error('❌ Service Worker registration error:', error)
          })
          
        } catch (error) {
          console.error('❌ Service Worker registration failed:', error)
        }
      }
      
      registerSW()
    }
  }, [])

  return null
} 