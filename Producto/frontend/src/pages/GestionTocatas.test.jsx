import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'
import GestionTocatas from './GestionTocatas'

const TOCATA_ACTIVA = {
  id: 't1', nombre: 'Noche de Jazz Vol. 4', estado: 'activo',
  fecha: '2026-08-01', hora: '21:00:00', ciudad: 'Santiago',
  precio: 5000, afiche_url: null, descripcion: 'Una noche épica de jazz en vivo.',
}

function setUser(overrides = {}) {
  localStorage.setItem('token', 'tok-123')
  localStorage.setItem('user', JSON.stringify({ id: 'org-1', nombre: 'DJ Rulo', es_premium: true, ...overrides }))
}

function renderGestion() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <GestionTocatas />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function mockFetchRoutes(tocatas, overrides = {}) {
  return vi.fn((url, options = {}) => {
    const method = options.method || 'GET'
    if (url.includes('/tickets')) {
      return overrides.tickets
        ? overrides.tickets()
        : Promise.resolve({ ok: true, json: () => Promise.resolve({ total_vendidas: 12, recaudacion_clp: 60000 }) })
    }
    if (url.includes('/cancelar') && method === 'PATCH') {
      return overrides.cancelar ? overrides.cancelar() : Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    }
    if (url.includes('/tocatas?organizador_id=')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(tocatas) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
  })
}

describe('GestionTocatas — recaudación y cancelación', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('muestra las entradas vendidas y la recaudación al expandir el detalle', async () => {
    setUser()
    global.fetch = mockFetchRoutes([TOCATA_ACTIVA])

    renderGestion()

    expect(await screen.findByText('Noche de Jazz Vol. 4')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Ver detalle'))

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('$60.000')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Entradas vendidas').length).toBeGreaterThan(0)
    expect(screen.getByText('Recaudado (CLP)')).toBeInTheDocument()

    const ticketsCall = global.fetch.mock.calls.find(([url]) => url.includes('/tocatas/t1/tickets'))
    expect(ticketsCall).toBeTruthy()
  })

  it('indica que un evento de entrada liberada no vende tickets', async () => {
    setUser()
    const tocataLiberada = { ...TOCATA_ACTIVA, id: 't2', nombre: 'Jam Session Libre', precio: null }
    global.fetch = mockFetchRoutes([tocataLiberada])

    renderGestion()
    expect(await screen.findByText('Jam Session Libre')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Ver detalle'))

    expect(screen.getByText('Evento de entrada liberada — sin venta de tickets.')).toBeInTheDocument()
    expect(global.fetch.mock.calls.some(([url]) => url.includes('/tickets'))).toBe(false)
  })

  it('cancela una tocata activa, previa confirmación', async () => {
    setUser()
    global.fetch = mockFetchRoutes([TOCATA_ACTIVA])

    renderGestion()
    expect(await screen.findByText('Noche de Jazz Vol. 4')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancelar'))

    // Modal de confirmación con el nombre del evento
    expect(screen.getByText('¿Cancelar esta tocata?')).toBeInTheDocument()
    expect(screen.getByText('El evento no se eliminará, pero dejará de aparecer en el listado público. Esta acción no se puede deshacer.')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Sí, cancelar'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tocatas/t1/cancelar'),
        expect.objectContaining({ method: 'PATCH' })
      )
    })

    // El modal se cierra tras la cancelación exitosa
    await waitFor(() => {
      expect(screen.queryByText('¿Cancelar esta tocata?')).not.toBeInTheDocument()
    })
  })

  it('cancelar el modal de confirmación no llama al backend', async () => {
    setUser()
    global.fetch = mockFetchRoutes([TOCATA_ACTIVA])

    renderGestion()
    expect(await screen.findByText('Noche de Jazz Vol. 4')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancelar'))
    fireEvent.click(screen.getByText('Volver'))

    expect(screen.queryByText('¿Cancelar esta tocata?')).not.toBeInTheDocument()
    expect(global.fetch.mock.calls.some(([, opts]) => opts?.method === 'PATCH')).toBe(false)
  })
})
