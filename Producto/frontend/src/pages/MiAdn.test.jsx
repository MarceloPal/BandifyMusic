import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'
import MiAdn from './MiAdn'

// Vector real (no mockeado) para que deriveStats/parseVector se ejecuten de
// verdad — a diferencia de tests/MiAdn.test.jsx, que mockea audioHelpers y
// por lo tanto nunca ejercita la vista del ADN en sí (Simple/Técnico, gate
// Premium, chroma, etc.), solo el flujo de upload/polling.
const DEMO_CON_ANALISIS = {
  id: 'demo-1', nombre: 'Sesión Rock', created_at: '2026-06-01T00:00:00Z',
  s3_key: null, cover_url: null,
  audio_vector: Array(27).fill(0.3), audio_metadata: null,
}

function setUser(overrides = {}) {
  localStorage.setItem('token', 'tok-123')
  localStorage.setItem('user', JSON.stringify({
    id: 'user-1', nombre: 'Ana', es_premium: false, ciudad: 'Santiago', user_tags: ['Rock'], ...overrides,
  }))
}

function renderMiAdn() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <MiAdn />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function mockFetchRoutes(initialDemos) {
  let currentDemos = [...initialDemos]
  return vi.fn((url, options = {}) => {
    const method = options.method || 'GET'
    const deleteMatch = url.match(/\/demos\/([^/?]+)$/)

    if (deleteMatch && method === 'DELETE') {
      currentDemos = currentDemos.filter((d) => d.id !== deleteMatch[1])
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    }
    if (url.includes('/demos') && method === 'GET') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(currentDemos) })
    }
    // Quick Match / Top 3 compatibles — vacío, no es el foco de estos tests
    if (url.includes('/matching/buscar')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
  })
}

describe('MiAdn — vista del ADN musical (repertorio, gate Premium, borrado)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('selecciona automáticamente el primer demo del repertorio y muestra su análisis (vista Simple)', async () => {
    setUser({ es_premium: false })
    global.fetch = mockFetchRoutes([DEMO_CON_ANALISIS])

    renderMiAdn()

    expect(await screen.findByText('Sesión Rock')).toBeInTheDocument()

    // Vista Simple es la vista por defecto — muestra las 4 tarjetas derivadas
    await waitFor(() => {
      expect(screen.getByText('Ritmo')).toBeInTheDocument()
    })
    expect(screen.getByText('Energía')).toBeInTheDocument()
    expect(screen.getByText('Melodía')).toBeInTheDocument()
    expect(screen.getByText('Armonía')).toBeInTheDocument()
  })

  it('bloquea las métricas técnicas con un gate de Premium para cuentas no-Premium', async () => {
    setUser({ es_premium: false })
    global.fetch = mockFetchRoutes([DEMO_CON_ANALISIS])

    renderMiAdn()
    await waitFor(() => expect(screen.getByText('Ritmo')).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText('Cambiar vista'))

    expect(await screen.findByText(/Actualiza a Premium para desbloquear/)).toBeInTheDocument()
  })

  it('un usuario Premium ve las métricas técnicas sin bloqueo', async () => {
    setUser({ es_premium: true })
    global.fetch = mockFetchRoutes([DEMO_CON_ANALISIS])

    renderMiAdn()
    await waitFor(() => expect(screen.getByText('Ritmo')).toBeInTheDocument())

    fireEvent.click(screen.getByLabelText('Cambiar vista'))

    expect(await screen.findByText('Parámetros de audio')).toBeInTheDocument()
    expect(screen.queryByText(/Actualiza a Premium para desbloquear/)).not.toBeInTheDocument()
  })

  it('elimina un demo del repertorio', async () => {
    setUser({ es_premium: false })
    global.fetch = mockFetchRoutes([DEMO_CON_ANALISIS])

    renderMiAdn()
    expect(await screen.findByText('Sesión Rock')).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Eliminar demo'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/demos/demo-1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    await waitFor(() => {
      expect(screen.queryByText('Sesión Rock')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Aún no tienes demos analizados')).toBeInTheDocument()
  })
})
