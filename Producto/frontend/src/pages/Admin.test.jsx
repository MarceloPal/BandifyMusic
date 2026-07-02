import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'
import Admin from './Admin'

// Admin lee la pestaña activa vía useOutletContext() (se la pasa AdminLayout
// en la app real). Para probarlo aislado, armamos una ruta mínima que provea
// ese mismo contexto a través de <Outlet context={...}>.
function AdminTestLayout({ activeTab }) {
  return <Outlet context={{ activeTab }} />
}

function renderAdmin(activeTab = 'stats') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/admin" element={<AdminTestLayout activeTab={activeTab} />}>
              <Route index element={<Admin />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const STATS_MOCK = {
  totales: { usuarios: 128, tocatas: 14, tickets: 342 },
  reportes: [
    {
      id: 'rep-1', tipo_contenido: 'perfil', motivo: 'Contenido inapropiado en la bio',
      emisor_nombre: 'Carla', estado: 'pendiente', created_at: '2026-06-01',
    },
  ],
}

const USUARIOS_MOCK = [
  { id: 'u1', nombre: 'Ana Soto', email: 'ana@test.cl', role: 'user', es_premium: false, es_verificado: false, demo_count: 2, ciudad: 'Santiago', foto_url: null },
  { id: 'u2', nombre: 'Beto Ríos', email: 'beto@test.cl', role: 'user', es_premium: true, es_verificado: true, demo_count: 1, ciudad: 'Valparaíso', foto_url: null },
]

function mockFetchRoutes({ noticias = [], anuncios = [] } = {}) {
  let currentNoticias = [...noticias]
  let currentAnuncios = [...anuncios]
  let nextId = 100

  return vi.fn((url, options = {}) => {
    const method = options.method || 'GET'

    if (url.includes('/api/admin/stats')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(STATS_MOCK) })
    }
    if (url.includes('/api/admin/usuarios/') && method === 'DELETE') {
      return Promise.resolve({ ok: true })
    }
    if (url.includes('/api/admin/usuarios') && method === 'GET') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(USUARIOS_MOCK) })
    }
    if (url.includes('/api/admin/reportes/') && method === 'PATCH') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    }
    if (url.includes('/api/noticias/') && method === 'DELETE') {
      const id = url.split('/').pop()
      currentNoticias = currentNoticias.filter((n) => n.id !== id)
      return Promise.resolve({ ok: true })
    }
    if (url.includes('/api/noticias') && method === 'POST') {
      const body = JSON.parse(options.body)
      const created = { id: String(nextId++), created_at: '2026-06-01T00:00:00Z', ...body }
      currentNoticias = [created, ...currentNoticias]
      return Promise.resolve({ ok: true, json: () => Promise.resolve(created) })
    }
    if (url.includes('/api/noticias') && method === 'GET') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(currentNoticias) })
    }
    if (url.includes('/api/admin/notificaciones/') && method === 'DELETE') {
      const id = url.split('/').pop()
      currentAnuncios = currentAnuncios.filter((a) => a.id !== id)
      return Promise.resolve({ ok: true })
    }
    if (url.includes('/api/admin/notificaciones-masivas') && method === 'POST') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    }
    if (url.includes('/api/admin/notificaciones') && method === 'GET') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(currentAnuncios) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
}

