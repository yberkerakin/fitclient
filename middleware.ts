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
  
  // Allow public access to check-in routes (individual client check-ins)
  if (pathname.startsWith('/checkin')) {
    console.log('✅ PUBLIC ROUTE MATCH: /checkin - Allowing access without authentication')
    console.log('🔓 Public check-in route accessed:', pathname)
    console.log('🛡️ ===== MIDDLEWARE EXECUTION COMPLETED (PUBLIC ROUTE) =====')
    return response
  }

  // Allow public access to trainer check-in routes (trainer-specific check-in pages)
  if (pathname.startsWith('/trainer-checkin')) {
    console.log('✅ PUBLIC ROUTE MATCH: /trainer-checkin - Allowing access without authentication')
    console.log('🔓 Public trainer check-in route accessed:', pathname)
    console.log('🛡️ ===== MIDDLEWARE EXECUTION COMPLETED (PUBLIC ROUTE) =====')
    return response
  }

  // Allow public access to auth routes
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    console.log('✅ PUBLIC ROUTE MATCH: /login or /register - Allowing access without authentication')
    console.log('🔓 Public auth route accessed:', pathname)
    console.log('🛡️ ===== MIDDLEWARE EXECUTION COMPLETED (PUBLIC ROUTE) =====')
    return response
  }

  // Allow public access to test routes (for debugging)
  if (pathname.startsWith('/test')) {
    console.log('✅ PUBLIC ROUTE MATCH: /test - Allowing access without authentication')
    console.log('🔓 Test route accessed:', pathname)
    console.log('🛡️ ===== MIDDLEWARE EXECUTION COMPLETED (PUBLIC ROUTE) =====')
    return response
  }

  // Allow public access to static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/sw.js')
  ) {
    console.log('✅ PUBLIC ROUTE MATCH: Static/API route - Allowing access without authentication')
    console.log('🔓 Static/API route accessed:', pathname)
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