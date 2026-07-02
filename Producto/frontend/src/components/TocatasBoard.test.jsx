import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'
import TocatasBoard from './TocatasBoard'

const TOCATA_AJENA = {
  id: 't1', nombre: 'Noche de Jazz Vol. 4', organizador_id: 'org-1', organizador_nombre: 'DJ Rulo',
  precio: 5000, cantidad_disponible: 50, fecha: '2026-08-01', ciudad: 'Santiago',
  direccion: null, genero: 'Jazz', afiche_url: null,
}

function setUser(overrides = {}) {
  localStorage.setItem('token', 'tok-123')
  localStorage.setItem('user', JSON.stringify({ id: 'user-1', nombre: 'Ana', es_premium: false, ...overrides }))
}

function renderBoard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <TocatasBoard />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function mockFetchRoutes(tocatas, overrides = {}) {
  return vi.fn((url, options = {}) => {
    const method = options.method || 'GET'
    if (url.includes('/tocatas/') && url.includes('/checkout') && method === 'POST') {
      return overrides.checkout
        ? overrides.checkout()
        : Promise.resolve({ ok: true, json: () => Promise.resolve({ init_point: 'https://www.mercadopago.cl/checkout/xyz' }) })
    }
    if (url.match(/\/tocatas\/[^/]+$/) && method === 'DELETE') {
      return overrides.delete ? overrides.delete() : Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    }
    if (url.includes('/tocatas?')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(tocatas) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
  })
}

// El nombre de la tocata aparece tanto en el hero slider (h2) como en la
// tarjeta clickeable (button) — hay que apuntar específicamente a esta última.
async function abrirTocata(nombre) {
  const matches = await screen.findAllByText(nombre)
  const cardButton = matches.map((el) => el.closest('button')).find(Boolean)
  fireEvent.click(cardButton)
}

describe('TocatasBoard — compra de entradas y gestión (dinero real)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('compra entradas de una tocata ajena y abre el checkout de MercadoPago', async () => {
    setUser({ id: 'user-1' })
    global.fetch = mockFetchRoutes([TOCATA_AJENA])
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {})

    renderBoard()

    await abrirTocata('Noche de Jazz Vol. 4')

    // A cantidad=1 el precio unitario y el total coinciden ($5.000 en ambos),
    // así que no se puede afirmar un valor único hasta cambiar la cantidad.
    expect(screen.getByText('Precio por entrada')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // cantidad inicial

    fireEvent.click(screen.getByText('+'))
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('$10.000')).toBeInTheDocument() // total = precio * cantidad

    fireEvent.click(screen.getByText('Pagar con MercadoPago'))

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith('https://www.mercadopago.cl/checkout/xyz', '_blank', 'noopener,noreferrer')
    })

    const checkoutCall = global.fetch.mock.calls.find(([url]) => url.includes('/tocatas/t1/checkout'))
    expect(JSON.parse(checkoutCall[1].body)).toEqual({ cantidad: 2 })
  })

  it('muestra un error inline (sin bloquear el modal) si el checkout falla', async () => {
    setUser({ id: 'user-1' })
    global.fetch = mockFetchRoutes([TOCATA_AJENA], {
      checkout: () => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Sin stock disponible' }) }),
    })
    vi.spyOn(window, 'open').mockImplementation(() => {})

    renderBoard()
    await abrirTocata('Noche de Jazz Vol. 4')
    fireEvent.click(screen.getByText('Pagar con MercadoPago'))

    expect(await screen.findByText('Sin stock disponible')).toBeInTheDocument()
    expect(window.open).not.toHaveBeenCalled()
    // El modal sigue abierto y se puede reintentar
    expect(screen.getByText('Pagar con MercadoPago')).toBeInTheDocument()
  })

  it('el organizador puede eliminar su propia tocata (acción destructiva con confirmación)', async () => {
    setUser({ id: 'org-1' }) // mismo id que organizador_id de la tocata
    global.fetch = mockFetchRoutes([TOCATA_AJENA])

    renderBoard()
    await abrirTocata('Noche de Jazz Vol. 4')

    // Como es el organizador, no ve el botón de compra sino el de eliminar
    expect(screen.queryByText('Pagar con MercadoPago')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Eliminar tocata'))

    expect(screen.getByText('¿Eliminar esta tocata?')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Sí, eliminar'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tocatas/t1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    // El modal se cierra tras el borrado exitoso
    await waitFor(() => {
      expect(screen.queryByText('¿Eliminar esta tocata?')).not.toBeInTheDocument()
    })
  })
})
