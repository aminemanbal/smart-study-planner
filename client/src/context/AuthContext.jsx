import { createContext, useContext, useEffect, useState } from 'react'
import * as authService from '../services/authService'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) { setLoading(false); return }
      try {
        const me = await authService.me()
        setUser(me)
      } catch {
        localStorage.removeItem('token')
        setToken(null)
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  }, [token])

  const login = async (credentials) => {
    const { token: t, user: u } = await authService.login(credentials)
    localStorage.setItem('token', t)
    setToken(t)
    setUser(u)
    return u
  }

  const register = async (data) => {
    return authService.register(data)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  // Merge fresh fields into the cached user (called after profile updates)
  const updateUser = (patch) => {
    setUser(prev => prev ? { ...prev, ...patch } : prev)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
