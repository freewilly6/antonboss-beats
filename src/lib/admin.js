// src/lib/admin.js
//
// Who runs the store. Shared by the admin page (to decide what to show) and
// lib/serverAuth.js (which actually enforces it, server-side). middleware.ts
// keeps its own copy because it runs on the edge runtime.

export const ADMIN_EMAIL = 'antonbosspd@gmail.com';

export const isAdminEmail = (email) => (email || '').toLowerCase() === ADMIN_EMAIL;
