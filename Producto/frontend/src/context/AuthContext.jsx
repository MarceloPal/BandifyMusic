import { createContext, useContext, useMemo, useState } from 'react'
import PropTypes from 'prop-types'

const AuthContext = createContext(null)

const sanitizeToken = (raw) => {
  if (typeof raw !== 'string' || raw.trim() === '') return null
  return raw.trim()
}

const sanitizeUser = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return {
    id:             typeof raw.id === 'string'             ? raw.id             : null,
    nombre:         typeof raw.nombre === 'string'         ? raw.nombre         : '',
    email:          typeof raw.email === 'string'          ? raw.email          : '',
    role:           typeof raw.role === 'string'            ? raw.role           : 'user',
    es_premium:     Boolean(raw.es_premium),
    ciudad:         typeof raw.ciudad === 'string'         ? raw.ciudad         : null,
    user_tags:      Array.isArray(raw.user_tags)           ? raw.user_tags      : [],
    foto_url:       typeof raw.foto_url === 'string'       ? raw.foto_url       : null,
    banner_url:     typeof raw.banner_url === 'string'     ? raw.banner_url     : null,
    bio:            typeof raw.bio === 'string'             ? raw.bio            : null,
    s3_key:         typeof raw.s3_key === 'string'         ? raw.s3_key         : null,
    audio_vector:   raw.audio_vector  ?? null,
    audio_metadata: raw.audio_metadata ?? null,
    oficio:         Array.isArray(raw.oficio)              ? raw.oficio         : [],
    instagram_url:  typeof raw.instagram_url === 'string'  ? raw.instagram_url  : null,
    spotify_url:    typeof raw.spotify_url === 'string'    ? raw.spotify_url    : null,
    discord_url:    typeof raw.discord_url === 'string'    ? raw.discord_url    : null,
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sanitizeToken(localStorage.getItem('token')))
  const [user, setUser] = useState(() => {
    try {
      return sanitizeUser(JSON.parse(localStorage.getItem('user')))
    } catch {
      return null
    }
  })

  const login = (newToken, usuario) => {
    const safeToken = sanitizeToken(newToken)
    const safeUser  = sanitizeUser(usuario)
    localStorage.setItem('token', safeToken ?? '')
    localStorage.setItem('user', JSON.stringify(safeUser))
    setToken(safeToken)
    setUser(safeUser)
  }

  // Fusiona campos nuevos en el usuario sin re-login (ej. tras análisis de audio)
  const updateUser = (campos) => {
    setUser((prev) => {
      const siguiente = sanitizeUser({ ...prev, ...campos })
      localStorage.setItem('user', JSON.stringify(siguiente)) // NOSONAR — sanitizeUser strips all non-whitelisted fields before storage
      return siguiente
    })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const contextValue = useMemo(
    () => ({ token, user, login, logout, updateUser }),
    [token, user] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

AuthProvider.propTypes = { children: PropTypes.node.isRequired }

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
