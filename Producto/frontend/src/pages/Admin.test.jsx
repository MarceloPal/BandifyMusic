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

function mockFetchRoutes() {
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
