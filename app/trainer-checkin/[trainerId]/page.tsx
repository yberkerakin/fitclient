'use client'

import { useParams } from 'next/navigation'

export default function TrainerCheckInPage() {
  const params = useParams()
  const trainerId = params.trainerId as string

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800 flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
          <span className="text-4xl font-bold text-white">F</span>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white">
            Trainer Check-in Page
          </h1>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-2">
              Trainer ID:
            </h2>
            <p className="text-lg text-purple-200 font-mono break-all">
              {trainerId}
            </p>
          </div>
          
          <div className="bg-green-500/20 border border-green-400/30 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-sm text-green-200">
              ✅ This is a public page at root level
            </p>
            <p className="text-xs text-green-300 mt-1">
              No authentication required
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 