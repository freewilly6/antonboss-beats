// src/lib/serverAuth.js — SERVER ONLY.
//
// Gates for API routes. Pages send their Supabase session token as a Bearer
// header; these verify it with Supabase (never trusting ids from the body).
//
//   const user  = await requireUser(req, res);  if (!user)  return;
//   const admin = await requireAdmin(req, res); if (!admin) return;

import { supabaseAdmin } from './supabaseAdmin';
import { isAdminEmail } from './admin';

export async function requireUser(req, res) {
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
    return data.user;
  } catch (err) {
    console.error('[auth] could not verify session:', err);
    res.status(500).json({ error: 'Could not verify session' });
    return null;
  }
}

export async function requireAdmin(req, res) {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (!isAdminEmail(user.email)) {
    res.status(403).json({ error: 'Not allowed' });
    return null;
  }
  return user;
}
