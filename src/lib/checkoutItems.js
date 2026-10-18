// src/lib/checkoutItems.js — SERVER ONLY.
//
// Turns what a cart claims ([{ beatId, licenseName }]) into priced line items
// using the database, never the client's prices.

import { supabaseAdmin } from './supabaseAdmin';
import { normalizeLicense, tierIndex } from './licenses';

export async function priceItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new Error('Your cart is empty');
  if (rawItems.length > 50) throw new Error('Too many items');

  const wanted = [];
  const seen = new Set();
  for (const i of rawItems) {
    const beatId = Number(i?.beatId);
    const license = normalizeLicense(i?.licenseName);
    if (!Number.isInteger(beatId) || tierIndex(license) < 0) throw new Error('Invalid item in cart');
    const k = `${beatId}:${license}`;
    if (!seen.has(k)) {
      seen.add(k);
      wanted.push({ beatId, license });
    }
  }

  const ids = [...new Set(wanted.map((w) => w.beatId))];
  const { data: beats, error } = await supabaseAdmin.from('BeatFiles').select('id, name, licenses').in('id', ids);
  if (error) throw error;

  return wanted.map(({ beatId, license }) => {
    const beat = beats.find((b) => b.id === beatId);
    if (!beat) throw new Error('A beat in your cart is no longer available');
    const licenses = typeof beat.licenses === 'string' ? JSON.parse(beat.licenses) : beat.licenses || [];
    const match = licenses.find((l) => normalizeLicense(l.name) === license);
    const price = Number(match?.price);
    if (!match || !(price > 0)) throw new Error(`${license} isn't available for “${beat.name}”`);
    return { beatId, name: beat.name, license, price };
  });
}

/** What a purchase row stores per item. No file locations: those are resolved at download time. */
export const toPurchaseItems = (items) =>
  items.map(({ beatId, name, license, price }) => ({ id: beatId, name, license, price }));
