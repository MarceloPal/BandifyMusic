import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import Sidebar from './Sidebar'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../hooks/useImageUrl', () => ({
  useImageUrl: () => ({ url: null, isLoading: false }),
}))

function renderSidebar(isOpen = true, onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Sidebar isOpen={isOpen} onClose={onClose} />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
  })

  it('muestra el logo BANDIFY', () => {
    renderSidebar()
    expect(screen.getByText('BANDIFY')).toBeInTheDocument()
  })

  it('muestra todos los ítems de navegación (9 ítems)', () => {
    renderSidebar()
    expect(screen.getByText('Mi ADN')).toBeInTheDocument()
    expect(screen.getByText('Mi Perfil')).toBeInTheDocument()
    expect(screen.getByText('Explorar')).toBeInTheDocument()
    expect(screen.getByText('Mensajes')).toBeInTheDocument()
    expect(screen.getByText('Tocatas')).toBeInTheDocument()
    expect(screen.getByText('Notificaciones')).toBeInTheDocument()
    expect(screen.getByText('Noticias')).toBeInTheDocument()
    expect(screen.getByText('Ayuda')).toBeInTheDocument()
    expect(screen.getByText('Ajustes')).toBeInTheDocument()
  })

  it('muestra el botón de cerrar sesión', () => {
    renderSidebar()
    expect(screen.getByText('Cerrar sesión')).toBeInTheDocument()
  })

  it('no muestra el avatar si no hay usuario logueado', () => {
    renderSidebar()
    expect(screen.queryByText(/Premium/)).not.toBeInTheDocument()
  })

  it('muestra el nombre y email del usuario logueado', () => {
    localStorage.setItem('token', 'tok')
    localStorage.setItem('user', JSON.stringify({ id: 1, nombre: 'Ana Mora', email: 'ana@test.cl', es_premium: false }))
    renderSidebar()
    expect(screen.getByText('Ana Mora')).toBeInTheDocument()
    expect(screen.getByText('ana@test.cl')).toBeInTheDocument()
  })

  it('muestra "✦ Premium" para usuarios premium', () => {
    localStorage.setItem('token', 'tok')
    localStorage.setItem('user', JSON.stringify({ id: 1, nombre: 'Carlos', email: 'c@test.cl', es_premium: true }))
    renderSidebar()
    expect(screen.getByText('✦ Premium')).toBeInTheDocument()
  })

  it('muestra iniciales cuando no hay foto de perfil', () => {
    localStorage.setItem('token', 'tok')
    localStorage.setItem('user', JSON.stringify({ id: 1, nombre: 'Juan Pérez', email: 'j@test.cl', es_premium: false }))
    renderSidebar()
    expect(screen.getByText('JP')).toBeInTheDocument()
  })

  it('llama onClose al hacer clic en un ítem de nav', () => {
    const onClose = vi.fn()
    renderSidebar(true, onClose)
    fireEvent.click(screen.getByText('Mi ADN'))
    expect(onClose).toHaveBeenCalled()
  })

  it('cierra sesión y redirige a "/" al hacer clic en Cerrar sesión', () => {
    localStorage.setItem('token', 'tok')
    localStorage.setItem('user', JSON.stringify({ id: 1, nombre: 'Test' }))
    renderSidebar()
    fireEvent.click(screen.getByText('Cerrar sesión'))
    expect(localStorage.getItem('token')).toBeNull()
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
