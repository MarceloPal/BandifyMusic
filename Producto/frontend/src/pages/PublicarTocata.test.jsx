import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
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

function renderPublicarTocataEdit(tocataId = 'tocata-9') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/tocatas/editar/${tocataId}`]}>
        <AuthProvider>
          <Routes>
            <Route path="/tocatas/editar/:id" element={<PublicarTocata />} />
          </Routes>
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

const TOCATA_EXISTENTE = {
  id: 'tocata-9', nombre: 'Festival Indie Rock', fecha: '2026-09-15', hora: '20:00:00',
  ciudad: 'Valparaíso', direccion: 'Plaza Victoria', descripcion: 'Un festival único.',
  genero: 'Indie, Rock', afiche_url: null,
  contacto_email: 'contacto@festival.com', edad_minima: '+18',
  tipos_entrada: [{ tipo: 'General', precio: 8000, cantidad: 200 }],
}

describe('PublicarTocata — modo edición', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'tok-123')
    localStorage.setItem('user', JSON.stringify({ id: 'user-1', nombre: 'Ana', email: 'ana@test.cl' }))
    mockNavigate.mockClear()
  })

  it('precarga el formulario con los datos de la tocata existente', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/tocatas/tocata-9')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(TOCATA_EXISTENTE) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { container } = renderPublicarTocataEdit()

    expect(await screen.findByText('Editar tocata')).toBeInTheDocument()
    await waitFor(() => {
      expect(container.querySelector('#nombre').value).toBe('Festival Indie Rock')
    })
    expect(container.querySelector('#fecha').value).toBe('2026-09-15')
    expect(container.querySelector('#hora').value).toBe('20:00')
    expect(container.querySelector('#ciudad').value).toBe('Valparaíso')
    expect(container.querySelector('#direccion').value).toBe('Plaza Victoria')
    expect(container.querySelector('#contacto').value).toBe('contacto@festival.com')

    // Ya venía con tipos_entrada → precarga como evento pagado
    expect(screen.getByText('Venta de entradas').closest('button')).toHaveClass('border-purple-500/70')
    expect(container.querySelector('input[type="number"]').value).toBe('200')

    expect(screen.getByText('Guardar cambios')).toBeInTheDocument()
  })

  it('guarda los cambios de una tocata existente (PATCH, no POST)', async () => {
    global.fetch = vi.fn((url, options = {}) => {
      if (url.includes('/tocatas/tocata-9') && (options.method || 'GET') === 'GET') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(TOCATA_EXISTENTE) })
      }
      if (url.includes('/tocatas/tocata-9') && options.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'tocata-9' }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { container } = renderPublicarTocataEdit()
    await waitFor(() => {
      expect(container.querySelector('#nombre').value).toBe('Festival Indie Rock')
    })

    fireEvent.change(container.querySelector('#nombre'), { target: { value: 'Festival Indie Rock 2026' } })
    fireEvent.click(container.querySelector('button[type="submit"]'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/gestion')
    })

    const patchCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes('/tocatas/tocata-9') && opts?.method === 'PATCH'
    )
    expect(patchCall).toBeTruthy()
    const body = JSON.parse(patchCall[1].body)
    expect(body.nombre).toBe('Festival Indie Rock 2026')
    expect(body.tipos_entrada).toEqual([{ tipo: 'General', precio: 8000, cantidad: 200 }])

    // No debe haber creado una tocata nueva
    expect(global.fetch.mock.calls.some(([u, o]) => u.endsWith('/tocatas') && o?.method === 'POST')).toBe(false)
  })
})
