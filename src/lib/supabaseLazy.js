// src/lib/supabaseLazy.js
//
// The Supabase client (auth + database + realtime) is ~100 KB of script. On
// the scroll page nothing needs it before first paint, so components there
// load it on demand instead of importing it statically, which would put it on
// the critical path of every page via the _app bundle.
//
// Resolves to the same singleton lib/supabaseClient exports.

let pending;

export function loadSupabase() {
  if (!pending) pending = import('./supabaseClient').then((m) => m.supabase);
  return pending;
}
