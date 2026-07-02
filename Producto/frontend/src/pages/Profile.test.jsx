import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'
import Profile from './Profile'

const BASE_USER = {
  id: 'user-1', nombre: 'Ana', email: 'ana@test.cl',
  ciudad: 'Santiago', oficio: ['Vocalista'], user_tags: ['Rock'],
  audio_vector: Array(27).fill(0.3), audio_metadata: null,
  s3_key: null, foto_url: null, banner_url: null, bio: null,
}

function setLoggedInUser(overrides = {}) {
  localStorage.setItem('token', 'tok-123')
  localStorage.setItem('user', JSON.stringify({ ...BASE_USER, ...overrides }))
}

function mockFetchRoutes(overrides = {}) {
  return vi.fn((url, options = {}) => {
    const method = options.method || 'GET'

    if (url.includes('/usuarios/perfil') && method === 'GET') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(BASE_USER) })
    }
    if (url.includes('/usuarios/perfil') && method === 'PUT') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    }
    if (url.includes('/images/upload-url')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ uploadUrl: 'https://s3.mock/put', key: 'avatars/user-1.jpg' }),
      })
    }
    if (url === 'https://s3.mock/put') {
      return Promise.resolve({ ok: true })
    }
    if (overrides[url]) return overrides[url]()
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
}

function renderProfile() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <Profile />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Profile — happy path (perfil propio)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('muestra el ADN musical y los datos del perfil propio', async () => {
    setLoggedInUser()
    global.fetch = mockFetchRoutes()

    renderProfile()

    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('#Vocalista')).toBeInTheDocument()
    expect(screen.getByText('#Rock')).toBeInTheDocument()
    expect(screen.getByText('Santiago')).toBeInTheDocument()

    // stats derivados del audio_vector (sidebar "Tu ADN en cifras")
    expect(screen.getByText('BPM')).toBeInTheDocument()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/usuarios/perfil'),
        expect.objectContaining({ headers: { Authorization: 'Bearer tok-123' } })
      )
    })
  })

  it('permite editar y guardar la biografía', async () => {
    setLoggedInUser({ bio: null })
    global.fetch = mockFetchRoutes()

    renderProfile()

    // Espera a que termine el sync de perfil que dispara useOwnProfileSync al
    // montar — si no, su updateUser() puede resolver después del guardado de
    // bio y pisarlo con los datos viejos (condición de carrera del mock, no
    // de la app real: en uso real este sync siempre termina segundos antes
    // de que un humano llegue a escribir y guardar).
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/usuarios/perfil'),
        expect.objectContaining({ headers: { Authorization: 'Bearer tok-123' } })
      )
    })

    fireEvent.click(screen.getByText('Biografía'))
    fireEvent.click(screen.getByText('Agregar'))

    const textarea = screen.getByPlaceholderText('Cuéntanos sobre tu música y lo que buscas...')
    fireEvent.change(textarea, { target: { value: 'Bajista buscando banda de rock alternativo.' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() => {
      const putCall = global.fetch.mock.calls.find(
        ([url, opts]) => url.includes('/usuarios/perfil') && opts?.method === 'PUT'
      )
      expect(putCall).toBeTruthy()
      expect(JSON.parse(putCall[1].body)).toEqual({ bio: 'Bajista buscando banda de rock alternativo.' })
    })

    // Sale del modo edición y muestra el texto guardado
    await waitFor(() => {
      expect(screen.getByText('Bajista buscando banda de rock alternativo.')).toBeInTheDocument()
    })
  })

  it('permite subir una nueva foto de perfil', async () => {
    setLoggedInUser({ foto_url: null })
    global.fetch = mockFetchRoutes()
    const { container } = renderProfile()

    const file = new File(['contenido'], 'avatar.png', { type: 'image/png' })
    const avatarInput = container.querySelector('input[type="file"]')
    fireEvent.change(avatarInput, { target: { files: [file] } })

    await waitFor(() => {
      const putCall = global.fetch.mock.calls.find(
        ([url, opts]) => url.includes('/usuarios/perfil') && opts?.method === 'PUT'
          && JSON.parse(opts.body).foto_url
      )
      expect(putCall).toBeTruthy()
      expect(JSON.parse(putCall[1].body)).toEqual({ foto_url: 'avatars/user-1.jpg' })
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/images/upload-url?type=avatar&ext=png'),
      expect.objectContaining({ headers: { Authorization: 'Bearer tok-123' } })
    )
  })
})

const PERFIL_PUBLICO = {
  id: 'user-2', nombre: 'Carla Ríos', email: 'carla@test.cl',
  ciudad: 'Valparaíso', oficio: ['Bajista'], user_tags: ['Jazz'],
  bio: 'Bajista de jazz buscando banda.', s3_key: null, foto_url: null,
  banner_url: null, audio_vector: null, es_premium: false,
  instagram_url: null, spotify_url: null, discord_url: null,
}

function renderProfilePublico(username = 'carla_rios') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/u/${username}`]}>
        <AuthProvider>
          <Routes>
            <Route path="/u/:username" element={<Profile />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Profile — perfil público (visitando a otro músico)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('muestra el perfil público y ofrece iniciar sesión para contactar (visitante sin cuenta)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(PERFIL_PUBLICO) })

    renderProfilePublico()

    expect(await screen.findByText('Carla Ríos')).toBeInTheDocument()
    expect(screen.getByText('#Bajista')).toBeInTheDocument()
    expect(screen.getByText('Valparaíso')).toBeInTheDocument()

    // Sin sesión: no puede editar ni enviar mensaje directo
    expect(screen.queryByText('Editar perfil')).not.toBeInTheDocument()
    expect(screen.getByText('Inicia sesión para contactar')).toBeInTheDocument()

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/usuarios/publico/carla_rios'),
    )
  })

  it('muestra "Enviar mensaje" en vez del login cuando el visitante ya tiene sesión', async () => {
    localStorage.setItem('token', 'tok-visitante')
    localStorage.setItem('user', JSON.stringify({ id: 'visitor-1', nombre: 'Visitante' }))
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(PERFIL_PUBLICO) })

    renderProfilePublico()

    expect(await screen.findByText('Carla Ríos')).toBeInTheDocument()
    // "Enviar mensaje" aparece tanto en el CTA del hero como en el widget
    // de Acciones de la sidebar — ambos son válidos, basta con que exista.
    expect(screen.getAllByText('Enviar mensaje').length).toBeGreaterThan(0)
    expect(screen.queryByText('Inicia sesión para contactar')).not.toBeInTheDocument()
    expect(screen.queryByText('Editar perfil')).not.toBeInTheDocument()
  })

  it('muestra "Usuario no encontrado" si el perfil público no existe', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) })

    renderProfilePublico('no-existe')

    expect(await screen.findByText('Usuario no encontrado')).toBeInTheDocument()
    expect(screen.getByText(/no-existe/)).toBeInTheDocument()
  })
})
