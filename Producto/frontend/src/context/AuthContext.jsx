import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'))
    } catch {
      return null
    }
  })

  const login = (newToken, usuario) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(usuario))
    setToken(newToken)
    setUser(usuario)
  }

  // Fusiona campos nuevos en el usuario sin re-login (ej. tras análisis de audio)
  const updateUser = (campos) => {
    setUser((prev) => {
      const siguiente = { ...prev, ...campos }
      localStorage.setItem('user', JSON.stringify(siguiente))
      return siguiente
    })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
