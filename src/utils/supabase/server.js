// src/utils/supabase/server.js
import { parse as parseCookie, serialize as serializeCookie } from 'cookie'
import { createServerClient } from '@supabase/ssr'

export function createServerSupabaseClient(req, res) {
  // 1) parse all incoming cookies into { name, value }[]
  const parsed = parseCookie(req.headers.cookie ?? '')
  const cookieArray = Object.entries(parsed).map(([name, value]) => ({ name, value }))

  // 2) build the Supabase server client
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieArray,
        setAll: (cookiesToSet) => {
          // serialize them back onto the response
          const serialized = cookiesToSet.map(({ name, value, options }) =>
            serializeCookie(name, value, options)
          )
          const prev = res.getHeader('Set-Cookie')
          res.setHeader(
            'Set-Cookie',
            Array.isArray(prev)
              ? [...prev, ...serialized]
              : prev
              ? [prev, ...serialized]
              : serialized
          )
        },
      },
    }
  )
}
