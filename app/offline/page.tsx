'use client'

import { useEffect, useState } from 'react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    // Set initial state
    setIsOnline(navigator.onLine)

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        {/* Offline Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-3xl text-white">📶</span>
          </div>
        </div>
        
        {/* App Name */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">FitClient</h1>
          <p className="text-gray-600">Fitness Check-in Sistemi</p>
        </div>
        
        {/* Status Indicator */}
        <div className="flex justify-center">
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            isOnline 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {isOnline ? '🟢 Çevrimiçi' : '🔴 Çevrimdışı'}
          </div>
        </div>
        
        {/* Message */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            İnternet Bağlantısı Yok
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Şu anda çevrimdışısınız. İnternet bağlantınızı kontrol edin ve tekrar deneyin.
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <button
            onClick={handleRetry}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg shadow-md hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
          >
            Tekrar Dene
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="w-full px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-all duration-200"
          >
            Geri Dön
          </button>
        </div>
        
        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
          <h3 className="font-semibold text-blue-900 mb-2">💡 İpuçları:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Wi-Fi bağlantınızı kontrol edin</li>
            <li>• Mobil veri kullanıyorsanız sinyal gücünü kontrol edin</li>
            <li>• Uygulamayı yeniden başlatmayı deneyin</li>
            <li>• Tarayıcı önbelleğini temizleyin</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 