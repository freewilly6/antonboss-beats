// src/lib/adminAuth.js
//
// Server-side gate for the admin API routes. The /admin page itself is
// protected by middleware.ts, but its API routes are plain URLs anyone can
// call, and they run with the service-role key — so each one must check the
// caller itself. The page sends its Supabase session token as a Bearer
// header; this verifies it with Supabase and checks the email.
//
// Usage:  const admin = await requireAdmin(req, res); if (!admin) return;

import { supabaseAdmin } from './supabaseAdmin';
import { isAdminEmail } from './admin';

export async function requireAdmin(req, res) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Sign in required' });
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ error: 'Session expired — sign in again' });
      return null;
    }
    if (!isAdminEmail(data.user.email)) {
      res.status(403).json({ error: 'Not allowed' });
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('[requireAdmin] could not verify session:', err);
    res.status(500).json({ error: 'Could not verify session' });
    return null;
  }
}

/** The R2 object key behind one of our public file URLs, or null. */
export function r2KeyFromUrl(url) {
  const base = (process.env.PUBLIC_R2_URL || '').replace(/\/+$/, '');
  if (!url || !base || !url.startsWith(`${base}/`)) return null;
  return decodeURIComponent(url.slice(base.length + 1));
}