describe('Admin — happy path', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'tok-admin')
    localStorage.setItem('user', JSON.stringify({ id: 'admin-1', nombre: 'Root', role: 'admin' }))
  })

  it('carga y muestra las métricas y los reportes pendientes del dashboard', async () => {
    global.fetch = mockFetchRoutes()
    renderAdmin('stats')

    expect(await screen.findByText('128')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getByText('342')).toBeInTheDocument()
    expect(screen.getByText('Contenido inapropiado en la bio')).toBeInTheDocument()
  })

  it('resuelve un reporte pendiente desde el dashboard', async () => {
    global.fetch = mockFetchRoutes()
    renderAdmin('stats')

    fireEvent.click(await screen.findByText('Resolver'))

    await waitFor(() => {
      const patchCall = global.fetch.mock.calls.find(
        ([url, opts]) => url.includes('/api/admin/reportes/rep-1') && opts?.method === 'PATCH'
      )
      expect(patchCall).toBeTruthy()
      expect(JSON.parse(patchCall[1].body)).toEqual({ estado: 'resuelto' })
    })
  })

  it('permite eliminar un usuario, previa confirmación', async () => {
    global.fetch = mockFetchRoutes()
    renderAdmin('usuarios')

    expect(await screen.findByText('Ana Soto')).toBeInTheDocument()

    const filaAna = screen.getByText('Ana Soto').closest('tr')
    fireEvent.click(within(filaAna).getByTitle('Eliminar'))

    // El modal de confirmación bloquea el borrado directo
    expect(screen.getByText('Eliminar usuario')).toBeInTheDocument()
    expect(screen.getByText('Esta acción eliminará al usuario permanentemente de la plataforma.')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Confirmar'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/usuarios/u1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
    await waitFor(() => {
      expect(screen.queryByText('Ana Soto')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Usuario eliminado correctamente')).toBeInTheDocument()
    // El otro usuario no se vio afectado
    expect(screen.getByText('Beto Ríos')).toBeInTheDocument()
  })

  it('cancelar el modal de confirmación no elimina al usuario', async () => {
    global.fetch = mockFetchRoutes()
    renderAdmin('usuarios')

    expect(await screen.findByText('Ana Soto')).toBeInTheDocument()

    const filaAna = screen.getByText('Ana Soto').closest('tr')
    fireEvent.click(within(filaAna).getByTitle('Eliminar'))
    fireEvent.click(screen.getByText('Cancelar'))

    expect(screen.queryByText('Eliminar usuario')).not.toBeInTheDocument()
    expect(screen.getByText('Ana Soto')).toBeInTheDocument()
    expect(global.fetch.mock.calls.some(([, opts]) => opts?.method === 'DELETE')).toBe(false)
  })
})

describe('Admin — Noticias (contenido)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'tok-admin')
    localStorage.setItem('user', JSON.stringify({ id: 'admin-1', nombre: 'Root', role: 'admin' }))
  })

  it('publica una noticia nueva', async () => {
    global.fetch = mockFetchRoutes()
    const { container } = renderAdmin('noticias')

    fireEvent.click(await screen.findByText('Redactar Noticia'))

    const form = container.querySelector('form')
    fireEvent.change(form.querySelector('input[type="text"]'), { target: { value: 'Bandify lanza nueva función' } })
    fireEvent.change(form.querySelector('textarea'), { target: { value: 'Contenido de la noticia de prueba.' } })
    fireEvent.click(screen.getByText('Publicar Noticia'))

    await waitFor(() => {
      expect(screen.getByText('Bandify lanza nueva función')).toBeInTheDocument()
    })
    expect(screen.getByText('Noticia publicada correctamente')).toBeInTheDocument()
    // El editor se cierra tras publicar
    expect(screen.queryByText('Cerrar Editor')).not.toBeInTheDocument()

    const postCall = global.fetch.mock.calls.find(([url, opts]) => url.includes('/api/noticias') && opts?.method === 'POST')
    expect(JSON.parse(postCall[1].body)).toMatchObject({ titulo: 'Bandify lanza nueva función' })
  })

  it('elimina una noticia existente, previa confirmación', async () => {
    global.fetch = mockFetchRoutes({
      noticias: [{ id: 'n1', title: 'Noticia vieja', description: 'desc', urlToImage: null, isLocal: true }],
    })
    renderAdmin('noticias')

    const titulo = await screen.findByText('Noticia vieja')
    const card = titulo.closest('div.flex.gap-4')
    fireEvent.click(within(card).getByRole('button'))

    expect(screen.getByText('Eliminar noticia')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Confirmar'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/noticias/n1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
    expect(screen.queryByText('Noticia vieja')).not.toBeInTheDocument()
  })
})

