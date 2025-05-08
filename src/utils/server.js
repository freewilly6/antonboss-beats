// src/utils/server.js
import { createServerClient } from '@supabase/ssr';
import { parse, serialize } from 'cookie';

export function createServerSupabaseClient(ctx) {
  const { req, res } = ctx;

  // Parse cookies from the request
  const parsedCookies = parse(req.headers.cookie ?? '');
  const cookieArray = Object.entries(parsedCookies).map(([name, value]) => ({ name, value }));

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieArray,
        setAll: (cookiesToSet) => {
          const serialized = cookiesToSet.map(({ name, value, options }) =>
            serialize(name, value, options)
          );
          const previous = res.getHeader('Set-Cookie');
          const header = Array.isArray(previous)
            ? [...previous, ...serialized]
            : previous
            ? [previous, ...serialized]
            : serialized;

          res.setHeader('Set-Cookie', header);
        },
      },
    }
  );
}
