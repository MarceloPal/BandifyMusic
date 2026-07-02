import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'
import Settings from './Settings'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderSettings() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <Settings />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Settings', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
  })

  it('muestra el título "Configuración de la cuenta"', () => {
    renderSettings()
    expect(screen.getByText('Configuración de la cuenta')).toBeInTheDocument()
  })

  it('muestra las secciones de navegación', () => {
    renderSettings()
    expect(screen.getAllByText('Perfil').length).toBeGreaterThan(0)
    expect(screen.getByText('Notificaciones')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Contraseña')).toBeInTheDocument()
    expect(screen.getByText('Seguridad')).toBeInTheDocument()
    expect(screen.getByText('Suscripción')).toBeInTheDocument()
  })

  it('por defecto muestra el panel de Perfil', () => {
    renderSettings()
    expect(screen.getByText('Información pública de tu cuenta.')).toBeInTheDocument()
  })

  it('cambia al panel de Notificaciones al hacer clic en el ítem de nav', () => {
    renderSettings()
    fireEvent.click(screen.getByText('Notificaciones'))
    expect(screen.getByText('Elige qué alertas quieres recibir.')).toBeInTheDocument()
    expect(screen.getByText('Mensajes directos')).toBeInTheDocument()
    expect(screen.getByText('Novedades de Bandify')).toBeInTheDocument()
    expect(screen.getByText('Ofertas de eventos y tocatas')).toBeInTheDocument()
    expect(screen.getByText('Boletines de noticias')).toBeInTheDocument()
    expect(screen.getByText('Actualizaciones promocionales')).toBeInTheDocument()
  })

  it('Toggle individual cambia de estado al hacer clic', () => {
    renderSettings()
    fireEvent.click(screen.getByText('Notificaciones'))
    const switches = screen.getAllByRole('switch')
    const mensajesToggle = switches[1] // [0] = maestro, [1] = Mensajes directos
    expect(mensajesToggle).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(mensajesToggle)
    expect(mensajesToggle).toHaveAttribute('aria-checked', 'true')
  })

  it('el toggle maestro activa todas las notificaciones', () => {
    renderSettings()
    fireEvent.click(screen.getByText('Notificaciones'))
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[0])
    switches.forEach((sw) => expect(sw).toHaveAttribute('aria-checked', 'true'))
  })

  it('cambia al panel de Seguridad y muestra la zona de peligro', () => {
    renderSettings()
    fireEvent.click(screen.getByText('Seguridad'))
    expect(screen.getByText('Zona de peligro')).toBeInTheDocument()
    expect(screen.getByText('Eliminar mi cuenta')).toBeInTheDocument()
  })

  it('botón Eliminar mi cuenta muestra confirmación antes de borrar', () => {
    renderSettings()
    fireEvent.click(screen.getByText('Seguridad'))
    fireEvent.click(screen.getByText('Eliminar mi cuenta'))
    expect(screen.getByText(/Esta acción eliminará todos tus datos permanentemente/)).toBeInTheDocument()
    expect(screen.getByText('Sí, eliminar cuenta')).toBeInTheDocument()
  })

  it('cambia al panel de Contraseña y redirige al hacer clic en Restablecer', () => {
    renderSettings()
    fireEvent.click(screen.getByText('Contraseña'))
    fireEvent.click(screen.getByText('Restablecer contraseña'))
    expect(mockNavigate).toHaveBeenCalledWith('/cambiar-contrasena')
  })
})
