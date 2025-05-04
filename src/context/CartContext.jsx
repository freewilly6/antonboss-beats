import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('antonboss-cart');
    if (stored) {
      try {
        setCart(JSON.parse(stored));
      } catch {
        console.error('❌ Failed to parse cart');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('antonboss-cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (newItem) => {
    setCart((prev) => {
      // dedupe purely on item.id = `${beatId}-${licenseName}`
      const exists = prev.some(item => item.id === newItem.id);
      if (exists) {
        console.warn(`⚠️ Already in cart: ${newItem.id}`);
        return prev;
      }
      return [...prev, newItem];
    });
  };

  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((item) => item.id !== id));

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('antonboss-cart');
  };

  const getTotal = () =>
    cart.reduce((sum, item) => sum + Number(item.price || 0), 0);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, clearCart, getTotal }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
