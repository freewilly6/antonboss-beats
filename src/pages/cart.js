// pages/cart.js
import { useCart } from '../context/CartContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function CartPage() {
  const { cart, removeFromCart, getTotal } = useCart();

  return (
    <>
      <Navbar />
      <div className="p-6 bg-gray-20 text-black min-h-screen">
        <h1 className="text-3xl mb-6 font-bold">Your Cart</h1>

        {cart.length === 0 ? (
          <p>Your cart is currently empty.</p>
        ) : (
          <>
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-4 bg-gray-100 border border-gray-300 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-16 h-16 rounded object-cover"
                    />
                    <div>
                      <h2 className="font-bold text-lg">{item.title}</h2>
                      <p className="text-sm text-gray-600">{item.license}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-pink-600">${item.price.toFixed(2)}</p>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-sm text-red-600 hover:underline mt-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-right">
              <h2 className="text-2xl font-bold">
                Subtotal before taxes: <span className="text-green-600">${getTotal().toFixed(2)}</span>
              </h2>
              <button className="mt-4 bg-pink-500 hover:bg-pink-700 text-white px-6 py-3 rounded font-bold">
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
