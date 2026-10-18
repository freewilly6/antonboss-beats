import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic'
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useCart } from '../context/CartContext';
import Layout from '../components/Layout';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

// Defined once at module level. It used to be created inside the page
// component, which made a brand-new component type on every render, so the
// PayPal buttons were torn down and reloaded whenever the cart changed.
const PayPalButtons = dynamic(
  () => import('@paypal/react-paypal-js').then((mod) => mod.PayPalButtons),
  { ssr: false }
);

function CartPageInner() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [confirmedPaid, setConfirmedPaid] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const router = useRouter();
  const { cart, removeFromCart, getTotal, clearCart } = useCart();
  const isEmpty = cart.length === 0;

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push(`/signin?redirectTo=/cart`);
      } else {
        const u = session.user;
        setUser(u);
        setIsAdmin(u.email === ADMIN_EMAIL);
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);
  // Fresh token per call: a long checkout can outlive the one from page load.
  const authHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data?.session?.access_token || ''}`,
    };
  };

  // 1) The server prices the cart and creates the PayPal order, so what's
  //    paid for is fixed before the buyer ever sees PayPal.
  const createOrder = async () => {
    setCheckoutError('');
    const res = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        items: cart.map((item) => ({ beatId: item.beatId, licenseName: item.licenseType })),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.orderID) {
      setCheckoutError(json.error || 'Could not start checkout. Please try again.');
      throw new Error(json.error || 'create-order failed');
    }
    return json.orderID;
  };

  // 2) After approval, the server captures. Files unlock when PayPal's
  //    webhook confirms the payment — usually within seconds.
  const onApprove = async ({ orderID }) => {
    const res = await fetch('/api/paypal/capture-order', {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ orderID }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCheckoutError(json.error || 'Something went wrong completing the payment.');
      return;
    }
    clearCart();
    setConfirmedPaid(json.status === 'paid');
    setPurchaseComplete(true);
    setShowConfirmation(true);
  };

  if (loading) return null;

  return (
    <Layout>
      <Head>
        <title>Cart — Anton Boss</title>
      </Head>

      <div className="mx-auto max-w-4xl py-12">
        <p className="ab-label mb-3">Cart</p>
        <h1 className="ab-display">
          {isEmpty ? 'Nothing here yet.' : `${cart.length} beat${cart.length === 1 ? '' : 's'}`}
        </h1>

        {isEmpty ? (
          <div className="ab-card mt-12 flex flex-col items-center gap-6 px-6 py-16 text-center">
            <p className="ab-body">Pick a case off the shelf and choose a license.</p>
            <Link href="/#beats" className="ab-btn ab-btn-solid">
              Browse beats
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-12 divide-y divide-[var(--fg-10)] border-y border-[var(--fg-10)]">
              {cart.map((item) => {
                const title =
                  item.name && item.title && item.name !== item.title
                    ? `${item.name} (${item.title})`
                    : item.name || item.title || 'Untitled';
                const cover = item.cover || '/images/beats/default-cover.png';
                const license = item.licenseType || 'Default License';
                const price =
                  typeof item.price === 'number' ? item.price : 24.99;

                return (
                  <li key={item.id} className="flex items-center gap-4 py-5">
                    <img
                      src={cover}
                      alt=""
                      className="h-16 w-16 flex-none object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{title}</p>
                      <p className="ab-meta mt-1 truncate">{license}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm">${price.toFixed(2)}</span>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="ab-btn ab-btn-sm ab-btn-bare"
                        aria-label={`Remove ${title}`}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="ab-label-dim">Subtotal before taxes</p>
                <p className="mt-2 text-3xl">${getTotal().toFixed(2)}</p>
              </div>

              <div className="w-full sm:max-w-xs">
                <PayPalButtons
                  style={{ layout: 'horizontal' }}
                  createOrder={createOrder}
                  onApprove={onApprove}
                  onError={() => setCheckoutError('PayPal hit a problem. You have not been charged — please try again.')}
                />
                {checkoutError && <p className="ab-body mt-3 text-[var(--accent)]">{checkoutError}</p>}
                <p className="ab-meta mt-3">
                  Files appear in your <Link href="/account" className="underline hover:text-[var(--fg)]">account</Link> as
                  soon as payment clears.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {showConfirmation && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70 px-6"
          style={{ zIndex: 'var(--z-dialog)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="purchase-done"
        >
          <div className="w-full max-w-sm border border-[var(--fg-20)] bg-[var(--bg)] p-8 text-center">
            <p className="ab-label mb-4">Order complete</p>
            <h2 id="purchase-done" className="ab-display">Thank you.</h2>
            <p className="ab-body mt-4">
              {confirmedPaid
                ? 'Your beats are ready to download.'
                : 'Payment received. Your files unlock in your account as soon as PayPal confirms it — usually within a minute.'}
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <button onClick={() => setShowConfirmation(false)} className="ab-btn">
                Close
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  router.push('/account?tab=library');
                }}
                className="ab-btn ab-btn-solid"
              >
                My downloads
              </button>
            </div>
          </div>
        </div>
      )}

      {purchaseComplete && !showConfirmation && (
        <div className="fixed bottom-6 right-6" style={{ zIndex: 'var(--z-chrome)' }}>
          <button onClick={() => router.push('/account?tab=library')} className="ab-btn ab-btn-solid">
            My downloads
          </button>
        </div>
      )}
    </Layout>
  );
}

// The PayPal SDK script is fetched from paypal.com the moment this provider
// mounts. It used to wrap the whole app in _app.js, so every page — the
// homepage most expensively — paid for a checkout it would never run.
export default function CartPage() {
  return (
    <PayPalScriptProvider
      options={{
        // v8 of @paypal/react-paypal-js takes camelCase; 'client-id' is the old spelling.
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
        currency: 'USD',
      }}
    >
      <CartPageInner />
    </PayPalScriptProvider>
  );
}
