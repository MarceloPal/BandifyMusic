import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'
import Onboarding from './Onboarding'

// Mismo motivo que en Auth.test.jsx: SoftAurora usa WebGL (ogl) y jsdom no lo
// implementa — revienta el árbol si se renderiza tal cual.
vi.mock('../components/SoftAurora', () => ({ default: () => null }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderOnboarding() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <Onboarding />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function mockFetchRoutes() {
  return vi.fn((url, options = {}) => {
    const method = options.method || 'GET'

    if (url.includes('/audio/upload-url')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ uploadUrl: 'https://s3.mock/put', s3Key: 'demos/test.mp3' }),
      })
    }
    if (url === 'https://s3.mock/put') {
      return Promise.resolve({ ok: true })
    }
    if (url.includes('/audio/analyze')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ jobId: 'job-1' }) })
    }
    if (url.includes('/audio/jobs/')) {
      // Primer (y único) poll ya vuelve 'done' — no hace falta simular el
      // intervalo de refetch de 5s para probar el happy path.
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: 'done',
          vector: [0.1],
          metadata: { tempo: 120 },
          mp3_s3_key: 'demos/test.mp3',
        }),
      })
    }
    if (url.includes('/usuarios/perfil') && method === 'GET') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'user-1', nombre: 'Ana', ciudad: 'Santiago',
          oficio: ['Músico'], user_tags: ['Rock'],
        }),
      })
    }
    if (url.includes('/usuarios/perfil') && method === 'PUT') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'user-1', nombre: 'Ana', ciudad: 'Santiago',
          oficio: ['Músico'], user_tags: ['Rock'],
        }),
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
}

describe('Onboarding — happy path', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'tok-123')
    localStorage.setItem('user', JSON.stringify({ id: 'user-1', nombre: 'Ana' }))
    mockNavigate.mockClear()
  })

  it('recorre los 4 pasos, sube un demo, espera el análisis IA y finaliza el onboarding', async () => {
    global.fetch = mockFetchRoutes()
    const { container } = renderOnboarding()

    // Paso 1 — Ciudad
    expect(screen.getByText('¿Desde dónde tocas?')).toBeInTheDocument()
    fireEvent.change(container.querySelector('select'), { target: { value: 'Santiago' } })
    fireEvent.click(screen.getByText('Continuar'))

    // Paso 2 — Rol / oficio
    expect(screen.getByText('¿Cuál es tu rol?')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Músico'))
    fireEvent.click(screen.getByText('Continuar'))

    // Paso 3 — Estilo musical
    expect(screen.getByText('Estilo Musical')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Rock'))
    fireEvent.click(screen.getByText('Continuar'))

    // Paso 4 — Sube el demo (input de archivo oculto tras el dropzone)
    expect(screen.getByText('Sube tu demo')).toBeInTheDocument()
    const file = new File(['contenido-de-audio'], 'demo.mp3', { type: 'audio/mpeg' })
    const fileInput = container.querySelector('input[type="file"]')
    fireEvent.change(fileInput, { target: { files: [file] } })

    // Pipeline completo: upload-url → PUT a S3 → analyze → poll de jobs → 'done'
    await waitFor(() => {
      expect(screen.getByText('¡Análisis completado!')).toBeInTheDocument()
    })

    // El botón "Finalizar" se habilita recién cuando el análisis terminó
    const finalizarBtn = screen.getByText('Finalizar')
    expect(finalizarBtn).not.toBeDisabled()
    fireEvent.click(finalizarBtn)

    // saveAndFinish(): persiste ciudad/oficio/tags y navega al dashboard
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/mi-adn')
    })

    const putCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes('/usuarios/perfil') && opts?.method === 'PUT'
    )
    expect(putCall).toBeTruthy()
    const putBody = JSON.parse(putCall[1].body)
    expect(putBody).toEqual({ ciudad: 'Santiago', oficio: ['Músico'], user_tags: ['Rock'] })
  })

  it('permite omitir la subida del demo y finalizar igual', async () => {
    global.fetch = mockFetchRoutes()
    renderOnboarding()

    fireEvent.click(screen.getByText('Continuar')) // paso 1 → 2 (sin elegir ciudad)
    fireEvent.click(screen.getByText('Continuar')) // paso 2 → 3 (sin elegir oficio)
    fireEvent.click(screen.getByText('Continuar')) // paso 3 → 4 (sin elegir tags)

    fireEvent.click(screen.getByText('Omitir este paso por ahora'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/mi-adn')
    })
  })
})
