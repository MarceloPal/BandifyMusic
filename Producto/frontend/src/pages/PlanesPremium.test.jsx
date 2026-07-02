import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import PlanesPremium from './PlanesPremium'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPlanesPremium() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <PlanesPremium />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('PlanesPremium — checkout de suscripción', () => {
  let originalLocation

  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
    // jsdom no soporta navegación real; reemplazamos window.location por un
    // objeto simple para poder verificar a dónde se intenta redirigir.
    originalLocation = window.location
    delete window.location
    window.location = { href: '' }
  })

  afterEach(() => {
    window.location = originalLocation
  })

  it('redirige a /auth si el usuario no tiene sesión iniciada', () => {
    global.fetch = vi.fn()
    renderPlanesPremium()

    fireEvent.click(screen.getByText('Actualizar a Premium'))

    expect(mockNavigate).toHaveBeenCalledWith('/auth')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('inicia el checkout y redirige al init_point de MercadoPago', async () => {
    localStorage.setItem('token', 'tok-123')
    localStorage.setItem('user', JSON.stringify({ id: 'user-1', nombre: 'Ana' }))
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ init_point: 'https://www.mercadopago.cl/checkout/abc123' }),
    })

    renderPlanesPremium()
    fireEvent.click(screen.getByText('Actualizar a Premium'))

    await waitFor(() => {
      expect(window.location.href).toBe('https://www.mercadopago.cl/checkout/abc123')
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/subscriptions/checkout'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tok-123' }),
      })
    )
  })

  it('muestra una alerta y no redirige si el backend rechaza el pago', async () => {
    localStorage.setItem('token', 'tok-123')
    localStorage.setItem('user', JSON.stringify({ id: 'user-1', nombre: 'Ana' }))
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Ya tienes una suscripción activa' }),
    })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    renderPlanesPremium()
    fireEvent.click(screen.getByText('Actualizar a Premium'))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Ya tienes una suscripción activa')
    })
    expect(window.location.href).toBe('')

    alertSpy.mockRestore()
  })

  it('muestra una alerta si MercadoPago no devuelve un init_point válido', async () => {
    localStorage.setItem('token', 'tok-123')
    localStorage.setItem('user', JSON.stringify({ id: 'user-1', nombre: 'Ana' }))
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    renderPlanesPremium()
    fireEvent.click(screen.getByText('Actualizar a Premium'))

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Respuesta inválida de MercadoPago')
    })
    expect(window.location.href).toBe('')

    alertSpy.mockRestore()
  })
})
