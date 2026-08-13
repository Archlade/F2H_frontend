import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await authAPI.me()
      setUser(data)
      setUnreadNotifications(data.unread_notifications || 0)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMe()

    // Handle expired session events
    const handleExpired = () => {
      setUser(null)
    }
    window.addEventListener('auth:expired', handleExpired)
    return () => window.removeEventListener('auth:expired', handleExpired)
  }, [fetchMe])

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    setUser(data.user)
    setUnreadNotifications(data.user.unread_notifications || 0)
    return data.user
  }

  const register = async (formData) => {
    const { data } = await authAPI.register(formData)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try { await authAPI.logout() } catch {}
    setUser(null)
  }

  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }))
  }

  const decrementUnread = () => {
    setUnreadNotifications((n) => Math.max(0, n - 1))
  }

  const setUnread = (count) => {
    setUnreadNotifications(count)
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateUser,
      refetch: fetchMe,
      unreadNotifications,
      setUnread,
      decrementUnread,
      isAuthenticated: !!user,
      isCustomer: user?.role === 'customer',
      isFarmer: user?.role === 'farmer',
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
