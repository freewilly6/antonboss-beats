// src/lib/licenses.js
//
// One source of truth for which files each license tier ships. Used by the
// download route (server) and safe to import from pages: no secrets here.

// In tier order — a higher tier includes everything below it.
export const TIERS = ['Basic License', 'Premium License', 'Premium Plus License', 'Unlimited License'];

/** "Premium-Plus License " → "Premium Plus License". Older rows used hyphens. */
export const normalizeLicense = (name) => String(name || '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

/** 0..3, or -1 for anything that isn't a downloadable tier (e.g. Exclusive). */
export const tierIndex = (name) => TIERS.indexOf(normalizeLicense(name));

/** The file kinds a tier unlocks. */
export function filesForTier(index) {
  if (index < 0) return [];
  const kinds = ['mp3'];
  if (index >= 1) kinds.push('wav');
  if (index >= 2) kinds.push('stems');
  return kinds;
}

export const FILE_LABELS = { mp3: 'MP3', wav: 'WAV', stems: 'Stems' };
