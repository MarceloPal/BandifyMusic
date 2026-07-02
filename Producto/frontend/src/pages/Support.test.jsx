import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import Support from './Support'

function renderSupport() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Support />
      </AuthProvider>
    </MemoryRouter>
  )
}

function fillForm({ email = 'ana@test.cl', asunto = 'Problema con mi cuenta', mensaje = 'No puedo subir mi demo.' } = {}) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Asunto'), { target: { value: asunto } })
  fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: mensaje } })
}

describe('Support — formulario de contacto', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('envía el formulario exitosamente', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })

    renderSupport()
    fillForm()
    fireEvent.click(screen.getByText('Enviar Mensaje'))

    expect(await screen.findByText('¡Solicitud Exitosa!')).toBeInTheDocument()

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/soporte'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'ana@test.cl',
          asunto: 'Problema con mi cuenta',
          mensaje: 'No puedo subir mi demo.',
        }),
      })
    )
  })

  it('no envía el formulario si falta el asunto', async () => {
    global.fetch = vi.fn()

    const { container } = renderSupport()
    fillForm({ asunto: '' })
    // El input tiene `required`: un click en el botón dispara la validación
    // nativa del navegador (jsdom la respeta) y nunca llega a disparar el
    // evento submit. Se dispara el submit directo para probar la validación
    // propia de handleSubmit, no la nativa del HTML.
    fireEvent.submit(container.querySelector('form'))

    expect(await screen.findByText('El asunto es obligatorio')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('muestra el error del backend si el envío falla', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'No se pudo procesar tu solicitud en este momento.' }),
    })

    renderSupport()
    fillForm()
    fireEvent.click(screen.getByText('Enviar Mensaje'))

    expect(await screen.findByText('No se pudo procesar tu solicitud en este momento.')).toBeInTheDocument()
    expect(screen.queryByText('¡Solicitud Exitosa!')).not.toBeInTheDocument()
  })
})
