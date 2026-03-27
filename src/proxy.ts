import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { TENANT_AUTH_STORAGE_KEY } from '@/lib/auth-storage-keys'
import { SUPER_ADMIN_AUTH_STORAGE_KEY } from '@/lib/supabase-super-admin'

/** Keep rotated session cookies when returning a redirect (otherwise refresh tokens are dropped and the next request looks logged out). */
function redirectWithSupabaseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value, c)
  })
  return to
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  /** Merge cookie writes from both default and Super Admin Supabase clients into one response. */
  function sharedSetAll(
    cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
  ) {
    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
    const newResponse = NextResponse.next({ request })
    supabaseResponse.cookies.getAll().forEach((c) => {
      newResponse.cookies.set(c.name, c.value, c)
    })
    cookiesToSet.forEach(({ name, value, options }) =>
      newResponse.cookies.set(name, value, options)
    )
    supabaseResponse = newResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll: sharedSetAll,
      },
      cookieOptions: {
        name: TENANT_AUTH_STORAGE_KEY,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  )

  const supabaseSuperAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll: sharedSetAll,
      },
      cookieOptions: {
        name: SUPER_ADMIN_AUTH_STORAGE_KEY,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  if (
    path.startsWith('/super-admin') ||
    path.startsWith('/api/super-admin')
  ) {
    await supabaseSuperAdmin.auth.getUser()
  }

  // IMPORTANT: DO NOT REMOVE THE FOLLOWING LINE!
  // This is required for the middleware to work properly
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
  const url = request.nextUrl.clone()

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/auth', '/features', '/pricing', '/help-center', '/contact-support']
  
  // Check if current path is public or starts with a public route
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith(route + '/')
  )

  // Allow access to any route that doesn't start with /admin (except auth redirects for logged users)
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  // If user is not signed in and trying to access admin routes, redirect to /auth/login
  if (!user && isAdminRoute && !request.nextUrl.pathname.startsWith('/_next') && !request.nextUrl.pathname.startsWith('/api')) {
    url.pathname = '/auth/login'
    return redirectWithSupabaseCookies(supabaseResponse, NextResponse.redirect(url))
  }

  // If user is signed in and the current path is /auth/*, redirect to /admin
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    url.pathname = '/admin'
    return redirectWithSupabaseCookies(supabaseResponse, NextResponse.redirect(url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
