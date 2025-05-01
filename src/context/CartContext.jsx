import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // ✅ Load cart from localStorage on mount
  useEffect(() => {
    const storedCart = localStorage.getItem('antonboss-cart');
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart));
      } catch (error) {
        console.error('❌ Failed to parse cart from localStorage:', error);
      }
    }
  }, []);

  // ✅ Save cart to localStorage on changes
  useEffect(() => {
    localStorage.setItem('antonboss-cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (newItem) => {
    setCart((prevCart) => {
      const exists = prevCart.some(
        (item) => item.id === newItem.id
      );
  
      if (exists) {
        console.warn('⚠️ Item already in cart:', newItem.id);
        return prevCart; // Don't add duplicate
      }
  
      return [...prevCart, newItem];
    });
  };

  const removeFromCart = (id) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('antonboss-cart'); // Optional: clear local copy
  };

  const getTotal = () => {
    return cart.reduce((total, item) => {
      const price = typeof item.price === 'number' ? item.price : 0;
      return total + price;
    }, 0);
  };

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, clearCart, getTotal }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
