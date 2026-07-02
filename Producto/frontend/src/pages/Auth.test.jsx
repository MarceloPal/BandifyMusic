import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'
import Auth from './Auth'

// SoftAurora usa WebGL (via `ogl`) para el fondo animado — jsdom no implementa
// WebGL, así que renderizarlo tal cual revienta el árbol entero con
// "unable to create webgl context". No es lógica de negocio: se mockea.
vi.mock('../components/SoftAurora', () => ({ default: () => null }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderAuth(initialRoute = '/auth') {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Auth />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Auth — happy path', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
  })

  it('inicia sesión con credenciales correctas, guarda el token y redirige a /mi-adn', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        token: 'token-de-prueba',
        usuario: { id: 'user-1', nombre: 'Ana', email: 'ana@test.cl', role: 'user' },
      }),
    })

    const { container } = renderAuth('/auth?mode=login')

    fireEvent.change(container.querySelector('input[name="identifier"]'), {
      target: { value: 'ana@test.cl' },
    })
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: 'clave-segura-123' },
    })

    const submitBtn = container.querySelector('button[type="submit"]')
    expect(submitBtn).not.toBeDisabled()
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/mi-adn')
    })

    // La sesión quedó realmente persistida (integración real con AuthContext,
    // no solo un mock de login()).
    expect(localStorage.getItem('token')).toBe('token-de-prueba')
    expect(JSON.parse(localStorage.getItem('user'))).toMatchObject({ nombre: 'Ana' })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ identifier: 'ana@test.cl', password: 'clave-segura-123' }),
      })
    )
  })

  it('crea una cuenta nueva y redirige a /onboarding', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        token: 'token-nuevo',
        usuario: { id: 'user-2', nombre: 'beto_music', email: 'beto@test.cl', role: 'user' },
      }),
    })

    const { container } = renderAuth('/auth')

    fireEvent.change(container.querySelector('input[name="username"]'), {
      target: { value: 'beto_music' },
    })
    fireEvent.change(container.querySelector('input[name="email"]'), {
      target: { value: 'beto@test.cl' },
    })
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: 'clave-segura-123' },
    })
    fireEvent.change(container.querySelector('input[name="confirm_password"]'), {
      target: { value: 'clave-segura-123' },
    })

    const submitBtn = container.querySelector('button[type="submit"]')
    expect(submitBtn).not.toBeDisabled()
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding')
    })

    expect(localStorage.getItem('token')).toBe('token-nuevo')
  })

  it('muestra un error y no navega si las credenciales son incorrectas', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Credenciales inválidas' }),
    })

    const { container } = renderAuth('/auth?mode=login')

    fireEvent.change(container.querySelector('input[name="identifier"]'), {
      target: { value: 'ana@test.cl' },
    })
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: 'clave-incorrecta' },
    })
    fireEvent.click(container.querySelector('button[type="submit"]'))

    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(localStorage.getItem('token')).toBeNull()
  })
})
