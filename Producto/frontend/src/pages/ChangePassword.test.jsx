import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import ChangePassword from './ChangePassword'

// Mismo motivo que en Auth.test.jsx: SoftAurora usa WebGL (ogl) y jsdom no lo
// implementa — revienta el árbol si se renderiza tal cual.
vi.mock('../components/SoftAurora', () => ({ default: () => null }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderChangePassword() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ChangePassword />
      </AuthProvider>
    </MemoryRouter>
  )
}

function avanzarAlPaso2(container, actual = 'clave-actual-123') {
  fireEvent.change(container.querySelector('input[type="password"]'), { target: { value: actual } })
  fireEvent.click(screen.getByText('Continuar'))
}

describe('ChangePassword — cambio de contraseña', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('token', 'tok-123')
    localStorage.setItem('user', JSON.stringify({ id: 'user-1', nombre: 'Ana' }))
    mockNavigate.mockClear()
  })

  it('cambia la contraseña exitosamente y permite volver a Configuración', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })

    const { container } = renderChangePassword()
    avanzarAlPaso2(container)

    const [nueva, confirmar] = container.querySelectorAll('input[type="password"]')
    fireEvent.change(nueva, { target: { value: 'clave-nueva-123' } })
    fireEvent.change(confirmar, { target: { value: 'clave-nueva-123' } })
    fireEvent.click(screen.getByText('Guardar cambios'))

    expect(await screen.findByText('¡Solicitud exitosa!')).toBeInTheDocument()

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/usuarios/cambiar-password'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({ Authorization: 'Bearer tok-123' }),
        body: JSON.stringify({ passwordActual: 'clave-actual-123', passwordNueva: 'clave-nueva-123' }),
      })
    )

    fireEvent.click(screen.getByText('Volver a Configuración'))
    expect(mockNavigate).toHaveBeenCalledWith('/settings')
  })

  it('muestra un error si las contraseñas nuevas no coinciden (sin llamar al backend)', async () => {
    global.fetch = vi.fn()
    const { container } = renderChangePassword()
    avanzarAlPaso2(container)

    const [nueva, confirmar] = container.querySelectorAll('input[type="password"]')
    fireEvent.change(nueva, { target: { value: 'clave-nueva-123' } })
    fireEvent.change(confirmar, { target: { value: 'otra-clave-456' } })
    fireEvent.click(screen.getByText('Guardar cambios'))

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('muestra un error si la nueva contraseña tiene menos de 8 caracteres', async () => {
    global.fetch = vi.fn()
    const { container } = renderChangePassword()
    avanzarAlPaso2(container)

    const [nueva, confirmar] = container.querySelectorAll('input[type="password"]')
    fireEvent.change(nueva, { target: { value: 'corta1' } })
    fireEvent.change(confirmar, { target: { value: 'corta1' } })
    fireEvent.click(screen.getByText('Guardar cambios'))

    expect(await screen.findByText('La nueva contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('muestra el error del backend si la contraseña actual es incorrecta', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'La contraseña actual no es correcta.' }),
    })

    const { container } = renderChangePassword()
    avanzarAlPaso2(container, 'clave-incorrecta')

    const [nueva, confirmar] = container.querySelectorAll('input[type="password"]')
    fireEvent.change(nueva, { target: { value: 'clave-nueva-123' } })
    fireEvent.change(confirmar, { target: { value: 'clave-nueva-123' } })
    fireEvent.click(screen.getByText('Guardar cambios'))

    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeInTheDocument()
    expect(screen.queryByText('¡Solicitud exitosa!')).not.toBeInTheDocument()
  })
})
