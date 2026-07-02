import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

// Componente auxiliar para exponer el contexto en tests
function AuthConsumer({ onRender }) {
  const auth = useAuth()
  onRender(auth)
  return null
}

function renderWithAuth(onRender) {
  return render(
    <AuthProvider>
      <AuthConsumer onRender={onRender} />
    </AuthProvider>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('inicia sin token ni usuario si localStorage está vacío', () => {
    let auth
    renderWithAuth((a) => { auth = a })
    expect(auth.token).toBeNull()
    expect(auth.user).toBeNull()
  })

  it('carga token y usuario desde localStorage al iniciar', () => {
    const fakeUser = { id: 1, nombre: 'Juan' }
    localStorage.setItem('token', 'abc123')
    localStorage.setItem('user', JSON.stringify(fakeUser))

    let auth
    renderWithAuth((a) => { auth = a })
    expect(auth.token).toBe('abc123')
    expect(auth.user).toEqual(fakeUser)
  })

  it('login guarda token y usuario en estado y localStorage', () => {
    let auth
    renderWithAuth((a) => { auth = a })

    act(() => {
      auth.login('token-nuevo', { id: 2, nombre: 'Ana' })
    })

    expect(localStorage.getItem('token')).toBe('token-nuevo')
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: 2, nombre: 'Ana' })
  })

  it('logout elimina token y usuario de estado y localStorage', () => {
    localStorage.setItem('token', 'abc123')
    localStorage.setItem('user', JSON.stringify({ id: 1 }))

    let auth
    renderWithAuth((a) => { auth = a })

    act(() => {
      auth.logout()
    })

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('updateUser fusiona nuevos campos sin perder los anteriores', () => {
    const usuario = { id: 1, nombre: 'Juan', plan: 'free' }
    localStorage.setItem('token', 'tok')
    localStorage.setItem('user', JSON.stringify(usuario))

    let auth
    renderWithAuth((a) => { auth = a })

    act(() => {
      auth.updateUser({ plan: 'premium', audio_vector: [1, 2, 3] })
    })

    const saved = JSON.parse(localStorage.getItem('user'))
    expect(saved.nombre).toBe('Juan')
    expect(saved.plan).toBe('premium')
    expect(saved.audio_vector).toEqual([1, 2, 3])
  })

  it('maneja localStorage con JSON inválido para user sin lanzar error', () => {
    localStorage.setItem('user', 'no-es-json{')
    let auth
    expect(() => renderWithAuth((a) => { auth = a })).not.toThrow()
    expect(auth.user).toBeNull()
  })
})
