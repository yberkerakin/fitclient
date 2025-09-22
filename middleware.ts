import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = ['/', '/login', '/register', '/member/login', '/trainer-checkin', '/go'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Create supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to appropriate login based on route
    if (pathname.startsWith('/member')) {
      return NextResponse.redirect(new URL('/member/login', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check if user is accessing correct section
  if (pathname.startsWith('/member')) {
    // Verify this is a member account
    const { data: memberAccount } = await supabase
      .from('member_accounts')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!memberAccount) {
      return NextResponse.redirect(new URL('/member/login', request.url));
    }
  } else if (pathname.startsWith('/dashboard')) {
    // Verify this is a trainer account
    const { data: trainer } = await supabase
      .from('trainers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!trainer) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};