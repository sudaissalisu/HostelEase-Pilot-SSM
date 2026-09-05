import { NextRequest, NextResponse } from 'next/server'

// Protect all routes except /login and /api/auth/*
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // Allow login page + auth API routes
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }
  // Check for session cookie
  const token = req.cookies.get('ssm_session')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
}
