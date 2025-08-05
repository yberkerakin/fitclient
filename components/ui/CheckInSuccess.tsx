'use client'

import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'

interface CheckInSuccessProps {
  clientName: string
  remainingSessions: number
  onDismiss: () => void
  autoDismissDelay?: number
}

export default function CheckInSuccess({
  clientName,
  remainingSessions,
  onDismiss,
  autoDismissDelay = 3000
}: CheckInSuccessProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [checkmarkVisible, setCheckmarkVisible] = useState(false)
  const [textVisible, setTextVisible] = useState(false)
  const [infoVisible, setInfoVisible] = useState(false)

  useEffect(() => {
    // Start animation sequence
    setIsVisible(true)
    
    // Animate checkmark after overlay appears
    setTimeout(() => setCheckmarkVisible(true), 200)
    
    // Animate text after checkmark
    setTimeout(() => setTextVisible(true), 600)
    
    // Animate info after text
    setTimeout(() => setInfoVisible(true), 800)
    
    // Auto dismiss
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onDismiss, 300) // Wait for fade out animation
    }, autoDismissDelay)

    return () => clearTimeout(timer)
  }, [onDismiss, autoDismissDelay])

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
      isVisible 
        ? 'bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 opacity-100' 
        : 'bg-transparent opacity-0'
    }`}>
      <div className="text-center space-y-8 max-w-md mx-auto p-6">
        {/* Animated Checkmark */}
        <div className={`transition-all duration-700 ease-out ${
          checkmarkVisible 
            ? 'scale-100 opacity-100' 
            : 'scale-0 opacity-0'
        }`}>
          <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm border-2 border-white/30 shadow-2xl">
            <CheckCircle className="w-20 h-20 text-white drop-shadow-lg" />
          </div>
        </div>

        {/* Success Text */}
        <div className={`transition-all duration-700 ease-out delay-200 ${
          textVisible 
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-8 opacity-0'
        }`}>
          <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
            Giriş Başarılı!
          </h1>
        </div>

        {/* Client Info */}
        <div className={`transition-all duration-700 ease-out delay-300 ${
          infoVisible 
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-8 opacity-0'
        }`}>
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-xl">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  {clientName}
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-200 text-lg font-medium">
                    Giriş yapıldı
                  </span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-white/20">
                <p className="text-white/80 text-sm mb-2">Kalan Seanslar</p>
                <div className="text-center">
                  <span className="text-5xl font-bold text-green-300 drop-shadow-lg">
                    {remainingSessions}
                  </span>
                  <p className="text-white/60 text-lg mt-1">ders</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`transition-all duration-700 ease-out delay-500 ${
          infoVisible ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="w-full bg-white/20 rounded-full h-1 overflow-hidden">
            <div 
              className="h-full bg-white/60 rounded-full transition-all duration-3000 ease-linear"
              style={{
                width: '0%',
                animation: 'progress 3s linear forwards'
              }}
            />
          </div>
          <p className="text-white/60 text-sm mt-2">
            Otomatik kapatılıyor...
          </p>
        </div>
      </div>

      {/* CSS Animation for Progress Bar */}
      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  )
} 