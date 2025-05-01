import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import { PayPalButtons } from '@paypal/react-paypal-js';

import { useCart } from '../context/CartContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CartPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const router = useRouter();
  const { cart, removeFromCart, getTotal, clearCart } = useCart();

  const isEmpty = cart.length === 0;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/signin?redirectTo=/cart`);
      } else {
        setUser(session.user);
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const storePurchase = async (paypalDetails) => {
    if (!user) return;

    const { error } = await supabase.from('purchases').insert({
      user_id: user.id,
      email: user.email,
      beats: cart.map((item) => ({
        id: item.id,
        name: item.name || item.title,
        audioUrl: item.audioUrl || item.audiourl,
        cover: item.cover,
        license: item.licenseType || 'Default License',
        price: item.price || 24.99,
      })),
      total: getTotal(),
      paypal_transaction_id: paypalDetails.id,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('❌ Failed to store purchase in Supabase:', error.message);
    }
  };

  if (loading) return null;

  return (
    <>
      <Navbar />
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
                const price = typeof item.price === 'number' ? item.price : 24.99;

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
                      <p className="font-bold text-pink-600">${price.toFixed(2)}</p>
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
                <span className="text-green-600">${getTotal().toFixed(2)}</span>
              </h2>

              <div className="mt-6 max-w-xs ml-auto">
                <PayPalButtons
                  style={{ layout: "horizontal" }}
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      purchase_units: [
                        {
                          amount: {
                            value: getTotal().toFixed(2),
                          },
                          description: "AntonBoss Beat Purchase",
                        },
                      ],
                    });
                  }}
                  onApprove={async (data, actions) => {
                    const details = await actions.order.capture();
                    console.log("✅ Payment successful!", details);
                    await storePurchase(details);
                    clearCart(); // Clear cart after successful payment
                    setShowConfirmation(true);
                  }}
                  onError={(err) => {
                    console.error("❌ PayPal error:", err);
                    alert("Payment failed. Try again.");
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />

      {/* ✅ Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-sm w-full">
            <h2 className="text-2xl font-bold text-green-600 mb-4">Purchase Successful!</h2>
            <p className="mb-4">Your beats are now available for download.</p>
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
    </>
  );
}
