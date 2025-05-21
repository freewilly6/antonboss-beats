// context/CartContext.js
import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([])

  // ── Hydrate from localStorage ───────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('antonboss-cart')
    if (stored) {
      try {
        setCart(JSON.parse(stored))
      } catch {
        console.error('❌ Failed to parse cart')
      }
    }
  }, [])

  // ── Persist to localStorage ────────────────────────────────
  useEffect(() => {
    localStorage.setItem('antonboss-cart', JSON.stringify(cart))
  }, [cart])

  // ── Add a beat + license combination ───────────────────────
  const addToCart = ({
    beatId,        // ← the real PK from your BeatFiles table
    name,          // ← display name
    title,         // ← optional subtitle
    cover,         // ← cover image URL
    licenseType,   // ← e.g. "Premium License"
    price,         // ← numeric price
    audioUrl,      // ← file_path
    wav, stems     // ← optional
  }) => {
    // build a React-key that's also our uniqueness check
    const id = `${beatId}-${licenseType}`

    setCart(prev => {
      if (prev.some(item => item.id === id)) {
        console.warn(`⚠️ Already in cart: ${id}`)
        return prev
      }
      return [
        ...prev,
        { id, beatId, name, title, cover, licenseType, price, audioUrl, wav, stems }
      ]
    })
  }

  // ── Remove by that same `id` ───────────────────────────────
  const removeFromCart = id =>
    setCart(prev => prev.filter(item => item.id !== id))

  const clearCart = () => {
    setCart([])
    localStorage.removeItem('antonboss-cart')
  }

  const getTotal = () =>
    cart.reduce((sum, item) => sum + Number(item.price || 0), 0)

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, clearCart, getTotal }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
