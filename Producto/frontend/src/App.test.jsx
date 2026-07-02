import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import App from './App'

// SoftAurora usa WebGL (via `ogl`) para el fondo animado de Auth/Landing —
// jsdom no implementa WebGL, así que revienta el árbol si se renderiza tal
// cual. Mismo mock que en Auth.test.jsx.
vi.mock('./components/SoftAurora', () => ({ default: () => null }))

function renderApp(initialRoute) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function setUser(overrides = {}) {
  localStorage.setItem('token', 'tok-123')
  localStorage.setItem('user', JSON.stringify({ id: 'user-1', nombre: 'Ana', ...overrides }))
}

// Cubre las llamadas de fondo que disparan MainLayout (sync de perfil),
// TopNavbar (notificaciones), Admin (stats/usuarios) y Landing (noticias),
// para que cualquier ruta a la que el guard nos lleve renderice sin errores.
function mockFetchRoutes() {
  return vi.fn((url) => {
    if (url.includes('/api/admin/stats')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ totales: { usuarios: 10, tocatas: 2, tickets: 5 }, reportes: [] }),
      })
    }
    if (url.includes('/api/admin/usuarios')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    }
    if (url.includes('/api/noticias')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ articles: [] }) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
  })
}

describe('App — guards de rutas privadas y de admin', () => {
  beforeEach(() => {
    localStorage.clear()
    global.fetch = mockFetchRoutes()
  })

  it('redirige a /auth si no hay token y se intenta acceder a una ruta privada', async () => {
    renderApp('/mi-adn')

    // Vista de registro de Auth.jsx (placeholder único del campo de usuario)
    expect(await screen.findByPlaceholderText('janesmithmusic')).toBeInTheDocument()
  })

  it('permite el acceso normal a una ruta privada para un usuario con rol "user"', async () => {
    setUser({ role: 'user' })
    renderApp('/explore')

    expect(await screen.findByText('Explorar Colaboradores')).toBeInTheDocument()
  })

  it('redirige a "/" si un usuario con rol "user" intenta entrar a /admin', async () => {
    setUser({ role: 'user' })
    renderApp('/admin')

    // Contenido único de Landing (home) — confirma que NO se quedó en /admin
    expect(await screen.findByText('La escena musical chilena')).toBeInTheDocument()
  })

  it('permite el acceso a /admin para un usuario con rol "admin"', async () => {
    setUser({ role: 'admin' })
    renderApp('/admin')

    expect(await screen.findByText('Bandify Admin')).toBeInTheDocument()
    expect(await screen.findByText('Total Usuarios')).toBeInTheDocument()
  })

  it('redirige a /admin si un usuario con rol "admin" intenta entrar a una ruta privada de usuario', async () => {
    setUser({ role: 'admin' })
    renderApp('/mi-adn')

    expect(await screen.findByText('Bandify Admin')).toBeInTheDocument()
    expect(screen.queryByText('Explorar Colaboradores')).not.toBeInTheDocument()
  })
})
