// context/CartContext.js
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

const CartContext = createContext()

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([])

  // ── 1) Hydrate & clean from localStorage ────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('antonboss-cart')
    if (!stored) return

    try {
      const parsed = JSON.parse(stored)

      // Coerce beatId → number, filter out bad entries
      const cleaned = parsed
        .map(item => ({
          ...item,
          beatId: Number(item.beatId),
        }))
        .filter(item => Number.isInteger(item.beatId))

      setCart(cleaned)
    } catch (err) {
      console.error('❌ Failed to parse or clean stored cart:', err)
    }
  }, [])

  // ── 2) Persist to localStorage on every change ──────────────
  useEffect(() => {
    localStorage.setItem('antonboss-cart', JSON.stringify(cart))
  }, [cart])

  // ── 3) Add a beat + license combo ─────────────────────────
  const addToCart = useCallback(({
    beatId,       // ← raw PK from your BeatFiles table
    name,         // ← display name
    title,        // ← optional subtitle
    cover,        // ← cover image URL
    licenseType,  // ← e.g. "Premium License"
    price,        // ← numeric price
    audioUrl,     // ← file_path
    wav,
    stems         // ← optional
  }) => {
    const realBeatId = Number(beatId)

    // guard: must be a valid integer ID
    if (!Number.isInteger(realBeatId)) {
      console.warn(`⚠️ Tried to add invalid beatId to cart:`, beatId)
      return
    }

    const id = `${realBeatId}-${licenseType}`

    setCart(prev => {
      if (prev.some(item => item.id === id)) {
        console.warn(`⚠️ Already in cart: ${id}`)
        return prev
      }
      return [
        ...prev,
        {
          id,
          beatId:      realBeatId,
          name,
          title,
          cover,
          licenseType,
          price:       Number(price || 0),
          audioUrl,
          wav,
          stems
        }
      ]
    })
  }, [])

  // ── 4) Remove & clear helpers ───────────────────────────────
  const removeFromCart = useCallback(id =>
    setCart(prev => prev.filter(item => item.id !== id)), [])

  const clearCart = useCallback(() => {
    setCart([])
    localStorage.removeItem('antonboss-cart')
  }, [])

  // ── 5) Total calculator ────────────────────────────────────
  const getTotal = useCallback(() =>
    cart.reduce((sum, item) => sum + (Number(item.price) || 0), 0), [cart])

  // Stable identities, so consumers only re-render when the cart truly changes.
  const value = useMemo(
    () => ({ cart, addToCart, removeFromCart, clearCart, getTotal }),
    [cart, addToCart, removeFromCart, clearCart, getTotal]
  )

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
