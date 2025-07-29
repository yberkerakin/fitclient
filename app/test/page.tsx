export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
          <span className="text-4xl font-bold text-white">T</span>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white">
            Public Test Page
          </h1>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <p className="text-lg text-white">
              This is a public test page
            </p>
          </div>
          
          <div className="bg-green-500/20 border border-green-400/30 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-sm text-green-200">
              ✅ No authentication required
            </p>
            <p className="text-xs text-green-300 mt-1">
              If you can see this, public pages work!
            </p>
          </div>
          
          <div className="bg-blue-500/20 border border-blue-400/30 rounded-2xl p-4 backdrop-blur-sm">
            <p className="text-xs text-blue-200">
              URL: /test
            </p>
            <p className="text-xs text-blue-300 mt-1">
              Timestamp: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 