describe('Admin — Megáfono (notificaciones masivas)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'tok-admin')
    localStorage.setItem('user', JSON.stringify({ id: 'admin-1', nombre: 'Root', role: 'admin' }))
  })

  it('envía un anuncio a TODOS los usuarios cuando no hay ninguno seleccionado', async () => {
    global.fetch = mockFetchRoutes()
    const { container } = renderAdmin('megaphone')

    // El componente arranca mostrando un spinner (loading) hasta que
    // Promise.all([fetchStats, fetchUsuarios]) resuelve — hay que esperar a
    // que la pestaña real se monte antes de tocar el form.
    await screen.findByText('Lanzar Mensaje')
    const form = container.querySelector('form')
    fireEvent.change(form.querySelectorAll('input[type="text"]')[0], { target: { value: 'Mantenimiento programado' } })
    fireEvent.change(form.querySelector('textarea'), { target: { value: 'El sitio estará en mantenimiento el sábado.' } })
    fireEvent.click(screen.getByText('Lanzar Mensaje'))

    // El modal de confirmación deja explícito el alcance masivo
    expect(await screen.findByText('Enviar anuncio masivo')).toBeInTheDocument()
    expect(screen.getByText(/TODOS los usuarios de la plataforma/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Confirmar'))

    await waitFor(() => {
      const postCall = global.fetch.mock.calls.find(
        ([url, opts]) => url.includes('/api/admin/notificaciones-masivas') && opts?.method === 'POST'
      )
      expect(postCall).toBeTruthy()
      const body = JSON.parse(postCall[1].body)
      expect(body.titulo).toBe('Mantenimiento programado')
      expect(body.usuario_ids).toBeNull()
    })
    expect(await screen.findByText('¡Mensaje enviado con éxito!')).toBeInTheDocument()
  })

  it('envía un anuncio segmentado solo a los usuarios seleccionados', async () => {
    global.fetch = mockFetchRoutes()
    const { container } = renderAdmin('megaphone')

    // Seleccionar un usuario de la lista central
    const checkbox = await screen.findByText('Ana Soto')
    fireEvent.click(checkbox.closest('[role="checkbox"]'))
    expect(screen.getByText('Enviando a 1 seleccionados')).toBeInTheDocument()

    const form = container.querySelector('form')
    fireEvent.change(form.querySelectorAll('input[type="text"]')[0], { target: { value: 'Aviso para ti' } })
    fireEvent.change(form.querySelector('textarea'), { target: { value: 'Mensaje segmentado de prueba.' } })
    fireEvent.click(screen.getByText('Lanzar Mensaje'))

    expect(await screen.findByText('Enviar anuncio segmentado')).toBeInTheDocument()
    expect(screen.getByText(/1 usuarios seleccionados/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Confirmar'))

    await waitFor(() => {
      const postCall = global.fetch.mock.calls.find(
        ([url, opts]) => url.includes('/api/admin/notificaciones-masivas') && opts?.method === 'POST'
      )
      expect(JSON.parse(postCall[1].body).usuario_ids).toEqual(['u1'])
    })
  })

  it('elimina un anuncio del historial, previa confirmación', async () => {
    global.fetch = mockFetchRoutes({
      anuncios: [{ id: 'a1', titulo: 'Anuncio viejo', descripcion: 'desc', destinatarios: 50, created_at: '2026-06-01' }],
    })
    renderAdmin('megaphone')

    expect(await screen.findByText('Anuncio viejo')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Eliminar anuncio'))

    expect(screen.getByText('Eliminar anuncio')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Confirmar'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/notificaciones/a1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
    expect(screen.queryByText('Anuncio viejo')).not.toBeInTheDocument()
  })
})
