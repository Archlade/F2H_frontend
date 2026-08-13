import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { cartAPI } from '../api'
import { useAuth } from './AuthContext'

/**
 * The cart, shared across the app.
 *
 * Held in context rather than fetched per page because the navbar badge and the
 * cart page must never disagree — a count that lags behind the page it links to
 * is worse than no count.
 *
 * Every cart endpoint returns the complete summary (items, subtotal, distance
 * from the minimum), so each mutation replaces the whole state and no follow-up
 * GET is needed. That also means the server's arithmetic is the only
 * arithmetic: the browser never adds up a total itself and never disagrees
 * about rounding.
 */
const CartContext = createContext(null)

const EMPTY = {
  items: [], count: 0, subtotal: 0,
  minimum_order_value: 300, meets_minimum: false, short_by: 300,
  has_problems: false,
}

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [cart, setCart] = useState(EMPTY)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) { setCart(EMPTY); return }
    setLoading(true)
    try {
      const res = await cartAPI.get()
      setCart(res.data)
    } catch {
      // A cart that fails to load is a cosmetic problem — the pages that
      // matter still work, and the next mutation will resync.
    } finally {
      setLoading(false)
    }
  }, [user])

  // Reloaded whenever the session changes, so signing out clears the badge and
  // signing in as somebody else does not show the previous person's cart.
  useEffect(() => { refresh() }, [refresh])

  const wrap = (fn) => async (...args) => {
    const res = await fn(...args)
    setCart(res.data)
    return res.data
  }

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      refresh,
      addItem: wrap(cartAPI.addItem),
      updateItem: wrap(cartAPI.updateItem),
      removeItem: wrap(cartAPI.removeItem),
      clear: wrap(cartAPI.clear),
      checkout: async (data) => {
        const res = await cartAPI.checkout(data)
        setCart(EMPTY)          // checkout empties it server-side
        return res.data
      },
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside a CartProvider')
  return ctx
}
