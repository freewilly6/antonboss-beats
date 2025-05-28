import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';


import dynamic from 'next/dynamic'
import { useCart } from '../context/CartContext';
import Layout from '../components/Layout';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function CartPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
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
        setAccessToken(session.access_token);
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);
const PayPalButtons = dynamic(
  () => import('@paypal/react-paypal-js').then(mod => mod.PayPalButtons),
  { ssr: false }
)
  const handlePayPalApproval = async (details) => {
  try {
   // ── 1) Build your payload off the canonical beatId ─────────
const payloadItems = cart.map(item => ({
  beatId:      item.beatId,          // always what you passed into addToCart
  licenseName: item.licenseType,
}));

// (Optional) If you really need to enforce integer IDs
// you could still check here, but supabase integer PKs come through as numbers anyway.
// const bad = payloadItems.filter(pi => typeof pi.beatId !== 'number');
// if (bad.length) { … }


   // ── 2) Call your purchase‐finalization endpoint ────────────
const response = await fetch('/api/complete-purchase', {
  method:  'POST',
  headers: {
    'Content-Type':  'application/json',
    Authorization:    `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    orderID: details.id,
    items:   payloadItems,
  }),
});


    const result = await response.json();
    if (!response.ok) {
      // Special‐case “not found” so you can report it cleanly
      if (result.error?.includes('not found')) {
        alert(
          'One of the beats you tried to purchase could not be found. ' +
          'It may have been removed—please refresh and try again.'
        );
      } else {
        throw new Error(result.error || 'Failed to finalize purchase');
      }
      return;
    }

    // ── 4) Success! ────────────────────────────────────────────
    clearCart();
    setPurchaseComplete(true);
    setShowConfirmation(true);

  } catch (err) {
    console.error('❌ Purchase failed:', err);
    alert(
      'Payment succeeded, but something went wrong on our end. ' +
      'Please contact support with this message:\n\n' +
      err.message
    );
  }
};

  if (loading) return null;

  return (
    <Layout>
      <div className="p-6 bg-gray-20 text-black min-h-screen">
        <h1 className="text-3xl mb-6 font-bold">Your Cart</h1>

        {isEmpty ? (
          <p>Your cart is currently empty.</p>
        ) : (
          <>
            <div className="space-y-4">
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
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-4 bg-gray-100 border border-gray-300 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={cover}
                        alt={title}
                        className="w-16 h-16 rounded object-cover"
                      />
                      <div>
                        <h2 className="font-bold text-lg">{title}</h2>
                        <p className="text-sm text-gray-600">{license}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-pink-600">
                        ${price.toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-sm text-red-600 hover:underline mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 text-right">
              <h2 className="text-2xl font-bold">
                Subtotal before taxes:{' '}
                <span className="text-green-600">
                  ${getTotal().toFixed(2)}
                </span>
              </h2>

              <div className="mt-6 max-w-xs ml-auto">
                <PayPalButtons
                  style={{ layout: 'horizontal' }}
                  createOrder={(data, actions) =>
                    actions.order.create({
                      purchase_units: [
                        {
                          amount: { value: getTotal().toFixed(2) },
                          description: 'Your Beat Purchase',
                        },
                      ],
                    })
                  }
                  onApprove={async (data, actions) => {
                    const details = await actions.order.capture();
                    await handlePayPalApproval(details);
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-sm w-full">
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              Purchase Successful!
            </h2>
            <p className="mb-4">Your beats are now available for download.</p>
            <button
              onClick={() => setShowConfirmation(false)}
              className="bg-gray-200 hover:bg-gray-300 text-black font-semibold px-6 py-2 rounded mr-2"
            >
              Close
            </button>
            <button
              onClick={() => {
                setShowConfirmation(false);
                router.push('/downloads');
              }}
              className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-6 py-2 rounded"
            >
              Go to Downloads
            </button>
          </div>
        </div>
      )}

      {purchaseComplete && !showConfirmation && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => router.push('/downloads')}
            className="bg-pink-500 hover:bg-pink-600 text-white font-semibold px-6 py-3 rounded-full shadow-lg"
          >
            My Downloads
          </button>
        </div>
      )}
    </Layout>
  );
}
