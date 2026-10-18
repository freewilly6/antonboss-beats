// src/middleware.ts
//
// Server-side gate for /admin. It must live in src/ — with a src/ directory
// Next only looks here, and at the project root it never ran at all.
// The admin API routes check the session themselves (lib/adminAuth.js); this
// just keeps everyone else off the page.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // grab the Supabase access token cookie
  const token = req.cookies.get('sb-access-token')?.value
  const toSignIn = () => NextResponse.redirect(new URL('/signin?redirectTo=/admin', req.url))
  if (!token) {
    return toSignIn()
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
    // Invalid or expired token. The sign-in page refreshes the cookie and
    // sends the admin straight back.
    return toSignIn()
  }

  // GoTrue's /user returns the user object itself, not { user }. Reading
  // `.user` off it always gave undefined, so even the admin was turned away.
  const body = (await authRes.json()) as { email?: string; user?: { email?: string } }
  const email = (body?.user?.email ?? body?.email ?? '').toLowerCase()
  if (email !== 'antonbosspd@gmail.com') {
    // There is no /403 page; send anyone else home.
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}
