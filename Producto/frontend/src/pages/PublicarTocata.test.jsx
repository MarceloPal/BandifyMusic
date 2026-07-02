import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'
import PublicarTocata from './PublicarTocata'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPublicarTocata() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <PublicarTocata />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function fillCamposBasicos() {
  // Los labels obligatorios incluyen un "*" (aria-hidden, pero sigue siendo
  // parte del textContent) → match por regex en vez de texto exacto.
  fireEvent.change(screen.getByLabelText(/Nombre del evento/), { target: { value: 'Noche de Jazz Vol. 4' } })
  fireEvent.change(screen.getByLabelText(/^Fecha/), { target: { value: '2026-08-01' } })
  fireEvent.change(screen.getByLabelText(/^Hora/), { target: { value: '21:00' } })
  fireEvent.change(screen.getByLabelText(/^Ciudad/), { target: { value: 'Santiago' } })
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'contacto@evento.com' } })
  fireEvent.click(screen.getByText('Todo público'))
}

describe('PublicarTocata — happy path', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'tok-123')
    localStorage.setItem('user', JSON.stringify({ id: 'user-1', nombre: 'Ana', email: 'ana@test.cl' }))
    mockNavigate.mockClear()
  })

  it('publica un evento gratuito con los campos obligatorios completos', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      if (url.includes('/tocatas') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'tocata-1', nombre: 'Noche de Jazz Vol. 4' }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { container } = renderPublicarTocata()

    fillCamposBasicos()
    fireEvent.click(screen.getByText('Evento gratuito'))

    fireEvent.click(container.querySelector('button[type="submit"]'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/tocatas', { state: { createdId: 'tocata-1' } })
    })

    const [, postCall] = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes('/tocatas') && opts?.method === 'POST'
    )
    const body = JSON.parse(postCall.body)
    expect(body.nombre).toBe('Noche de Jazz Vol. 4')
    expect(body.ciudad).toBe('Santiago')
    expect(body.edad_minima).toBe('todo_publico')
    expect(body.tipos_entrada).toBeUndefined()
    expect(body.precio).toBeUndefined()
  })

  it('publica un evento pagado definiendo precio y stock de un tipo de entrada', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      if (url.includes('/tocatas') && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'tocata-2', nombre: 'Noche de Jazz Vol. 4' }),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { container } = renderPublicarTocata()

    fillCamposBasicos()
    fireEvent.click(screen.getByText('Venta de entradas'))
    fireEvent.click(screen.getByText('General'))

    fireEvent.change(container.querySelector('input[type="text"][inputmode="numeric"]'), {
      target: { value: '6000' },
    })
    fireEvent.change(container.querySelector('input[type="number"]'), {
      target: { value: '100' },
    })

    fireEvent.click(container.querySelector('button[type="submit"]'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/tocatas', { state: { createdId: 'tocata-2' } })
    })

    const [, postCall] = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes('/tocatas') && opts?.method === 'POST'
    )
    const body = JSON.parse(postCall.body)
    expect(body.tipos_entrada).toEqual([{ tipo: 'General', precio: 6000, cantidad: 100 }])
    expect(body.precio).toBe(6000)
    expect(body.cantidad_disponible).toBe(100)
  })

  it('no publica si faltan campos obligatorios y muestra los errores', async () => {
    global.fetch = vi.fn()
    const { container } = renderPublicarTocata()

    fireEvent.click(container.querySelector('button[type="submit"]'))

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(global.fetch).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
