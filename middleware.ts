// middleware.ts  (place at your project root or src/, not under pages/)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // grab the Supabase access token cookie
  const token = req.cookies.get('sb-access-token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }

  // fetch the user from Supabase Auth REST API
  const authRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        // must be Bearer + anon key so this endpoint is public-safe
        Authorization: `Bearer ${token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    }
  )

  if (!authRes.ok) {
    // invalid/expired token
    return NextResponse.redirect(new URL('/signin', req.url))
  }

  const { user } = await authRes.json() as { user: { email: string } | null }
  if (!user || user.email.toLowerCase() !== 'antonbosspd@gmail.com') {
    return NextResponse.redirect(new URL('/403', req.url))
  }

  return res
}
