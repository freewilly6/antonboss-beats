// src/components/CartDrawer.jsx
//
// Cart contents as an overlay so browsing never leaves the scroll. Checkout
// itself still hands off to /cart, which is auth-gated and owns the PayPal
// integration — payment shouldn't run inside a dismissible drawer.

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function CartDrawer({ open, onClose }) {
  const { cart, removeFromCart, getTotal } = useCart();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);

    // Freeze the page behind the drawer.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex justify-end" style={{ zIndex: 'var(--z-dialog)' }}>
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-label="Cart"
        className="relative flex h-full w-[min(440px,100vw)] flex-col border-l border-[var(--fg-20)] bg-black"
      >
        <header className="flex items-center justify-between border-b border-[var(--fg-10)] p-6">
          <h2 className="ab-label">Cart{cart.length ? ` (${cart.length})` : ''}</h2>
          <button onClick={onClose} className="ab-btn ab-btn-bare ab-btn-sm">
            Close ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {cart.length === 0 ? (
            <p className="ab-label-dim">Nothing here yet.</p>
          ) : (
            <ul className="space-y-5">
              {cart.map((item) => (
                <li key={item.id} className="flex items-center gap-4">
                  <img
                    src={item.cover || '/images/beats/default-cover.png'}
                    alt=""
                    className="h-14 w-14 flex-shrink-0 object-cover grayscale"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.name}</p>
                    <p className="ab-label-dim mt-1">{item.licenseType}</p>
                  </div>
                  <span className="text-sm text-[var(--accent)]">
                    ${Number(item.price).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="ab-btn ab-btn-bare ab-btn-sm"
                    aria-label={`Remove ${item.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <footer className="border-t border-[var(--fg-10)] p-6">
            <div className="mb-6 flex justify-between text-sm">
              <span className="ab-label">Total</span>
              <span>${getTotal().toFixed(2)}</span>
            </div>
            <Link
              href="/cart"
              onClick={onClose}
              className="ab-btn ab-btn-solid w-full"
            >
              Checkout
            </Link>
          </footer>
        )}
      </aside>
    </div>
  );
}
