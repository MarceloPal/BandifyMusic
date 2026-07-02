import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'
import Explore from './Explore'

const MUSICOS_MOCK = [
  {
    id: 'm1', nombre: 'Carla Rojas', compatibilidad: 91, foto_url: null,
    ciudad: 'Santiago', oficio: ['Vocalista'], user_tags: ['Rock'],
    shared_tags: ['Rock'], bio: 'Vocalista de rock alternativo.', experiencia: 4,
  },
  {
    id: 'm2', nombre: 'Diego Soto', compatibilidad: 78, foto_url: null,
    ciudad: 'Valparaíso', oficio: ['Bajista'], user_tags: ['Indie'],
    shared_tags: [], bio: null, experiencia: 2,
  },
]

function setLoggedInUser(overrides = {}) {
  localStorage.setItem('token', 'tok-123')
  localStorage.setItem('user', JSON.stringify({
    id: 'user-1', nombre: 'Ana', es_premium: true,
    audio_vector: null, user_tags: [], ciudad: '',
    ...overrides,
  }))
}

function renderExplore() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <Explore />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Explore — happy path', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('usuario sin demo analizado ve el CTA y, al buscar, obtiene resultados', async () => {
    setLoggedInUser({ audio_vector: null })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MUSICOS_MOCK),
    })

    renderExplore()

    expect(screen.getByText('¿Quieres buscar tus colaboradores?')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Descubrir músicos'))

    await waitFor(() => {
      expect(screen.getByText('Carla Rojas')).toBeInTheDocument()
    })
    expect(screen.getByText('Diego Soto')).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/matching/buscar'),
      expect.objectContaining({ headers: { Authorization: 'Bearer tok-123' } })
    )
  })

  it('usuario con demo ya analizado busca automáticamente al entrar (sin click)', async () => {
    setLoggedInUser({ audio_vector: [0.1, 0.2, 0.3] })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MUSICOS_MOCK),
    })

    renderExplore()

    expect(screen.queryByText('¿Quieres buscar tus colaboradores?')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Carla Rojas')).toBeInTheDocument()
    })
  })

  it('bloquea el filtro por género para cuentas no-Premium (regla de monetización)', async () => {
    setLoggedInUser({ audio_vector: [0.1], es_premium: false })
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MUSICOS_MOCK),
    })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    renderExplore()
    await waitFor(() => expect(screen.getByText('Carla Rojas')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Filtros'))
    // "Rock" también aparece como chip de contexto dentro de MusicianCard —
    // se acota al botón de filtro (el chip de la card es un <span>, no <button>).
    fireEvent.click(screen.getByRole('button', { name: 'Rock' }))

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('Plan Premium')
    )
    // El tag NO debe haberse agregado como filtro activo
    expect(screen.queryByText('Filtros activos:')).not.toBeInTheDocument()

    alertSpy.mockRestore()
  })
})
