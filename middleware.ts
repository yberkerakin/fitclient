import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  console.log('🛡️ ===== MIDDLEWARE EXECUTION STARTED =====')
  console.log('📅 Timestamp:', new Date().toISOString())
  console.log('🌐 Request URL:', request.url)
  console.log('🔗 Request method:', request.method)
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get the pathname from the request
  const { pathname } = request.nextUrl
  console.log('🔗 Pathname extracted:', pathname)

  // Public routes that don't require authentication
  // Check these BEFORE authentication check to ensure they're always accessible
  
  console.log('🔍 ===== CHECKING PUBLIC ROUTES =====')
  
  // Complete list of public routes
  const publicRoutes = [
    '/',                    // Root path
    '/login',              // Login page
    '/register',           // Register page
    '/trainer-checkin',    // Trainer check-in routes (and all sub-paths)
    '/go',                 // Short QR code redirects (and all sub-paths)
    '/checkin',            // Individual client check-ins (and all sub-paths)
    '/test',               // Test/debug routes
    '/_next',              // Next.js static files
    '/api',                // API routes
    '/favicon.ico',        // Favicon
    '/manifest.json',      // PWA manifest
    '/sw.js'               // Service worker
  ]
  
  // Check if current pathname matches any public route
  const isPublicRoute = publicRoutes.some(route => {
    if (route === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(route)
  })
  
  if (isPublicRoute) {
    console.log('✅ PUBLIC ROUTE MATCH - Allowing access without authentication')
    console.log('🔓 Public route accessed:', pathname)
    console.log('🛡️ ===== MIDDLEWARE EXECUTION COMPLETED (PUBLIC ROUTE) =====')
    return response
  }

  // All public routes have been checked above
  // Now check authentication for protected routes
  
  console.log('🔐 ===== CHECKING AUTHENTICATION FOR PROTECTED ROUTE =====')
  console.log('🔗 Protected route pathname:', pathname)
  
  // Check if user is authenticated
  console.log('🔍 Checking user authentication...')
  const { data: { user } } = await supabase.auth.getUser()

  // If user is not authenticated and trying to access protected routes
  if (!user) {
    console.log('❌ UNAUTHENTICATED ACCESS ATTEMPT - Redirecting to login')
    console.log('🔒 Unauthenticated access attempt to protected route:', pathname)
    const redirectUrl = new URL('/login', request.url)
    console.log('🔄 Redirecting to:', redirectUrl.toString())
    console.log('🛡️ ===== MIDDLEWARE EXECUTION COMPLETED (REDIRECT TO LOGIN) =====')
    return NextResponse.redirect(redirectUrl)
  }

  // User is authenticated, allow access to protected routes
  console.log('✅ AUTHENTICATED ACCESS GRANTED')
  console.log('✅ Authenticated access to protected route:', pathname)
  console.log('👤 Authenticated user ID:', user.id)
  console.log('🛡️ ===== MIDDLEWARE EXECUTION COMPLETED (AUTHENTICATED ACCESS) =====')
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 